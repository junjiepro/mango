/**
 * Certificate Manager
 * 统一证书管理：按优先级尝试 Tailscale → mkcert
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import os from 'os';

/** 证书存储目录 */
const CERTS_DIR = join(os.homedir(), '.mango', 'certs');

/** 证书有效期阈值（60天，单位毫秒） */
const CERT_REFRESH_THRESHOLD_MS = 60 * 24 * 60 * 60 * 1000;

/** 证书来源类型 */
export type CertSource = 'tailscale' | 'mkcert';

/** 证书获取结果 */
export interface CertResult {
  cert: string;
  key: string;
  source: CertSource;
}

/**
 * 确保证书目录存在
 */
function ensureCertsDir(): void {
  if (!existsSync(CERTS_DIR)) {
    mkdirSync(CERTS_DIR, { recursive: true });
  }
}

/**
 * 检查证书文件是否存在且未过期
 */
function isCertValid(certPath: string): boolean {
  try {
    if (!existsSync(certPath)) return false;
    const stat = statSync(certPath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs < CERT_REFRESH_THRESHOLD_MS;
  } catch {
    return false;
  }
}

// ─── 策略 1: Tailscale ───

/**
 * 检查 tailscale cert 命令是否可用
 */
function isTailscaleAvailable(): boolean {
  try {
    execSync('tailscale cert --help', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 尝试通过 Tailscale 获取证书
 */
function tryTailscaleCert(domain: string): CertResult | null {
  try {
    ensureCertsDir();
    const certPath = join(CERTS_DIR, `${domain}.crt`);
    const keyPath = join(CERTS_DIR, `${domain}.key`);

    // 缓存命中
    if (isCertValid(certPath) && existsSync(keyPath)) {
      return {
        cert: readFileSync(certPath, 'utf-8'),
        key: readFileSync(keyPath, 'utf-8'),
        source: 'tailscale',
      };
    }

    execSync(
      `tailscale cert --cert-file "${certPath}" --key-file "${keyPath}" "${domain}"`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    if (existsSync(certPath) && existsSync(keyPath)) {
      return {
        cert: readFileSync(certPath, 'utf-8'),
        key: readFileSync(keyPath, 'utf-8'),
        source: 'tailscale',
      };
    }
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('does not support')) {
      console.warn('[CertManager] Tailscale HTTPS not enabled for this account, trying next strategy...');
    }
    return null;
  }
}

// ─── 策略 2: mkcert ───

/**
 * 检查 mkcert 是否已安装
 */
function isMkcertAvailable(): boolean {
  try {
    execSync('mkcert --version', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 尝试通过 mkcert 生成证书
 */
function tryMkcert(domains: string[]): CertResult | null {
  try {
    ensureCertsDir();
    const certPath = join(CERTS_DIR, 'mkcert.crt');
    const keyPath = join(CERTS_DIR, 'mkcert.key');

    // 缓存命中
    if (isCertValid(certPath) && existsSync(keyPath)) {
      return {
        cert: readFileSync(certPath, 'utf-8'),
        key: readFileSync(keyPath, 'utf-8'),
        source: 'mkcert',
      };
    }

    const domainArgs = domains.map((d) => `"${d}"`).join(' ');
    execSync(
      `mkcert -cert-file "${certPath}" -key-file "${keyPath}" ${domainArgs}`,
      { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    if (existsSync(certPath) && existsSync(keyPath)) {
      return {
        cert: readFileSync(certPath, 'utf-8'),
        key: readFileSync(keyPath, 'utf-8'),
        source: 'mkcert',
      };
    }
    return null;
  } catch {
    console.warn('[CertManager] mkcert failed, trying next strategy...');
    return null;
  }
}

// ─── 主入口 ───

/**
 * 统一证书获取接口
 * 按优先级尝试：Tailscale → mkcert
 * 均不可用时返回 null，由调用方回退到 HTTP only
 *
 * @param domains 需要覆盖的域名/IP 列表
 * @param tailscaleDomain Tailscale MagicDNS 域名（仅用于 Tailscale 策略）
 */
export async function obtainCertificate(
  domains: string[],
  tailscaleDomain?: string
): Promise<CertResult | null> {
  // 策略 1: Tailscale（仅当有域名且命令可用时尝试）
  if (tailscaleDomain && isTailscaleAvailable()) {
    const result = tryTailscaleCert(tailscaleDomain);
    if (result) return result;
  }

  // 策略 2: mkcert
  if (isMkcertAvailable()) {
    const result = tryMkcert(domains);
    if (result) return result;
  }

  // 无可信证书可用，回退到 HTTP only
  return null;
}
