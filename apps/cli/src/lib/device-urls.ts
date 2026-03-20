export interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string | null;
  hostname_url: string | null;
  tailscale_url?: string | null;
}

interface BuildDeviceUrlsOptions {
  appUrl: string;
  tunnelUrl: string | null;
  httpPort: number;
  httpsPort?: number;
  localIp: string;
  tailscaleAddr?: string | null;
}

function isHttpsUrl(url: string | null): boolean {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function requiresSecureDeviceUrls(appUrl: string): boolean {
  try {
    return new URL(appUrl).protocol === 'https:';
  } catch {
    return appUrl.startsWith('https://');
  }
}

export function buildDeviceUrls({
  appUrl,
  tunnelUrl,
  httpPort,
  httpsPort,
  localIp,
  tailscaleAddr,
}: BuildDeviceUrlsOptions): DeviceUrls {
  const secureOnly = requiresSecureDeviceUrls(appUrl);
  const localhostUrl = secureOnly
    ? httpsPort
      ? `https://localhost:${httpsPort}`
      : null
    : `http://localhost:${httpPort}`;
  const hostnameUrl = secureOnly
    ? httpsPort
      ? `https://${localIp}:${httpsPort}`
      : null
    : `http://${localIp}:${httpPort}`;
  const tailscaleUrl = tailscaleAddr
    ? secureOnly
      ? httpsPort
        ? `https://${tailscaleAddr}:${httpsPort}`
        : null
      : httpsPort
        ? `https://${tailscaleAddr}:${httpsPort}`
        : `http://${tailscaleAddr}:${httpPort}`
    : null;

  return {
    cloudflare_url: secureOnly && !isHttpsUrl(tunnelUrl) ? null : tunnelUrl,
    localhost_url: localhostUrl,
    hostname_url: hostnameUrl,
    ...(tailscaleAddr ? { tailscale_url: tailscaleUrl } : {}),
  };
}

export function hasReachableDeviceUrl(deviceUrls: DeviceUrls): boolean {
  return Boolean(
    deviceUrls.cloudflare_url ||
      deviceUrls.localhost_url ||
      deviceUrls.hostname_url ||
      deviceUrls.tailscale_url
  );
}
