/**
 * AI Agent 核心引擎
 * 中央协调引擎，负责会话管理、上下文处理和插件协调
 */

import type {
  AgentSession,
  AgentMessage,
  MultimodalContent,
  AgentEngineConfig,
  AgentEngineState,
  AgentResponse,
  ToolCall,
  AgentUserProfile,
  MCPConfiguration,
} from "@/types/ai-agent";
import type { PluginManager, AgentPlugin } from "@/types/plugins";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getUser, requireAuth } from "@/lib/supabase/auth-helpers";

/**
 * AI Agent 核心引擎类
 * 负责统一管理会话、上下文、插件和 AI 交互
 */
export class AgentEngine {
  private config: AgentEngineConfig;
  private state: AgentEngineState;
  private sessions: Map<string, AgentSession>;
  private pluginManager?: PluginManager;
  private supabase = createClient();

  constructor(config?: AgentEngineConfig) {
    this.config = {
      model: "gpt-5",
      temperature: 0.7,
      maxTokens: 4096,
      streamResponse: true,
      enableToolCalling: true,
      enableMultimodal: true,
      retryAttempts: 3,
      timeout: 30000,
      ...config,
    };

    this.state = {
      status: "idle",
      processingQueue: [],
      performance: {
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        errorCount: 0,
      },
      resources: {
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
      },
    };

    this.sessions = new Map();
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    try {
      this.state.status = "maintenance";

      // 验证用户认证
      await requireAuth();

      // 加载用户会话
      await this.loadUserSessions();

      // 初始化插件管理器（如果提供）
      if (this.pluginManager) {
        await this.initializePluginManager();
      }

      this.state.status = "idle";
    } catch (error) {
      this.state.status = "error";
      throw new Error(`Failed to initialize Agent Engine: ${error}`);
    }
  }

  /**
   * 设置插件管理器
   */
  setPluginManager(pluginManager: PluginManager): void {
    this.pluginManager = pluginManager;
  }

