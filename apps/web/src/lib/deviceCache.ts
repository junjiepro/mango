/**
 * Device Selection Cache
 * 管理设备选择的本地缓存（按用户隔离）
 */

const DEVICE_CACHE_PREFIX = 'mango:default_device_id';
const LEGACY_CACHE_KEY = 'mango:default_device_id';

function getCacheKey(userId?: string): string {
  return userId ? `${DEVICE_CACHE_PREFIX}:${userId}` : LEGACY_CACHE_KEY;
}

export class DeviceCache {
  /**
   * 获取默认设备ID
   * @param userId - 当前用户ID，用于隔离不同用户的缓存
   */
  static getDefaultDeviceId(userId?: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = getCacheKey(userId);
      const value = localStorage.getItem(key);

      // 迁移：如果用户维度的 key 没值，尝试从旧 key 读取并迁移
      if (!value && userId) {
        const legacyValue = localStorage.getItem(LEGACY_CACHE_KEY);
        if (legacyValue) {
          localStorage.setItem(key, legacyValue);
          localStorage.removeItem(LEGACY_CACHE_KEY);
          return legacyValue;
        }
      }

      return value;
    } catch (error) {
      console.error('Failed to get default device from cache:', error);
      return null;
    }
  }

  /**
   * 设置默认设备ID
   * @param deviceId - 设备ID,传入空字符串表示"无设备"
   * @param userId - 当前用户ID
   */
  static setDefaultDeviceId(deviceId: string, userId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = getCacheKey(userId);
      if (deviceId) {
        localStorage.setItem(key, deviceId);
      } else {
        localStorage.removeItem(key);
      }
      // 清理旧 key 防止残留
      if (userId) {
        localStorage.removeItem(LEGACY_CACHE_KEY);
      }
    } catch (error) {
      console.error('Failed to set default device to cache:', error);
    }
  }

  /**
   * 清除默认设备缓存
   */
  static clearDefaultDeviceId(userId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(getCacheKey(userId));
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear default device from cache:', error);
    }
  }
}
