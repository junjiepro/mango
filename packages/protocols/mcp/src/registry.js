/**
 * MCP Tool Registry
 * Manages available MCP tools and their metadata
 */
/**
 * Tool Registry for managing MCP tools
 */
export class ToolRegistry {
    tools = new Map();
    /**
     * Register a tool
     */
    register(tool, options) {
        const entry = {
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
    unregister(name) {
        return this.tools.delete(name);
    }
    /**
     * Get a tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Check if a tool exists
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * List all tools
     */
    list(filter) {
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
                    return filter.tags.some((tag) => toolTags.includes(tag));
                });
            }
        }
        return entries;
    }
    /**
     * Enable a tool
     */
    enable(name) {
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
    disable(name) {
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
    updateMetadata(name, metadata) {
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
    recordUsage(name) {
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
    clear() {
        this.tools.clear();
    }
    /**
     * Get tool count
     */
    size() {
        return this.tools.size;
    }
    /**
     * Search tools by name or description
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.tools.values()).filter((entry) => {
            const tool = entry.tool;
            return (tool.name.toLowerCase().includes(lowerQuery) ||
                (tool.description?.toLowerCase().includes(lowerQuery) ?? false));
        });
    }
    /**
     * Get tools by category
     */
    getByCategory(category) {
        return this.list({ category });
    }
    /**
     * Get enabled tools
     */
    getEnabled() {
        return this.list({ enabled: true });
    }
    /**
     * Export tools as JSON
     */
    toJSON() {
        const result = {};
        for (const [name, entry] of this.tools.entries()) {
            result[name] = entry;
        }
        return result;
    }
    /**
     * Import tools from JSON
     */
    fromJSON(data) {
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
//# sourceMappingURL=registry.js.map