  /**
   * 创建新会话
   */
  async createSession(
    title?: string,
    mode: "simple" | "advanced" = "simple",
    userId?: string
  ): Promise<AgentSession> {
    const user = await getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    const session: AgentSession = {
      id: sessionId,
      userId: userId || user.id,
      title: title || `New Session ${new Date().toLocaleString()}`,
      status: "active",
      mode,
      createdAt: now,
      updatedAt: now,
      lastActivity: now,
      settings: {
        language: "zh",
        theme: "auto",
        autoSave: true,
        maxHistory: 100,
        enabledPlugins: [],
        mcpConfigs: [],
      },
      context: {
        conversationHistory: [],
        currentState: {},
        toolExecutionHistory: [],
        sharedVariables: {},
      },
      statistics: {
        messageCount: 0,
        toolExecutionCount: 0,
        totalExecutionTime: 0,
        errorCount: 0,
        successRate: 100,
      },
    };

    // 保存到内存和数据库
    this.sessions.set(sessionId, session);
    await this.persistSession(session);

    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userId?: string): Promise<AgentSession[]> {
    const user = await getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const targetUserId = userId || user.id;
    const userSessions: AgentSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === targetUserId) {
        userSessions.push(session);
      }
    }

    return userSessions.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * 更新会话
   */
  async updateSession(
    sessionId: string,
    updates: Partial<AgentSession>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    await this.persistSession(updatedSession);
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 从内存中移除
    this.sessions.delete(sessionId);

    // 从数据库中删除
    await this.deletePersistedSession(sessionId);
  }

  /**
   * 处理消息
   */
  async processMessage(
    sessionId: string,
    content: string,
    multimodalContent?: MultimodalContent[]
  ): Promise<AgentResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.state.status = "processing";
    this.state.activeSession = sessionId;
    this.state.processingQueue.push(sessionId);

    const startTime = Date.now();

    try {
      // 创建用户消息
      const userMessage: AgentMessage = {
        id: this.generateMessageId(),
        sessionId,
        type: "user",
        content: [
          {
            id: this.generateContentId(),
            type: "text",
            content,
            metadata: {
              timestamp: new Date().toISOString(),
              source: "user",
            },
          },
          ...(multimodalContent || []),
        ],
        metadata: {
          status: "completed",
          isStreaming: false,
        },
        createdAt: new Date().toISOString(),
      };

      // 添加到会话历史
      session.context.conversationHistory.push(userMessage);

      // 通过插件处理消息
      const processedContent = await this.processMessageThroughPlugins(
        userMessage,
        session
      );

      // 生成 AI 响应
      const aiResponse = await this.generateAIResponse(
        session,
        processedContent || userMessage.content
      );

      // 创建助手消息
      const assistantMessage: AgentMessage = {
        id: this.generateMessageId(),
        sessionId,
        type: "assistant",
        content: aiResponse.content,
        metadata: {
          ...aiResponse.metadata,
          status: "completed",
        },
        createdAt: new Date().toISOString(),
      };

      // 添加到会话历史
      session.context.conversationHistory.push(assistantMessage);

      // 执行工具调用（如果有）
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        await this.executeToolCalls(session, aiResponse.toolCalls);
      }

      // 更新会话统计
      const executionTime = Date.now() - startTime;
      session.statistics.messageCount += 1;
      session.statistics.totalExecutionTime += executionTime;

      if (aiResponse.toolCalls) {
        session.statistics.toolExecutionCount += aiResponse.toolCalls.length;
      }

      // 更新会话
      await this.updateSession(sessionId, session);

      // 更新引擎状态
      this.updateEnginePerformance(executionTime, true);

      return aiResponse;
    } catch (error) {
      // 更新错误统计
      session.statistics.errorCount += 1;
      this.updateEnginePerformance(Date.now() - startTime, false);

      throw new Error(`Failed to process message: ${error}`);
    } finally {
      // 清理处理状态
      this.state.processingQueue = this.state.processingQueue.filter(
        (id) => id !== sessionId
      );
      if (this.state.activeSession === sessionId) {
        this.state.activeSession = undefined;
      }
      this.state.status = "idle";
    }
  }

  /**
   * 执行工具调用
   */
  async executeToolCall(sessionId: string, toolCall: ToolCall): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();

    try {
      let result: any;

      if (toolCall.type === "mcp-tool" && this.pluginManager) {
        // 通过 MCP 插件执行工具
        result = await this.executeMCPTool(toolCall, session);
      } else if (toolCall.type === "plugin" && this.pluginManager) {
        // 通过插件系统执行工具
        result = await this.executePluginTool(toolCall, session);
      } else {
        // 执行内置工具
        result = await this.executeBuiltinTool(toolCall, session);
      }

      // 更新工具调用状态
      toolCall.status = "completed";
      toolCall.endTime = new Date().toISOString();
      toolCall.result = result;

      // 记录执行历史
      const executionRecord = {
        id: this.generateExecutionId(),
        sessionId,
        toolCall,
        input: toolCall.parameters,
        output: result,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: true,
      };

      session.context.toolExecutionHistory.push(executionRecord);

      return result;
    } catch (error) {
      // 更新错误状态
      toolCall.status = "error";
      toolCall.error = error instanceof Error ? error.message : String(error);
      toolCall.endTime = new Date().toISOString();

      // 记录错误执行历史
      const executionRecord = {
        id: this.generateExecutionId(),
        sessionId,
        toolCall,
        input: toolCall.parameters,
        output: null,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: false,
        errorDetails: {
          code: "TOOL_EXECUTION_ERROR",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };

      session.context.toolExecutionHistory.push(executionRecord);

      throw error;
    }
  }

  /**
   * 获取引擎状态
   */
  getEngineState(): AgentEngineState {
    return { ...this.state };
  }

  /**
   * 更新引擎配置
   */
  updateConfig(newConfig: Partial<AgentEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 关闭引擎
   */
  async shutdown(): Promise<void> {
    this.state.status = "maintenance";

    // 保存所有活跃会话
    const savePromises = Array.from(this.sessions.values()).map((session) =>
      this.persistSession(session)
    );
    await Promise.all(savePromises);

    // 清理插件
    if (this.pluginManager) {
      await this.shutdownPluginManager();
    }

    // 清理内存
    this.sessions.clear();
    this.state.status = "idle";
  }

  // ========================================
  // 私有方法
  // ========================================

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成内容 ID
   */
  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成执行记录 ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 加载用户会话
   */
  private async loadUserSessions(): Promise<void> {
    const user = await getUser();
    if (!user) return;

    try {
      // 从数据库加载会话（暂时为空实现，等待数据库架构）
      // TODO: 实现数据库会话加载
    } catch (error) {
      console.warn("Failed to load user sessions:", error);
    }
  }

  /**
   * 持久化会话
   */
  private async persistSession(session: AgentSession): Promise<void> {
    try {
      // 保存到数据库（暂时为空实现，等待数据库架构）
      // TODO: 实现数据库会话保存
    } catch (error) {
      console.warn("Failed to persist session:", error);
    }
  }

  /**
   * 删除持久化会话
   */
  private async deletePersistedSession(sessionId: string): Promise<void> {
    try {
      // 从数据库删除（暂时为空实现，等待数据库架构）
      // TODO: 实现数据库会话删除
    } catch (error) {
      console.warn("Failed to delete persisted session:", error);
    }
  }

  /**
   * 初始化插件管理器
   */
  private async initializePluginManager(): Promise<void> {
    if (!this.pluginManager) return;

    try {
      // 加载已启用的插件
      const enabledPlugins = await this.getEnabledPlugins();
      for (const pluginId of enabledPlugins) {
        await this.pluginManager.enable(pluginId);
      }
    } catch (error) {
      console.warn("Failed to initialize plugin manager:", error);
    }
  }

  /**
   * 关闭插件管理器
   */
  private async shutdownPluginManager(): Promise<void> {
    if (!this.pluginManager) return;

    try {
      const enabledPlugins = this.pluginManager.getEnabledPlugins();
      for (const plugin of enabledPlugins) {
        await this.pluginManager.disable(plugin.id);
      }
    } catch (error) {
      console.warn("Failed to shutdown plugin manager:", error);
    }
  }

  /**
   * 获取已启用的插件列表
   */
  private async getEnabledPlugins(): Promise<string[]> {
    // TODO: 从数据库或配置中加载
    return [];
  }

  /**
   * 通过插件处理消息
   */
  private async processMessageThroughPlugins(
    message: AgentMessage,
    session: AgentSession
  ): Promise<MultimodalContent[] | null> {
    if (!this.pluginManager) return null;

    try {
      const enabledPlugins = this.pluginManager.getEnabledPlugins();
      let processedContent: MultimodalContent[] | null = null;

      for (const plugin of enabledPlugins) {
        if (plugin.type === "native") {
          const nativePlugin = plugin as any; // TODO: 正确的类型转换
          if (nativePlugin.onMessage) {
            const result = await nativePlugin.onMessage(message, {
              sessionId: session.id,
              userId: session.userId,
              message,
              sharedVariables: session.context.sharedVariables,
              timestamp: new Date().toISOString(),
              requestId: this.generateMessageId(),
            });

            if (result) {
              processedContent = result;
            }
          }
        }
      }

      return processedContent;
    } catch (error) {
      console.warn("Failed to process message through plugins:", error);
      return null;
    }
  }

  /**
   * 生成 AI 响应
   */
  private async generateAIResponse(
    session: AgentSession,
    content: MultimodalContent[]
  ): Promise<AgentResponse> {
    // TODO: 集成 Vercel AI SDK
    // 暂时返回模拟响应
    return {
      id: this.generateMessageId(),
      sessionId: session.id,
      content: [
        {
          id: this.generateContentId(),
          type: "text",
          content:
            "This is a mock AI response. Integration with Vercel AI SDK is pending.",
          metadata: {
            timestamp: new Date().toISOString(),
            source: "agent",
          },
        },
      ],
      metadata: {
        model: this.config.model,
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70,
        },
        finishReason: "stop",
        executionTime: 1000,
      },
      streaming: false,
    };
  }

  /**
   * 执行工具调用
   */
  private async executeToolCalls(
    session: AgentSession,
    toolCalls: ToolCall[]
  ): Promise<void> {
    const promises = toolCalls.map((toolCall) =>
      this.executeToolCall(session.id, toolCall)
    );

    await Promise.all(promises);
  }

  /**
   * 执行 MCP 工具
   */
  private async executeMCPTool(
    toolCall: ToolCall,
    session: AgentSession
  ): Promise<any> {
    // TODO: 实现 MCP 工具执行
    throw new Error("MCP tool execution not yet implemented");
  }

  /**
   * 执行插件工具
   */
  private async executePluginTool(
    toolCall: ToolCall,
    session: AgentSession
  ): Promise<any> {
    // TODO: 实现插件工具执行
    throw new Error("Plugin tool execution not yet implemented");
  }

  /**
   * 执行内置工具
   */
  private async executeBuiltinTool(
    toolCall: ToolCall,
    session: AgentSession
  ): Promise<any> {
    // TODO: 实现内置工具执行
    throw new Error("Builtin tool execution not yet implemented");
  }

  /**
   * 更新引擎性能统计
   */
  private updateEnginePerformance(
    executionTime: number,
    success: boolean
  ): void {
    this.state.performance.totalRequests += 1;

    if (success) {
      const { totalRequests, averageResponseTime } = this.state.performance;
      this.state.performance.averageResponseTime =
        (averageResponseTime * (totalRequests - 1) + executionTime) /
        totalRequests;
    } else {
      this.state.performance.errorCount += 1;
    }

    this.state.performance.successRate =
      ((this.state.performance.totalRequests -
        this.state.performance.errorCount) /
        this.state.performance.totalRequests) *
      100;
  }
}

/**
 * 创建默认引擎实例
 */
export function createAgentEngine(
  config?: Partial<AgentEngineConfig>
): AgentEngine {
  const defaultConfig: AgentEngineConfig = {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 4096,
    streamResponse: true,
    enableToolCalling: true,
    enableMultimodal: true,
    retryAttempts: 3,
    timeout: 30000,
  };

  return new AgentEngine({ ...defaultConfig, ...config });
}

/**
 * 全局引擎实例（单例模式）
 */
let globalEngineInstance: AgentEngine | null = null;

/**
 * 获取全局引擎实例
 */
export function getAgentEngine(): AgentEngine {
  if (!globalEngineInstance) {
    globalEngineInstance = createAgentEngine();
  }
  return globalEngineInstance;
}

/**
 * 重置全局引擎实例
 */
export function resetAgentEngine(): void {
  if (globalEngineInstance) {
    globalEngineInstance.shutdown();
    globalEngineInstance = null;
  }
}
