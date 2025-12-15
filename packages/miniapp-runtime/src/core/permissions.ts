/**
 * MiniApp Permission System
 * T079: Implement permission management and validation
 */

import { Permission, PermissionStatus } from '../apis/types';

/**
 * Permission metadata
 */
interface PermissionMetadata {
  name: string;
  description: string;
  category: 'data' | 'api' | 'system' | 'network' | 'storage';
  risk: 'low' | 'medium' | 'high';
  requiresUserConsent: boolean;
}

/**
 * Permission catalog with metadata
 */
export const PERMISSION_CATALOG: Record<Permission, PermissionMetadata> = {
  [Permission.USER_READ]: {
    name: '读取用户信息',
    description: '允许小应用读取您的基本用户信息（昵称、头像）',
    category: 'data',
    risk: 'low',
    requiresUserConsent: true,
  },
  [Permission.USER_WRITE]: {
    name: '修改用户信息',
    description: '允许小应用修改您的用户偏好设置',
    category: 'data',
    risk: 'medium',
    requiresUserConsent: true,
  },
  [Permission.API_ANALYTICS]: {
    name: '使用分析服务',
    description: '允许小应用收集使用数据用于分析',
    category: 'api',
    risk: 'low',
    requiresUserConsent: true,
  },
  [Permission.API_STORAGE]: {
    name: '使用存储服务',
    description: '允许小应用存储和读取数据',
    category: 'api',
    risk: 'low',
    requiresUserConsent: false,
  },
  [Permission.SYSTEM_NOTIFICATION]: {
    name: '发送通知',
    description: '允许小应用向您发送系统通知',
    category: 'system',
    risk: 'medium',
    requiresUserConsent: true,
  },
  [Permission.SYSTEM_NAVIGATION]: {
    name: '页面导航',
    description: '允许小应用导航到其他页面',
    category: 'system',
    risk: 'low',
    requiresUserConsent: false,
  },
  [Permission.NETWORK_EXTERNAL]: {
    name: '访问外部网络',
    description: '允许小应用请求外部 API 和资源',
    category: 'network',
    risk: 'high',
    requiresUserConsent: true,
  },
  [Permission.STORAGE_LOCAL]: {
    name: '本地存储',
    description: '允许小应用使用本地存储（会话级别）',
    category: 'storage',
    risk: 'low',
    requiresUserConsent: false,
  },
  [Permission.STORAGE_PERSISTENT]: {
    name: '持久化存储',
    description: '允许小应用使用持久化存储',
    category: 'storage',
    risk: 'low',
    requiresUserConsent: true,
  },
};

/**
 * Permission grant record
 */
export interface PermissionGrant {
  permission: Permission;
  status: PermissionStatus;
  grantedAt?: Date;
  expiresAt?: Date;
}

/**
 * Permission manager for a MiniApp instance
 */
export class PermissionManager {
  private appId: string;
  private userId: string;
  private grants: Map<Permission, PermissionGrant>;
  private requestedPermissions: Set<Permission>;

  constructor(appId: string, userId: string, initialGrants: PermissionGrant[] = []) {
    this.appId = appId;
    this.userId = userId;
    this.grants = new Map();
    this.requestedPermissions = new Set();

    // Load initial grants
    initialGrants.forEach(grant => {
      this.grants.set(grant.permission, grant);
    });
  }

  /**
   * Check if a permission is granted
   */
  isGranted(permission: Permission): boolean {
    const grant = this.grants.get(permission);
    if (!grant) return false;

    // Check if permission is expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      this.grants.delete(permission);
      return false;
    }

