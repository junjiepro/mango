/**
 * Offline Queue
 * Manages offline message queue and sync
 */

import { createClient } from '@/lib/supabase/client';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  contentType: string;
  attachments?: any[];
  tempId: string; // Temporary ID for optimistic updates
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

const QUEUE_STORAGE_KEY = 'mango_offline_queue';
const MAX_RETRY_COUNT = 3;

/**
 * Offline Queue Manager
 */
export class OfflineQueue {
  private queue: QueuedMessage[] = [];
  private isSyncing = false;

  constructor() {
    this.loadQueue();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add message to queue
   */
  addMessage(message: Omit<QueuedMessage, 'tempId' | 'timestamp' | 'retryCount' | 'status'>): string {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const queuedMessage: QueuedMessage = {
      ...message,
      tempId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(queuedMessage);
    this.saveQueue();

    return tempId;
  }

  /**
   * Get all queued messages
   */
  getQueue(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Get queued messages for a conversation
   */
  getConversationQueue(conversationId: string): QueuedMessage[] {
    return this.queue.filter((msg) => msg.conversationId === conversationId);
  }

  /**
   * Remove message from queue
   */
  removeMessage(tempId: string): void {
    this.queue = this.queue.filter((msg) => msg.tempId !== tempId);
    this.saveQueue();
  }

  /**
   * Update message status
   */
  updateMessageStatus(tempId: string, status: QueuedMessage['status']): void {
    const message = this.queue.find((msg) => msg.tempId === tempId);
    if (message) {
      message.status = status;
      this.saveQueue();
    }
  }

  /**
   * Sync all pending messages
   */
  async syncAll(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    const pendingMessages = this.queue.filter(
      (msg) => msg.status === 'pending' || msg.status === 'failed'
    );

    for (const message of pendingMessages) {
      try {
        await this.syncMessage(message);
        successCount++;
      } catch (error) {
        console.error('Failed to sync message:', error);
        failedCount++;
      }
    }

    this.isSyncing = false;
    return { success: successCount, failed: failedCount };
  }

  /**
   * Sync a single message
   */
  private async syncMessage(message: QueuedMessage): Promise<void> {
    this.updateMessageStatus(message.tempId, 'syncing');

    try {
      const supabase = createClient();

      // Get next sequence number
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('sequence_number')
        .eq('conversation_id', message.conversationId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .single();

      const nextSeq = (lastMessage?.sequence_number || 0) + 1;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert message
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: message.conversationId,
          sender_type: 'user',
          sender_id: user.id,
          content: message.content,
          content_type: message.contentType,
          attachments: message.attachments || [],
          sequence_number: nextSeq,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', message.conversationId);

      // Remove from queue
      this.removeMessage(message.tempId);
    } catch (error) {
      message.retryCount++;

      if (message.retryCount >= MAX_RETRY_COUNT) {
        this.updateMessageStatus(message.tempId, 'failed');
      } else {
        this.updateMessageStatus(message.tempId, 'pending');
      }

      throw error;
    }
  }

  /**
   * Clear all synced messages
   */
  clearSynced(): void {
    this.queue = this.queue.filter((msg) => msg.status !== 'synced');
    this.saveQueue();
  }

  /**
   * Clear all messages
   */
  clearAll(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get pending count
   */
  pendingCount(): number {
    return this.queue.filter((msg) => msg.status === 'pending').length;
  }

  /**
   * Get failed count
   */
  failedCount(): number {
    return this.queue.filter((msg) => msg.status === 'failed').length;
  }
}

/**
 * Global offline queue instance
 */
let offlineQueueInstance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue();
  }
  return offlineQueueInstance;
}
