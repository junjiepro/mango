/**
 * MiniApp Tools - 小应用创建、更新、调用工具
 * 基于 MCP 协议的 v2 架构
 */

import { tool } from 'https://esm.sh/ai@5.0.110';
import { z } from 'https://esm.sh/zod@3.23.8';

/** MiniApp 工具上下文 */
export interface MiniAppToolContext {
  supabase: any;
  userId: string;
  channel: any;
  messageId: string;
}

/**
 * 创建调用小应用工具
 */
export function createInvokeMiniAppTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '调用小应用执行特定功能。通过 MCP 协议与小应用交互。',
    inputSchema: z.object({
      miniAppId: z.string().describe('小应用ID'),
      toolName: z.string().describe('要调用的工具名称'),
      args: z.record(z.any()).optional().describe('工具参数'),
    }),
    execute: async ({ miniAppId, toolName, args = {} }) => {
      const startTime = Date.now();

      try {
        // 验证小应用安装
        const { data: installation } = await supabase
          .from('mini_app_installations')
          .select('*, mini_app:mini_apps(*)')
          .eq('mini_app_id', miniAppId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (!installation) {
          throw new Error('小应用未安装或已禁用');
        }

        const miniApp = installation.mini_app;

        // 调用 MCP 端点
        const result = await callMiniAppMCP(
          supabase,
          miniAppId,
          'tools/call',
          { name: toolName, arguments: args },
          userId
        );

        const executionTime = Date.now() - startTime;

        // 记录调用
        await logMiniAppInvocation(supabase, {
          userId,
          miniAppId,
          installationId: installation.id,
          toolName,
          executionTime,
          success: true,
        });

        return formatToolResult(miniApp.display_name, toolName, result, executionTime);
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error('小应用调用失败:', error);
        return `❌ 调用失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 调用 MiniApp MCP 端点
 */
async function callMiniAppMCP(
  supabase: any,
  miniAppId: string,
  method: string,
  params?: Record<string, unknown>,
  userId?: string
): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  const serviceKey =
    Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
  };
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/miniapp-mcp/mcp/${miniAppId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP 请求失败: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.result;
}

/**
 * 记录小应用调用日志
 */
async function logMiniAppInvocation(
  supabase: any,
  data: {
    userId: string;
    miniAppId: string;
    installationId: string;
    toolName: string;
    executionTime: number;
    success: boolean;
    error?: string;
  }
): Promise<void> {
  await supabase.from('audit_logs').insert({
    actor_id: data.userId,
    action: 'miniapp_invocation',
    resource_type: 'mini_app',
    resource_id: data.miniAppId,
    details: {
      installation_id: data.installationId,
      tool_name: data.toolName,
      execution_time_ms: data.executionTime,
      success: data.success,
      error: data.error,
    },
  });
}

/**
 * 格式化工具调用结果
 */
function formatToolResult(
  appName: string,
  toolName: string,
  result: any,
  executionTime: number
): string {
  const content = result?.content;
  let resultText = '';

  if (Array.isArray(content)) {
    resultText = content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  } else {
    resultText = JSON.stringify(result, null, 2);
  }

  return `✅ "${appName}" 执行成功
工具: ${toolName}
耗时: ${executionTime}ms
结果: ${resultText}`;
}

/**
 * 创建小应用工具
 */
export function createCreateMiniAppTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '创建新的小应用（MCP 架构）。创建后自动为当前用户安装。',
    inputSchema: z.object({
      name: z.string().describe('唯一标识名(字母数字下划线连字符)'),
      display_name: z.string().describe('显示名称'),
      description: z.string().describe('功能描述'),
      code: z.string().describe('MCP 格式的 JavaScript 代码'),
      skill: z.string().describe('Skill 使用指南（Markdown 格式，告诉 Agent 如何使用此小应用）'),
      html: z
        .record(z.string())
        .optional()
        .describe(
          'UI 资源对象，key 为资源名，value 为 HTML 内容。如 {"main":"<!DOCTYPE html>..."}'
        ),
      tags: z.array(z.string()).optional().describe('标签'),
    }),
    execute: async ({ name, display_name, description, code, skill, html, tags }) => {
      console.log('create_miniapp called with:', {
        name,
        display_name,
        description: description?.substring(0, 50),
        hasCode: !!code,
        hasSkill: !!skill,
      });

      try {
        // 验证必填参数
        if (!name || !display_name || !description || !code || !skill) {
          throw new Error('缺少必填参数: name, display_name, description, code, skill');
        }

        // 验证名称格式
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          throw new Error('名称只能包含字母、数字、下划线和连字符');
        }

        // 检查名称是否已存在
        const { data: existing } = await supabase
          .from('mini_apps')
          .select('id')
          .eq('name', name)
          .eq('creator_id', userId)
          .single();

        if (existing) {
          throw new Error(`名称 "${name}" 已存在`);
        }

        // 创建小应用（v2-mcp 架构）
        const { data: miniApp, error } = await supabase
          .from('mini_apps')
          .insert({
            creator_id: userId,
            name,
            display_name,
            description,
            code,
            html: html || null,
            skill_content: skill,
            architecture_version: 'v2-mcp',
            manifest: { version: '1.0.0', permissions: ['storage'] },
            status: 'active',
            tags: tags || [],
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        // 自动安装
        const { error: installError } = await supabase.from('mini_app_installations').insert({
          user_id: userId,
          mini_app_id: miniApp.id,
          installed_version: '1.0.0',
          status: 'active',
        });

        if (installError) {
          console.error('自动安装失败:', installError);
        }

        return `✅ 小应用 "${display_name}" 创建成功
ID: ${miniApp.id}
架构: v2-mcp`;
      } catch (error) {
        return `❌ 创建失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 计算内容哈希
 */
function calculateContentHash(
  code: string,
  skillContent: string,
  html?: Record<string, string>
): string {
  const content = `${code || ''}|${skillContent || ''}|${JSON.stringify(html || {})}`;
  // 简单哈希实现
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 创建版本记录
 */
async function createVersionRecord(
  supabase: any,
  miniAppId: string,
  app: any,
  changeSummary: string,
  changedBy: string
): Promise<{ version: string; created: boolean }> {
  // 计算内容哈希
  const contentHash = calculateContentHash(app.code, app.skill_content, app.html);

  // 检查是否有相同哈希的版本（避免重复）
  const { data: existingVersion } = await supabase
    .from('mini_app_versions')
    .select('version')
    .eq('mini_app_id', miniAppId)
    .eq('content_hash', contentHash)
    .single();

  if (existingVersion) {
    return { version: existingVersion.version, created: false };
  }

  // 生成新版本号
  const { data: versionData } = await supabase.rpc('generate_next_mini_app_version', {
    p_mini_app_id: miniAppId,
  });

  const newVersion = versionData || '1.0.1';

  // 创建版本记录
  const { error } = await supabase.from('mini_app_versions').insert({
    mini_app_id: miniAppId,
    version: newVersion,
    code_snapshot: app.code,
    skill_snapshot: app.skill_content,
    html_snapshot: app.html,
    manifest_snapshot: app.manifest,
    content_hash: contentHash,
    change_summary: changeSummary,
    changed_by: changedBy,
  });

  if (error) {
    console.error('Failed to create version record:', error);
  }

  return { version: newVersion, created: true };
}

/**
 * 更新小应用工具
 */
export function createUpdateMiniAppTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '更新已存在的小应用。只能更新自己创建的小应用。更新时会自动创建版本记录。',
    inputSchema: z.object({
      miniAppId: z.string().describe('小应用ID'),
      updates: z.object({
        display_name: z.string().optional(),
        description: z.string().optional(),
        code: z.string().optional(),
        skill: z.string().optional().describe('Skill 使用指南'),
        html: z
          .record(z.string())
          .optional()
          .describe('UI 资源。整体替换时传完整对象；增量操作时传要新增/更新的资源'),
        html_mode: z
          .enum(['replace', 'merge', 'delete'])
          .optional()
          .describe(
            'html 更新模式：replace=整体替换(默认)，merge=合并(新增/更新指定key，保留其他)，delete=删除指定key'
          ),
        html_delete_keys: z
          .array(z.string())
          .optional()
          .describe('html_mode=delete 时，要删除的资源 key 列表'),
        tags: z.array(z.string()).optional(),
        status: z.enum(['active', 'suspended']).optional(),
      }),
      changeSummary: z.string().optional().describe('变更摘要，描述本次更新的内容'),
    }),
    execute: async ({ miniAppId, updates, changeSummary }) => {
      try {
        // 验证权限
        const { data: app } = await supabase
          .from('mini_apps')
          .select('*')
          .eq('id', miniAppId)
          .eq('creator_id', userId)
          .single();

        if (!app) {
          throw new Error('小应用不存在或无权限');
        }

        if (Object.keys(updates).length === 0) {
          throw new Error('没有提供更新字段');
        }

        // 如果更新了代码、skill 或 html，先创建版本记录（保存更新前的状态）
        let versionInfo: { version: string; created: boolean } | null = null;
        if (updates.code || updates.skill || updates.html) {
          versionInfo = await createVersionRecord(
            supabase,
            miniAppId,
            app,
            changeSummary || '更新代码/Skill',
            userId
          );
        }

        // 映射字段名：Agent schema 用 skill，数据库字段是 skill_content
        const {
          skill: skillValue,
          html: htmlValue,
          html_mode: htmlMode,
          html_delete_keys: htmlDeleteKeys,
          ...restUpdates
        } = updates;
        const dbUpdates: Record<string, unknown> = {
          ...restUpdates,
          updated_at: new Date().toISOString(),
        };
        if (skillValue !== undefined) {
          dbUpdates.skill_content = skillValue;
        }

        // html 更新：支持 replace / merge / delete 三种模式
        const mode = htmlMode || 'replace';
        if (mode === 'replace' && htmlValue !== undefined) {
          dbUpdates.html = htmlValue;
        } else if (mode === 'merge' && htmlValue) {
          const existing = (app.html as Record<string, string>) || {};
          dbUpdates.html = { ...existing, ...htmlValue };
        } else if (mode === 'delete' && htmlDeleteKeys?.length) {
          const existing = { ...((app.html as Record<string, string>) || {}) };
          for (const key of htmlDeleteKeys) {
            delete existing[key];
          }
          dbUpdates.html = existing;
        }

        // 执行更新
        const { error } = await supabase.from('mini_apps').update(dbUpdates).eq('id', miniAppId);

        if (error) throw new Error(error.message);

        let result = `✅ 小应用 "${app.display_name}" 更新成功`;
        if (versionInfo?.created) {
          result += `\n版本: ${versionInfo.version}`;
        }
        return result;
      } catch (error) {
        return `❌ 更新失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 获取小应用详情工具
 */
export function createGetMiniAppTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '读取小应用详情，包括代码、Skill 和版本信息。用于在更新前了解当前状态。',
    inputSchema: z.object({
      miniAppId: z.string().describe('小应用ID'),
      includeCode: z.boolean().optional().describe('是否包含完整代码，默认 true'),
    }),
    execute: async ({ miniAppId, includeCode = true }) => {
      try {
        // 获取小应用详情
        const { data: app, error } = await supabase
          .from('mini_apps')
          .select('*')
          .eq('id', miniAppId)
          .single();

        if (error || !app) {
          throw new Error('小应用不存在');
        }

        // 检查权限：创建者或公开应用
        const isOwner = app.creator_id === userId;
        const isPublic = app.is_public;

        if (!isOwner && !isPublic) {
          throw new Error('无权限访问此小应用');
        }

        // 获取最新版本信息
        const { data: latestVersion } = await supabase
          .from('mini_app_versions')
          .select('version, change_summary, created_at')
          .eq('mini_app_id', miniAppId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let result = `📦 小应用: ${app.display_name}
ID: ${app.id}
名称: ${app.name}
描述: ${app.description}
状态: ${app.status}
架构: ${app.architecture_version}
版本: ${latestVersion?.version || app.manifest?.version || '1.0.0'}
更新时间: ${app.updated_at}`;

        if (latestVersion?.change_summary) {
          result += `\n最近更新: ${latestVersion.change_summary}`;
        }

        if (includeCode) {
          result += `\n\n--- Skill ---\n${app.skill_content || '(无)'}`;
          result += `\n\n--- Code ---\n${app.code || '(无)'}`;
          if (app.html) {
            const htmlResources = app.html as Record<string, string>;
            const keys = Object.keys(htmlResources);
            result += `\n\n--- HTML Resources (${keys.length}) ---`;
            for (const key of keys) {
              const content = htmlResources[key] || '';
              const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
              result += `\n[${key}] (${content.length} chars): ${preview}`;
            }
          }
        }

        return result;
      } catch (error) {
        return `❌ 获取失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 获取小应用版本历史工具
 */
export function createGetMiniAppVersionsTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '获取小应用的版本历史记录，支持查看特定版本的代码。',
    inputSchema: z.object({
      miniAppId: z.string().describe('小应用ID'),
      version: z.string().optional().describe('指定版本号，获取该版本的完整代码'),
      limit: z.number().optional().describe('返回版本数量限制，默认 10'),
    }),
    execute: async ({ miniAppId, version, limit = 10 }) => {
      try {
        // 验证小应用存在且有权限
        const { data: app } = await supabase
          .from('mini_apps')
          .select('id, display_name, creator_id, is_public')
          .eq('id', miniAppId)
          .single();

        if (!app) {
          throw new Error('小应用不存在');
        }

        const isOwner = app.creator_id === userId;
        const isPublic = app.is_public;

        if (!isOwner && !isPublic) {
          throw new Error('无权限访问此小应用');
        }

        // 如果指定了版本，返回该版本的完整信息
        if (version) {
          const { data: versionData, error } = await supabase
            .from('mini_app_versions')
            .select('*')
            .eq('mini_app_id', miniAppId)
            .eq('version', version)
            .single();

          if (error || !versionData) {
            throw new Error(`版本 ${version} 不存在`);
          }

          return `📦 ${app.display_name} - 版本 ${version}
创建时间: ${versionData.created_at}
变更摘要: ${versionData.change_summary || '(无)'}

--- Skill ---
${versionData.skill_snapshot || '(无)'}

--- Code ---
${versionData.code_snapshot || '(无)'}`;
        }

        // 返回版本列表
        const { data: versions, error } = await supabase
          .from('mini_app_versions')
          .select('version, change_summary, created_at')
          .eq('mini_app_id', miniAppId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          throw new Error(error.message);
        }

        if (!versions || versions.length === 0) {
          return `📦 ${app.display_name} 暂无版本历史记录`;
        }

        let result = `📦 ${app.display_name} 版本历史 (共 ${versions.length} 个):\n`;
        for (const v of versions) {
          result += `\n- ${v.version} (${v.created_at})`;
          if (v.change_summary) {
            result += `\n  ${v.change_summary}`;
          }
        }

        return result;
      } catch (error) {
        return `❌ 获取失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}

/**
 * 回滚小应用版本工具
 */
export function createRollbackMiniAppTool(ctx: MiniAppToolContext) {
  const { supabase, userId } = ctx;

  return tool({
    description: '将小应用回滚到指定版本。只能回滚自己创建的小应用。',
    inputSchema: z.object({
      miniAppId: z.string().describe('小应用ID'),
      version: z.string().describe('要回滚到的版本号'),
    }),
    execute: async ({ miniAppId, version }) => {
      try {
        // 验证权限
        const { data: app } = await supabase
          .from('mini_apps')
          .select('*')
          .eq('id', miniAppId)
          .eq('creator_id', userId)
          .single();

        if (!app) {
          throw new Error('小应用不存在或无权限');
        }

        // 获取目标版本
        const { data: targetVersion, error: versionError } = await supabase
          .from('mini_app_versions')
          .select('*')
          .eq('mini_app_id', miniAppId)
          .eq('version', version)
          .single();

        if (versionError || !targetVersion) {
          throw new Error(`版本 ${version} 不存在`);
        }

        // 先保存当前版本
        await createVersionRecord(
          supabase,
          miniAppId,
          app,
          `回滚前备份 (回滚到 ${version})`,
          userId
        );

        // 执行回滚
        const { error: updateError } = await supabase
          .from('mini_apps')
          .update({
            code: targetVersion.code_snapshot,
            skill_content: targetVersion.skill_snapshot,
            html: targetVersion.html_snapshot,
            manifest: targetVersion.manifest_snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq('id', miniAppId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        return `✅ "${app.display_name}" 已回滚到版本 ${version}`;
      } catch (error) {
        return `❌ 回滚失败: ${error instanceof Error ? error.message : '未知错误'}`;
      }
    },
  });
}
