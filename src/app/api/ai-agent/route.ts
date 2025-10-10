import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  CoreMessage,
  ToolCallPart,
  ToolResultPart,
  UIMessage,
  convertToModelMessages,
  ToolSet,
  tool,
} from "ai";

import { AgentEngine } from "@/lib/ai-agent/core";
import { MCPClientService } from "@/lib/mcp/client";
import { MultimodalProcessorService } from "@/lib/multimodal/processor";
import { PluginManagerService } from "@/lib/plugins/manager";
import { createClient } from "@/lib/supabase/server";
import type {
  AgentSession,
  MultimodalContent,
  ToolCall,
  AgentMessage,
} from "@/types/ai-agent";
import env from "@/lib/env";
import z from "zod";

// Initialize services
const agentEngine = new AgentEngine();
const mcpClient = new MCPClientService();
const multimodalProcessor = new MultimodalProcessorService();
const pluginManager = new PluginManagerService();

const openai = createOpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

// Tool definitions for the AI model
const availableTools: ToolSet = {
  // MCP tool execution
  executeMCPTool: {
    description: "Execute a tool from an MCP server",
    inputSchema: {
      type: "object",
      properties: {
        serverId: {
          type: "string",
          description: "The ID of the MCP server",
        },
        toolName: {
          type: "string",
          description: "The name of the tool to execute",
        },
        parameters: {
          type: "object",
          description: "Parameters to pass to the tool",
        },
      },
      required: ["serverId", "toolName", "parameters"],
    },
  },

  // Plugin execution
  executePlugin: {
    description: "Execute a registered plugin",
    parameters: {
      type: "object",
      properties: {
        pluginId: {
          type: "string",
          description: "The ID of the plugin to execute",
        },
        context: {
          type: "object",
          description: "Execution context for the plugin",
        },
      },
      required: ["pluginId", "context"],
    },
  },

  // Multimodal content processing
  processMultimodalContent: {
    description: "Process multimodal content (images, code, files, etc.)",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "object",
          description: "The multimodal content to process",
        },
        processingOptions: {
          type: "object",
          description: "Processing configuration options",
        },
      },
      required: ["content"],
    },
  },

  // Session management
  updateSession: {
    description: "Update agent session properties",
    parameters: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The session ID to update",
        },
        updates: {
          type: "object",
          description: "Properties to update",
        },
      },
      required: ["sessionId", "updates"],
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      messages,
      sessionId,
      mode = "simple",
      multimodalContent,
      mcpConfig,
      pluginConfig,
    } = body;

    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get or create agent session
    let session: AgentSession | null = null;
    if (sessionId) {
      session = await agentEngine.getSession(sessionId);
      if (!session || session.userId !== user.id) {
        return NextResponse.json(
          { error: "Session not found or access denied" },
          { status: 404 }
        );
      }
    } else {
      session = await agentEngine.createSession(undefined, mode);
    }

    // Process multimodal content if provided
    const processedContent: MultimodalContent[] = [];
    if (multimodalContent && multimodalContent.length > 0) {
      for (const content of multimodalContent) {
        try {
          const result = await multimodalProcessor.processContent(content);
          if (result.success) {
            processedContent.push(result.data!);
          }
        } catch (error) {
          console.error("Multimodal processing error:", error);
        }
      }
    }

    // Configure MCP connections if provided
    if (mcpConfig) {
      try {
        await mcpClient.connect(mcpConfig);
      } catch (error) {
        console.error("MCP configuration error:", error);
      }
    }

    // Load plugins if configured
    if (pluginConfig) {
      try {
        for (const plugin of pluginConfig.plugins || []) {
          await pluginManager.load(plugin.id);
        }
      } catch (error) {
        console.error("Plugin loading error:", error);
      }
    }

    // Convert messages to CoreMessage format

    const coreMessages: CoreMessage[] = convertToModelMessages(messages);

    // Add session context to system message
    const systemMessage: CoreMessage = {
      role: "system",
      content: `You are an AI agent with access to various tools and plugins.
Current session mode: ${session.mode}
Session capabilities: ${JSON.stringify(
        session.settings.mcpConfigs.map((c) => c.capabilities)
      )}
Available MCP servers: ${mcpClient
        .getAllSessions()
        .map((s) => s.serverId)
        .join(", ")}
Loaded plugins: ${Array.from(pluginManager.getEnabledPlugins().keys()).join(
        ", "
      )}

When using tools:
- Use executeMCPTool for MCP server tools
- Use executePlugin for registered plugins
- Use processMultimodalContent for media processing
- Use updateSession to modify session properties

Always provide helpful responses and explain tool usage when appropriate.`,
    };

    const messagesWithSystem = [systemMessage, ...coreMessages];

    // Stream response using Vercel AI SDK
    const result = await streamText({
      model: openai("gpt-5"),
      messages: messagesWithSystem,
      tools: {
        // MCP tool execution
        executeMCPTool: tool({
          description: "Execute a tool from an MCP server",
          inputSchema: z.object({
            serverId: z.string().describe("The ID of the MCP server"),
            toolName: z.string().describe("The name of the tool to execute"),
            parameters: z.any().describe("Parameters to pass to the tool"),
          }),
          execute: async ({ serverId, toolName, parameters }) => {
            const result = await mcpClient.executeTool(
              serverId,
              toolName,
              parameters
            );

            // Update session with tool call
            await agentEngine.updateSession(session.id, {
              lastActivity: new Date().toISOString(),
              toolCalls: [
                ...(session.toolCalls || []),
                {
                  id: toolCall.toolCallId,
                  name: toolName,
                  parameters,
                  timestamp: new Date().toISOString(),
                  status: result.success ? "completed" : "failed",
                  result: result.result,
                  error: result.error,
                },
              ],
            });

            return {
              success: result.success,
              result: result.result,
              error: result.error,
            };
          },
        }),

        // Plugin execution
        executePlugin: tool({
          description: "Execute a registered plugin",
          inputSchema: z.object({
            pluginId: z.string().describe("The ID of the plugin to execute"),
            context: z.any().describe("Execution context for the plugin"),
          }),
          execute: async ({ pluginId, context }) => {
            const result = await pluginManager.executePlugin(pluginId, {
              sessionId: session.id,
              userId: user.id,
              mode: session.mode,
              ...context,
            });

            return {
              success: true,
              result,
            };
          },
        }),

        // Multimodal content processing
        processMultimodalContent: tool({
          description: "Process multimodal content (images, code, files, etc.)",
          inputSchema: z.object({
            content: z.any().describe("The multimodal content to process"),
            processingOptions: z
              .any()
              .describe("Processing configuration options"),
          }),
          execute: async ({ content, processingOptions }) => {
            const result = await multimodalProcessor.processContent(
              content
              // processingOptions
            );

            return {
              success: result.success,
              result: result.data,
              metadata: result.metadata,
              error: result.error,
            };
          },
        }),

        // Session management
        updateSession: tool({
          description: "Update agent session properties",
          inputSchema: z.object({
            sessionId: z.string().describe("The session ID to update"),
            updates: z.any().describe("Properties to update"),
          }),
          execute: async ({ sessionId: targetSessionId, updates }) => {
            // Ensure user can only update their own sessions
            if (targetSessionId !== session.id) {
              const targetSession = await agentEngine.getSession(
                targetSessionId
              );
              if (!targetSession || targetSession.userId !== user.id) {
                throw new Error("Access denied to session");
              }
            }

            await agentEngine.updateSession(targetSessionId, updates);

            return {
              success: true,
              result: "Session updated successfully",
            };
          },
        }),
      },
      toolChoice: "auto",
      temperature: 0.7,

      // Handle tool calls
      // async onToolCall({ toolCall }) {
      //   console.log("Tool call:", toolCall);

      //   try {
      //     switch (toolCall.toolName) {
      //       case "executeMCPTool": {
      //         const { serverId, toolName, parameters } = toolCall.args;
      //         const result = await mcpClient.executeTool(
      //           serverId,
      //           toolName,
      //           parameters
      //         );

      //         // Update session with tool call
      //         await agentEngine.updateSession(session.id, {
      //           lastActivity: new Date().toISOString(),
      //           toolCalls: [
      //             ...(session.toolCalls || []),
      //             {
      //               id: toolCall.toolCallId,
      //               name: toolName,
      //               parameters,
      //               timestamp: new Date().toISOString(),
      //               status: result.success ? "completed" : "failed",
      //               result: result.result,
      //               error: result.error,
      //             },
      //           ],
      //         });

      //         return {
      //           success: result.success,
      //           result: result.result,
      //           error: result.error,
      //         };
      //       }

      //       case "executePlugin": {
      //         const { pluginId, context } = toolCall.args;
      //         const result = await pluginManager.executePlugin(pluginId, {
      //           sessionId: session.id,
      //           userId: user.id,
      //           mode: session.mode,
      //           ...context,
      //         });

      //         return {
      //           success: true,
      //           result,
      //         };
      //       }

      //       case "processMultimodalContent": {
      //         const { content, processingOptions } = toolCall.args;
      //         const result = await multimodalProcessor.processContent(
      //           content
      //           // processingOptions
      //         );

      //         return {
      //           success: result.success,
      //           result: result.data,
      //           metadata: result.metadata,
      //           error: result.error,
      //         };
      //       }

      //       case "updateSession": {
      //         const { sessionId: targetSessionId, updates } = toolCall.args;

      //         // Ensure user can only update their own sessions
      //         if (targetSessionId !== session.id) {
      //           const targetSession = await agentEngine.getSession(
      //             targetSessionId
      //           );
      //           if (!targetSession || targetSession.userId !== user.id) {
      //             throw new Error("Access denied to session");
      //           }
      //         }

      //         await agentEngine.updateSession(targetSessionId, updates);

      //         return {
      //           success: true,
      //           result: "Session updated successfully",
      //         };
      //       }

      //       default:
      //         throw new Error(`Unknown tool: ${toolCall.toolName}`);
      //     }
      //   } catch (error) {
      //     console.error(
      //       `Tool execution error for ${toolCall.toolName}:`,
      //       error
      //     );
      //     return {
      //       success: false,
      //       error:
      //         error instanceof Error ? error.message : "Tool execution failed",
      //     };
      //   }
      // },

      // Handle completion
      async onFinish({ text, toolCalls, usage }) {
        try {
          // Save message to session
          const agentMessage: AgentMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: text,
            timestamp: new Date().toISOString(),
            sessionId: session.id,
            ...(toolCalls &&
              toolCalls.length > 0 && { toolInvocations: toolCalls }),
            ...(processedContent.length > 0 && {
              multimodalContent: processedContent,
            }),
          };

          // await agentEngine.addMessage(session.id, agentMessage);

          // Update session activity
          await agentEngine.updateSession(session.id, {
            lastActivity: new Date().toISOString(),
            messageCount: (session.messageCount || 0) + 1,
            ...(usage && {
              usage: {
                ...session.usage,
                promptTokens:
                  (session.usage?.promptTokens || 0) + usage.promptTokens,
                completionTokens:
                  (session.usage?.completionTokens || 0) +
                  usage.completionTokens,
                totalTokens:
                  (session.usage?.totalTokens || 0) + usage.totalTokens,
              },
            }),
          });

          console.log("Message saved successfully");
        } catch (error) {
          console.error("Error saving message:", error);
        }
      },
    });

    // Return streaming response with session info
    return new Response(result.toTextStreamResponse().body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-ID": session.id,
        "X-Session-Mode": session.mode,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("AI Agent API Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Health check endpoint
export async function GET() {
  try {
    // Check service health
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        agentEngine: agentEngine ? "ready" : "unavailable",
        mcpClient: mcpClient ? "ready" : "unavailable",
        multimodalProcessor: multimodalProcessor ? "ready" : "unavailable",
        pluginManager: pluginManager ? "ready" : "unavailable",
      },
      connections: {
        mcpServers: mcpClient.getAllSessions().length,
        loadedPlugins: pluginManager.getEnabledPlugins().length,
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
