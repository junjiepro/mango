import type { DeviceUrls } from '@/hooks/useDeviceBinding';

const DEVICE_URL_PRIORITY: Array<keyof DeviceUrls> = [
  'cloudflare_url',
  'tailscale_url',
  'hostname_url',
  'localhost_url',
];

function getPageProtocol(pageProtocol?: string): string | null {
  if (pageProtocol) {
    return pageProtocol;
  }

  if (typeof window !== 'undefined') {
    return window.location.protocol;
  }

  return null;
}

function matchesPageSecurity(url: string, pageProtocol?: string): boolean {
  const requiredProtocol = getPageProtocol(pageProtocol);
  if (requiredProtocol !== 'https:') {
    return true;
  }

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getBrowserSafeDeviceUrls(
  deviceUrls: DeviceUrls,
  pageProtocol?: string
): string[] {
  return DEVICE_URL_PRIORITY.map((key) => deviceUrls[key])
    .filter((url): url is string => Boolean(url))
    .filter((url) => matchesPageSecurity(url, pageProtocol));
}

export function getPreferredBrowserSafeDeviceUrl(
  deviceUrls: DeviceUrls,
  pageProtocol?: string
): string | null {
  return getBrowserSafeDeviceUrls(deviceUrls, pageProtocol)[0] ?? null;
}
