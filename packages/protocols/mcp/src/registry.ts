/**
 * MCP Tool Registry
 * Manages available MCP tools and their metadata
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolRegistryEntry {
  tool: Tool;
  serverUrl?: string;
  enabled: boolean;
  metadata?: {
    category?: string;
    tags?: string[];
    lastUsed?: Date;
    usageCount?: number;
  };
}

/**
 * Tool Registry for managing MCP tools
 */
export class ToolRegistry {
  private tools = new Map<string, ToolRegistryEntry>();

  /**
   * Register a tool
   */
  register(tool: Tool, options?: Partial<Omit<ToolRegistryEntry, 'tool'>>): void {
    const entry: ToolRegistryEntry = {
      tool,
      enabled: options?.enabled ?? true,
      serverUrl: options?.serverUrl,
      metadata: options?.metadata,
    };

    this.tools.set(tool.name, entry);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolRegistryEntry | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all tools
   */
  list(filter?: {
    enabled?: boolean;
    category?: string;
    tags?: string[];
  }): ToolRegistryEntry[] {
    let entries = Array.from(this.tools.values());

    if (filter) {
      if (filter.enabled !== undefined) {
        entries = entries.filter((e) => e.enabled === filter.enabled);
      }

      if (filter.category) {
        entries = entries.filter((e) => e.metadata?.category === filter.category);
      }

      if (filter.tags && filter.tags.length > 0) {
        entries = entries.filter((e) => {
          const toolTags = e.metadata?.tags || [];
          return filter.tags!.some((tag) => toolTags.includes(tag));
        });
      }
    }

    return entries;
  }

  /**
   * Enable a tool
   */
  enable(name: string): boolean {
    const entry = this.tools.get(name);
    if (entry) {
      entry.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable a tool
   */
  disable(name: string): boolean {
    const entry = this.tools.get(name);
    if (entry) {
      entry.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * Update tool metadata
   */
  updateMetadata(
    name: string,
    metadata: Partial<ToolRegistryEntry['metadata']>
  ): boolean {
    const entry = this.tools.get(name);
    if (entry) {
      entry.metadata = {
        ...entry.metadata,
        ...metadata,
      };
      return true;
    }
    return false;
  }

  /**
   * Record tool usage
   */
  recordUsage(name: string): void {
    const entry = this.tools.get(name);
    if (entry) {
      entry.metadata = {
        ...entry.metadata,
        lastUsed: new Date(),
        usageCount: (entry.metadata?.usageCount || 0) + 1,
      };
    }
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Search tools by name or description
   */
  search(query: string): ToolRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tools.values()).filter((entry) => {
      const tool = entry.tool;
      return (
        tool.name.toLowerCase().includes(lowerQuery) ||
        (tool.description?.toLowerCase().includes(lowerQuery) ?? false)
      );
    });
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): ToolRegistryEntry[] {
    return this.list({ category });
  }

  /**
   * Get enabled tools
   */
  getEnabled(): ToolRegistryEntry[] {
    return this.list({ enabled: true });
  }

  /**
   * Export tools as JSON
   */
  toJSON(): Record<string, ToolRegistryEntry> {
    const result: Record<string, ToolRegistryEntry> = {};
    for (const [name, entry] of this.tools.entries()) {
      result[name] = entry;
    }
    return result;
  }

  /**
   * Import tools from JSON
   */
  fromJSON(data: Record<string, ToolRegistryEntry>): void {
    this.clear();
    for (const [name, entry] of Object.entries(data)) {
      this.tools.set(name, entry);
    }
  }
}

/**
 * Global tool registry instance
 */
export const globalToolRegistry = new ToolRegistry();
