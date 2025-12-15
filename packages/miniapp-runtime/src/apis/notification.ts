/**
 * MiniApp Notification API Implementation
 * T082: Implement notification system for MiniApps
 */

import {
  NotificationAPI,
  NotificationOptions,
  ScheduledNotificationOptions,
  Permission,
  PermissionStatus,
} from './types';
import { PermissionManager } from '../core/permissions';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  appId: string;
  userId: string;
  permissionManager: PermissionManager;
  serviceWorkerPath?: string;
}

/**
 * Scheduled notification record
 */
interface ScheduledNotification {
  id: string;
  options: ScheduledNotificationOptions;
  timeout: NodeJS.Timeout;
}

/**
 * MiniApp Notification Implementation
 */
export class MiniAppNotification implements NotificationAPI {
  private config: NotificationConfig;
  private scheduledNotifications: Map<string, ScheduledNotification>;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.scheduledNotifications = new Map();
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<PermissionStatus> {
    // Check MiniApp permission
    const miniAppPermission = await this.config.permissionManager.request(
      Permission.SYSTEM_NOTIFICATION
    );

    if (miniAppPermission !== PermissionStatus.GRANTED) {
      return miniAppPermission;
    }

    // Request browser notification permission
    if (!('Notification' in window)) {
      return PermissionStatus.DENIED;
    }

    const browserPermission = await Notification.requestPermission();

    switch (browserPermission) {
      case 'granted':
        return PermissionStatus.GRANTED;
      case 'denied':
        return PermissionStatus.DENIED;
      default:
        return PermissionStatus.PROMPT;
    }
  }

  /**
   * Show notification
   */
  async show(options: NotificationOptions): Promise<void> {
    // Check permission
    if (!this.config.permissionManager.isGranted(Permission.SYSTEM_NOTIFICATION)) {
      throw new Error('Notification permission not granted');
    }

    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Browser notification permission not granted');
    }

    // Register service worker if needed
    if (!this.serviceWorkerRegistration && this.config.serviceWorkerPath) {
      await this.registerServiceWorker();
    }

    // Show notification
    if (this.serviceWorkerRegistration) {
      // Use service worker for persistent notifications
      await this.serviceWorkerRegistration.showNotification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag || `miniapp-${this.config.appId}`,
        data: {
          appId: this.config.appId,
          userId: this.config.userId,
          ...options.data,
        },
        requireInteraction: options.requireInteraction,
      });
    } else {
      // Use basic notification
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        data: options.data,
        silent: options.silent,
        requireInteraction: options.requireInteraction,
        actions: options.actions,
      } as any);

      // Handle notification click
      if (options.onClick) {
        notification.addEventListener('click', options.onClick);
      } else {
        notification.addEventListener('click', () => {
          window.focus();
          notification.close();
        });
      }
    }
  }

  /**
   * Schedule notification
   */
  async schedule(options: ScheduledNotificationOptions): Promise<string> {
    // Check permission
    if (!this.config.permissionManager.isGranted(Permission.SYSTEM_NOTIFICATION)) {
      throw new Error('Notification permission not granted');
    }

    // Check maximum scheduled notifications limit
    const MAX_SCHEDULED_NOTIFICATIONS = 10;
    if (this.scheduledNotifications.size >= MAX_SCHEDULED_NOTIFICATIONS) {
      throw new Error('Maximum scheduled notifications limit reached');
    }

    const notificationId = this.generateNotificationId();

    // Calculate delay
    let delay: number;
    if (options.delay !== undefined) {
      delay = options.delay;
    } else if (options.scheduledTime) {
      const scheduledTime = typeof options.scheduledTime === 'number'
        ? options.scheduledTime
        : options.scheduledTime.getTime();
      delay = scheduledTime - Date.now();
    } else {
      throw new Error('Either delay or scheduledTime must be provided');
    }

    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Schedule notification
    const timeout = setTimeout(async () => {
      try {
        await this.show(options);

        // Handle repeat
        if (options.repeat) {
          this.scheduleRepeat(notificationId, options);
        } else {
          this.scheduledNotifications.delete(notificationId);
        }
      } catch (error) {
        console.error('Failed to show scheduled notification:', error);
        this.scheduledNotifications.delete(notificationId);
      }
    }, delay);

    // Store scheduled notification
    this.scheduledNotifications.set(notificationId, {
      id: notificationId,
      options,
      timeout,
    });

    return notificationId;
  }

  /**
   * Cancel scheduled notification
   */
  async cancel(notificationId: string): Promise<void> {
    const scheduled = this.scheduledNotifications.get(notificationId);

    if (!scheduled) {
      throw new Error('Notification not found');
    }

    clearTimeout(scheduled.timeout);
    this.scheduledNotifications.delete(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAll(): Promise<void> {
    for (const [id] of this.scheduledNotifications) {
      await this.cancel(id);
    }
  }

  /**
   * Get all scheduled notifications
   */
  getScheduled(): string[] {
    return Array.from(this.scheduledNotifications.keys());
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    if (!this.config.serviceWorkerPath) {
      throw new Error('Service Worker path not configured');
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath
      );
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw new Error('Failed to register Service Worker');
    }
  }

  /**
   * Schedule repeat notification
   */
  private scheduleRepeat(notificationId: string, options: ScheduledNotificationOptions): void {
    if (!options.repeat) return;

    // Check if notification was cancelled
    if (!this.scheduledNotifications.has(notificationId)) {
      return;
    }

    let delay: number;

    switch (options.repeat) {
      case 'daily':
        delay = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        delay = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        delay = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        return;
    }

    // Schedule next occurrence with the same notification ID
    const timeout = setTimeout(async () => {
      // Check again if notification was cancelled during the delay
      if (!this.scheduledNotifications.has(notificationId)) {
        return;
      }

      try {
        await this.show(options);

        // Continue repeating
        this.scheduleRepeat(notificationId, options);
      } catch (error) {
        console.error('Failed to show scheduled notification:', error);
        this.scheduledNotifications.delete(notificationId);
      }
    }, delay);

    // Update the scheduled notification with new timeout
    this.scheduledNotifications.set(notificationId, {
      id: notificationId,
      options,
      timeout,
    });
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `${this.config.appId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Cancel all scheduled notifications
    this.cancelAll().catch(error => {
      console.error('Failed to cancel notifications:', error);
    });
  }
}

/**
 * Create a notification instance
 */
export function createNotification(config: NotificationConfig): MiniAppNotification {
  return new MiniAppNotification(config);
}
