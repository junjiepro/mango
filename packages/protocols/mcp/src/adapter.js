/**
 * MCP Protocol Adapter
 * Wrapper around @modelcontextprotocol/sdk Client
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
/**
 * MCP Adapter - 封装官方 SDK Client
 * 提供统一的 MCP 协议交互接口
 */
export class MCPAdapter {
    client;
    currentTransport;
    _isConnected = false;
    config;
    constructor(config) {
        this.config = config;
        this.client = new Client({
            name: config.clientInfo.name,
            version: config.clientInfo.version,
        }, {
            capabilities: config.capabilities || {},
        });
    }
    /**
     * 连接到 MCP 服务器
     */
    async connect(transport) {
        this.currentTransport = transport;
        await this.client.connect(transport);
        this._isConnected = true;
    }
    /**
     * 断开连接
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this._isConnected = false;
        }
    }
    /**
     * 检查是否已连接
     */
    isConnected() {
        return this._isConnected;
    }
    /**
     * 列出所有可用工具
     */
    async listTools(cursor) {
        this.ensureConnected();
        return await this.client.listTools({ cursor });
    }
    /**
     * 调用工具
     */
    async callTool(name, args) {
        this.ensureConnected();
        return await this.client.callTool({
            name,
            arguments: args,
        });
    }
    /**
     * 列出所有可用资源
     */
    async listResources(cursor) {
        this.ensureConnected();
        return await this.client.listResources({ cursor });
    }
    /**
     * 读取资源
     */
    async readResource(uri) {
        this.ensureConnected();
        return await this.client.readResource({ uri });
    }
    /**
     * 列出所有可用提示词
     */
    async listPrompts(cursor) {
        this.ensureConnected();
        return await this.client.listPrompts({ cursor });
    }
    /**
     * 获取提示词
     */
    async getPrompt(name, args) {
        this.ensureConnected();
        return await this.client.getPrompt({
            name,
            arguments: args,
        });
    }
    /**
     * 获取服务器信息
     */
    getServerInfo() {
        return this.client.getServerVersion();
    }
    /**
     * 获取服务器能力
     */
    getServerCapabilities() {
        return this.client.getServerCapabilities();
    }
    /**
     * 确保已连接
     */
    ensureConnected() {
        if (!this._isConnected) {
            throw new Error('Not connected to MCP server');
        }
    }
    /**
     * 获取底层 Client 实例（用于高级用法）
     */
    getClient() {
        return this.client;
    }
}
//# sourceMappingURL=adapter.js.map