    return grant.status === PermissionStatus.GRANTED;
  }

  /**
   * Check permission status
   */
  getStatus(permission: Permission): PermissionStatus {
    const grant = this.grants.get(permission);
    if (!grant) {
      return PermissionStatus.PROMPT;
    }

    // Check if permission is expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      this.grants.delete(permission);
      return PermissionStatus.PROMPT;
    }

    return grant.status;
  }

  /**
   * Request a permission
   * Returns the status after user interaction
   */
  async request(permission: Permission): Promise<PermissionStatus> {
    // Check if already granted
    if (this.isGranted(permission)) {
      return PermissionStatus.GRANTED;
    }

    // Check if already denied
    const currentStatus = this.getStatus(permission);
    if (currentStatus === PermissionStatus.DENIED) {
      return PermissionStatus.DENIED;
    }

    // Mark as requested
    this.requestedPermissions.add(permission);

    // Get permission metadata
    const metadata = PERMISSION_CATALOG[permission];

    // If doesn't require user consent, auto-grant
    if (!metadata.requiresUserConsent) {
      return this.grant(permission);
    }

    // Otherwise, return PROMPT status
    // The actual user interaction will be handled by the host application
    return PermissionStatus.PROMPT;
  }

  /**
   * Request multiple permissions
   */
  async requestMultiple(permissions: Permission[]): Promise<Record<Permission, PermissionStatus>> {
    const results: Record<Permission, PermissionStatus> = {} as any;

    for (const permission of permissions) {
      results[permission] = await this.request(permission);
    }

    return results;
  }

  /**
   * Grant a permission
   */
  grant(permission: Permission, expiresIn?: number): PermissionStatus {
    const grant: PermissionGrant = {
      permission,
      status: PermissionStatus.GRANTED,
      grantedAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
    };

    this.grants.set(permission, grant);
    return PermissionStatus.GRANTED;
  }

  /**
   * Deny a permission
   */
  deny(permission: Permission): PermissionStatus {
    const grant: PermissionGrant = {
      permission,
      status: PermissionStatus.DENIED,
    };

    this.grants.set(permission, grant);
    return PermissionStatus.DENIED;
  }

  /**
   * Revoke a permission
   */
  revoke(permission: Permission): void {
    this.grants.delete(permission);
  }

  /**
   * Revoke all permissions
   */
  revokeAll(): void {
    this.grants.clear();
  }

  /**
   * Get all granted permissions
   */
  getGrantedPermissions(): Permission[] {
    return Array.from(this.grants.entries())
      .filter(([_, grant]) => grant.status === PermissionStatus.GRANTED)
      .map(([permission]) => permission);
  }

  /**
   * Get all requested permissions (for UI display)
   */
  getRequestedPermissions(): Permission[] {
    return Array.from(this.requestedPermissions);
  }

  /**
   * Validate if MiniApp has required permissions for an action
   */
  validate(requiredPermissions: Permission[]): {
    valid: boolean;
    missing: Permission[];
  } {
    const missing = requiredPermissions.filter(p => !this.isGranted(p));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Export grants for persistence
   */
  exportGrants(): PermissionGrant[] {
    return Array.from(this.grants.values());
  }

  /**
   * Get permission metadata
   */
  static getMetadata(permission: Permission): PermissionMetadata {
    return PERMISSION_CATALOG[permission];
  }

  /**
   * Get all permissions by category
   */
  static getByCategory(category: PermissionMetadata['category']): Permission[] {
    return Object.entries(PERMISSION_CATALOG)
      .filter(([_, meta]) => meta.category === category)
      .map(([perm]) => perm as Permission);
  }

  /**
   * Get all high-risk permissions
   */
  static getHighRiskPermissions(): Permission[] {
    return Object.entries(PERMISSION_CATALOG)
      .filter(([_, meta]) => meta.risk === 'high')
      .map(([perm]) => perm as Permission);
  }
}

/**
 * Permission validator utility
 */
export class PermissionValidator {
  /**
   * Validate permission request against security policies
   */
  static validateRequest(
    permission: Permission,
    context: {
      appId: string;
      userId: string;
      userAgent?: string;
      origin?: string;
    }
  ): {
    valid: boolean;
    reason?: string;
  } {
    const metadata = PERMISSION_CATALOG[permission];

    // Check if permission exists
    if (!metadata) {
      return {
        valid: false,
        reason: 'Unknown permission',
      };
    }

    // Additional validation rules can be added here
    // For example: rate limiting, blacklist checking, etc.

    return { valid: true };
  }

  /**
   * Check if permissions are compatible
   */
  static areCompatible(permissions: Permission[]): boolean {
    // Add logic to check for conflicting permissions
    // For now, all permissions are compatible
    return true;
  }
}
