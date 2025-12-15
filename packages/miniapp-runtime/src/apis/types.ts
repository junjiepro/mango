/**
 * MiniApp API Interface Definitions
 * T078: Define all API interfaces that MiniApps can use
 */

/**
 * Permission types that MiniApps can request
 */
export enum Permission {
  // Data permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',

  // API permissions
  API_ANALYTICS = 'api:analytics',
  API_STORAGE = 'api:storage',

  // System permissions
  SYSTEM_NOTIFICATION = 'system:notification',
  SYSTEM_NAVIGATION = 'system:navigation',

  // Network permissions
  NETWORK_EXTERNAL = 'network:external',

  // Storage permissions
  STORAGE_LOCAL = 'storage:local',
  STORAGE_PERSISTENT = 'storage:persistent',
}

/**
 * Permission status
 */
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
}

/**
 * MiniApp API context provided to each MiniApp
 */
export interface MiniAppAPI {
  // Core info
  readonly appId: string;
  readonly version: string;

  // Storage API
  storage: StorageAPI;

  // Notification API
  notification: NotificationAPI;

  // User API
  user: UserAPI;

  // Navigation API
  navigation: NavigationAPI;

  // Analytics API
  analytics: AnalyticsAPI;

  // Permission API
  permissions: PermissionAPI;
}

/**
 * Storage backend types
 */
export enum StorageBackend {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  INDEXED_DB = 'indexedDB',
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  used: number;
  total: number;
  available: number;
}

/**
 * Storage API interface
 */
export interface StorageAPI {
  /**
   * Get item from storage
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Set item in storage
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Remove item from storage
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all storage
   */
  clear(): Promise<void>;

  /**
   * Get all keys
   */
  keys(): Promise<string[]>;

  /**
   * Get storage quota information
   */
  getQuota(): Promise<StorageQuota>;
}

/**
 * Notification API interface
 */
export interface NotificationAPI {
  /**
   * Request notification permission
   */
  requestPermission(): Promise<PermissionStatus>;

  /**
   * Show notification
   */
  show(options: NotificationOptions): Promise<void>;

  /**
   * Schedule notification
   */
  schedule(options: ScheduledNotificationOptions): Promise<string>;

  /**
   * Cancel scheduled notification
   */
  cancel(notificationId: string): Promise<void>;
}

/**
 * Repeat interval for scheduled notifications
 */
export enum RepeatInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: Array<{ action: string; title: string }>;
  onClick?: () => void;
}

export interface ScheduledNotificationOptions extends NotificationOptions {
  scheduledTime?: Date;
  delay?: number;
  repeat?: RepeatInterval;
}

/**
 * User API interface
 */
export interface UserAPI {
  /**
   * Get current user info
   */
  getCurrentUser(): Promise<UserInfo | null>;

  /**
   * Get user preferences
   */
  getPreferences(): Promise<Record<string, any>>;

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Record<string, any>): Promise<void>;
}

export interface UserInfo {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email?: string;
}

/**
 * Navigation API interface
 */
export interface NavigationAPI {
  /**
   * Navigate to a conversation
   */
  toConversation(conversationId: string): Promise<void>;

  /**
   * Navigate to MiniApp gallery
   */
  toGallery(): Promise<void>;

  /**
   * Open external URL (requires permission)
   */
  openExternal(url: string): Promise<void>;

  /**
   * Go back
   */
  back(): Promise<void>;
}

/**
 * Analytics API interface
 */
export interface AnalyticsAPI {
  /**
   * Track event
   */
  trackEvent(eventName: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Track page view
   */
  trackPageView(pageName: string): Promise<void>;

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): Promise<void>;
}

/**
 * Permission API interface
 */
export interface PermissionAPI {
  /**
   * Request permission
   */
  request(permission: Permission): Promise<PermissionStatus>;

  /**
   * Check permission status
   */
  check(permission: Permission): Promise<PermissionStatus>;

  /**
   * Request multiple permissions
   */
  requestMultiple(permissions: Permission[]): Promise<Record<Permission, PermissionStatus>>;
}

/**
 * Message types for communication between host and MiniApp
 */
export enum MessageType {
  // Request types
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
  EVENT = 'EVENT',
  ERROR = 'ERROR',
}

/**
 * Message structure for secure communication
 */
export interface SecureMessage<T = any> {
  id: string;
  type: MessageType;
  action: string;
  version: string;
  nonce: string;
  timestamp: number;
  payload: T;
  signature?: string;
}

/**
 * Message response structure
 */
export interface MessageResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * MiniApp manifest structure
 */
export interface MiniAppManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  permissions: Permission[];
  entryPoint: string;
  sandbox?: {
    allowScripts?: boolean;
    allowForms?: boolean;
    allowPopups?: boolean;
    allowModals?: boolean;
  };
}

/**
 * MiniApp lifecycle hooks
 */
export interface MiniAppLifecycle {
  onLoad?(): void | Promise<void>;
  onShow?(): void | Promise<void>;
  onHide?(): void | Promise<void>;
  onUnload?(): void | Promise<void>;
  onError?(error: Error): void | Promise<void>;
}

/**
 * MiniApp configuration
 */
export interface MiniAppConfig {
  manifest: MiniAppManifest;
  lifecycle?: MiniAppLifecycle;
  api?: Partial<MiniAppAPI>;
}

/**
 * Sandbox state
 */
export enum SandboxState {
  IDLE = 'idle',
  LOADING = 'loading',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}
