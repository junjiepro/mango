/**
 * Device Selection Cache
 * 管理设备选择的本地缓存
 */

const DEVICE_CACHE_KEY = 'mango:default_device_id';

export class DeviceCache {
  /**
   * 获取默认设备ID
   */
  static getDefaultDeviceId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(DEVICE_CACHE_KEY);
    } catch (error) {
      console.error('Failed to get default device from cache:', error);
      return null;
    }
  }

  /**
   * 设置默认设备ID
   * @param deviceId - 设备ID,传入空字符串表示"无设备"
   */
  static setDefaultDeviceId(deviceId: string): void {
    if (typeof window === 'undefined') return;

    try {
      if (deviceId) {
        localStorage.setItem(DEVICE_CACHE_KEY, deviceId);
      } else {
        // 空字符串表示用户选择了"无设备"
        localStorage.removeItem(DEVICE_CACHE_KEY);
      }
    } catch (error) {
      console.error('Failed to set default device to cache:', error);
    }
  }

  /**
   * 清除默认设备缓存
   */
  static clearDefaultDeviceId(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(DEVICE_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear default device from cache:', error);
    }
  }
}
