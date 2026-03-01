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
export declare class ToolRegistry {
    private tools;
    /**
     * Register a tool
     */
    register(tool: Tool, options?: Partial<Omit<ToolRegistryEntry, 'tool'>>): void;
    /**
     * Unregister a tool
     */
    unregister(name: string): boolean;
    /**
     * Get a tool by name
     */
    get(name: string): ToolRegistryEntry | undefined;
    /**
     * Check if a tool exists
     */
    has(name: string): boolean;
    /**
     * List all tools
     */
    list(filter?: {
        enabled?: boolean;
        category?: string;
        tags?: string[];
    }): ToolRegistryEntry[];
    /**
     * Enable a tool
     */
    enable(name: string): boolean;
    /**
     * Disable a tool
     */
    disable(name: string): boolean;
    /**
     * Update tool metadata
     */
    updateMetadata(name: string, metadata: Partial<ToolRegistryEntry['metadata']>): boolean;
    /**
     * Record tool usage
     */
    recordUsage(name: string): void;
    /**
     * Clear all tools
     */
    clear(): void;
    /**
     * Get tool count
     */
    size(): number;
    /**
     * Search tools by name or description
     */
    search(query: string): ToolRegistryEntry[];
    /**
     * Get tools by category
     */
    getByCategory(category: string): ToolRegistryEntry[];
    /**
     * Get enabled tools
     */
    getEnabled(): ToolRegistryEntry[];
    /**
     * Export tools as JSON
     */
    toJSON(): Record<string, ToolRegistryEntry>;
    /**
     * Import tools from JSON
     */
    fromJSON(data: Record<string, ToolRegistryEntry>): void;
}
/**
 * Global tool registry instance
 */
export declare const globalToolRegistry: ToolRegistry;
//# sourceMappingURL=registry.d.ts.map