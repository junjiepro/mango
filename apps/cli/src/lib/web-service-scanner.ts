/**
 * Web Service Scanner
 * 自动扫描设备本地 Web 服务端口
 */

import net from 'net';
import http from 'http';
import https from 'https';

// Matches the shared DiscoveredWebService type from @mango/shared
export interface DiscoveredWebService {
  id: string;
  port: number;
  protocol: 'http' | 'https';
  host: string;
  status: 'online' | 'offline';
  title?: string;
  serverHeader?: string;
  responseTimeMs?: number;
  lastCheckedAt: string;
  lastSeenAt?: string;
}

export interface ScannerConfig {
  ports: number[];
  intervalMs: number;
  excludePorts: number[];
}

const DEFAULT_PORTS = [80, 443, 3000, 4173, 5173, 8000, 8080, 8888];
const DEFAULT_INTERVAL_MS = 15_000;
const CONNECT_TIMEOUT_MS = 500;
const HTTP_TIMEOUT_MS = 3000;

class WebServiceScanner {
  private services = new Map<string, DiscoveredWebService>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: ScannerConfig = {
    ports: DEFAULT_PORTS,
    intervalMs: DEFAULT_INTERVAL_MS,
    excludePorts: [],
  };
  private lastScanAt: string | null = null;
  private scanPromise: Promise<void> | null = null;

  start(config?: Partial<ScannerConfig>): void {
    this.stop();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    void this.scan();
    this.timer = setInterval(() => void this.scan(), this.config.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getServices(): DiscoveredWebService[] {
    return Array.from(this.services.values());
  }

  getServiceById(id: string): DiscoveredWebService | undefined {
    return this.services.get(id);
  }

  getLastScanAt(): string | null {
    return this.lastScanAt;
  }

  getScanConfig(): ScannerConfig {
    return { ...this.config };
  }

  async refresh(): Promise<DiscoveredWebService[]> {
    await this.scan();
    return this.getServices();
  }

  async probePort(port: number): Promise<DiscoveredWebService | null> {
    if (port < 1 || port > 65535) return null;
    if (this.config.excludePorts.includes(port)) return null;

    const service = await this.probeOne(port);
    if (service) {
      this.services.set(service.id, service);
    }
    return service;
  }

  private async scan(): Promise<void> {
    if (this.scanPromise) return this.scanPromise;
    this.scanPromise = this.doScan();
    try {
      await this.scanPromise;
    } finally {
      this.scanPromise = null;
    }
  }

  private async doScan(): Promise<void> {
    const portsToScan = this.config.ports.filter(
      (p) => !this.config.excludePorts.includes(p)
    );

    const results = await Promise.allSettled(
      portsToScan.map((port) => this.probeOne(port))
    );

    const now = new Date().toISOString();
    this.lastScanAt = now;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        this.services.set(result.value.id, result.value);
      }
    }

    // Mark services whose ports were scanned but not found as offline
    for (const [id, service] of this.services) {
      if (
        portsToScan.includes(service.port) &&
        !results.some(
          (r) => r.status === 'fulfilled' && r.value?.id === id
        )
      ) {
        this.services.set(id, { ...service, status: 'offline', lastCheckedAt: now });
      }
    }
  }

  private async probeOne(port: number): Promise<DiscoveredWebService | null> {
    const isOpen = await this.checkPortOpen(port);
    if (!isOpen) return null;

    const protocol = port === 443 ? 'https' : 'http';
    const info = await this.fetchServiceInfo(port, protocol);

    // If HTTP failed on a non-443 port, try HTTPS as fallback
    if (!info && protocol === 'http') {
      const httpsInfo = await this.fetchServiceInfo(port, 'https');
      if (httpsInfo) return httpsInfo;
    }

    // TCP-only ports (no HTTP response) are not reported as web services
    return info;
  }

  private checkPortOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(CONNECT_TIMEOUT_MS);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  private fetchServiceInfo(
    port: number,
    protocol: 'http' | 'https'
  ): Promise<DiscoveredWebService | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = `${protocol}://127.0.0.1:${port}/`;

      const client = protocol === 'https' ? https : http;
      const req = client.get(
        url,
        {
          timeout: HTTP_TIMEOUT_MS,
          rejectUnauthorized: false,
          headers: { 'User-Agent': 'Mango-Scanner/1.0' },
        },
        (res) => {
          const responseTimeMs = Date.now() - startTime;
          const serverHeader = res.headers['server'] as string | undefined;

          let body = '';
          let bytesRead = 0;
          const MAX_BYTES = 65536;
          let titleFound = false;

          res.on('data', (chunk: Buffer) => {
            bytesRead += chunk.length;
            if (bytesRead <= MAX_BYTES) {
              body += chunk.toString();
            }
            // Early termination once we have the title
            if (!titleFound && extractTitle(body)) {
              titleFound = true;
              res.destroy();
            }
          });

          const finish = () => {
            const title = extractTitle(body);
            const now = new Date().toISOString();
            resolve({
              id: `ws-${port}`,
              port,
              protocol,
              host: '127.0.0.1',
              status: 'online',
              title: title || undefined,
              serverHeader: serverHeader || undefined,
              responseTimeMs,
              lastCheckedAt: now,
              lastSeenAt: now,
            });
          };

          res.on('end', finish);
          res.on('close', finish);

          res.on('error', () => {
            resolve(null);
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => {
        resolve(null);
      });
    });
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .substring(0, 200);
}

export const webServiceScanner = new WebServiceScanner();
