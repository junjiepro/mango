/**
 * MiniAppViewer Component
 * 在编辑区显示和编辑 MiniApp 的代码和 Skill
 * 支持创建模式和编辑模式
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Code, FileText, Save, Loader2, Terminal, Play, History, Layers, Plus, Trash2, Pencil, PanelTop, PanelTopClose } from 'lucide-react';
import type { MiniAppEditMode } from '@mango/shared/types/workspace.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('./MonacoEditor').then(mod => mod.MonacoEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div> }
);
import { MCPDebugPanel } from './MCPDebugPanel';
import { InteractPanel } from './InteractPanel';
import { MINIAPP_TEMPLATES } from '@/lib/miniapp/templates';
import type { MiniAppTemplate } from '@/lib/miniapp/templates';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

/** MiniApp 沙盒 API 类型声明，注入 Monaco Editor 提供 IntelliSense */
const MINIAPP_SANDBOX_TYPES = `
// === Storage API ===
declare interface StorageAPI {
  /** 读取存储数据 */
  get(key: string): Promise<unknown>;
  /** 保存数据 */
  set(key: string, value: unknown): Promise<void>;
  /** 删除数据 */
  delete(key: string): Promise<void>;
  /** 列出所有 key（可按前缀过滤） */
  list(prefix?: string): Promise<string[]>;
}

// === Notification API ===
declare interface NotificationAPI {
  /** 发送通知 */
  send(title: string, body?: string): Promise<void>;
}

// === HTTP API ===
declare interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}
declare interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
}
declare interface HttpAPI {
  get(url: string, options?: HttpOptions): Promise<HttpResponse>;
  post(url: string, body?: unknown, options?: HttpOptions): Promise<HttpResponse>;
  put(url: string, body?: unknown, options?: HttpOptions): Promise<HttpResponse>;
  delete(url: string, options?: HttpOptions): Promise<HttpResponse>;
}

// === User Info ===
declare interface UserInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

// === Schema Builder (z) ===
declare const z: {
  string(): { type: 'string'; describe(d: string): { type: 'string'; description: string } };
  number(): { type: 'number'; describe(d: string): { type: 'number'; description: string } };
  boolean(): { type: 'boolean'; describe(d: string): { type: 'boolean'; description: string } };
  array(item: unknown): { type: 'array'; items: unknown };
  object(shape: Record<string, unknown>): { type: 'object'; properties: Record<string, unknown> };
  enum(values: string[]): { type: 'string'; enum: string[] };
};

// === UI Resource ===
declare interface UIResourceContent {
  type: string;
  props?: Record<string, unknown>;
  children?: UIResourceContent[];
  id?: string;
  events?: Array<{ event: string; action: string; payload?: Record<string, unknown> }>;
}
declare function createUIResource(options: {
  uri?: string;
  content: UIResourceContent;
  encoding?: 'json' | 'html';
}): { uri: string; content: string; mimeType: string };

// === MCP Server (ext-apps 标准 API) ===

/** 标准 UI 资源 MIME 类型 */
declare const RESOURCE_MIME_TYPE: string;

/** MCP Server 实例（传递给 registerAppTool/registerAppResource） */
declare const mcpServer: unknown;

/** 注册 MCP 工具（对标 @modelcontextprotocol/ext-apps） */
declare function registerAppTool(
  server: unknown,
  name: string,
  options: {
    title?: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    _meta?: { ui?: { resourceUri?: string } };
    annotations?: Record<string, unknown>;
  },
  handler: (args: Record<string, unknown>) => Promise<unknown>
): void;

/** 注册 UI 资源（对标 @modelcontextprotocol/ext-apps） */
declare function registerAppResource(
  server: unknown,
  name: string,
  uri: string,
  options: { mimeType?: string; description?: string },
  handler: () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string; _meta?: Record<string, unknown> }> }>
): void;

// === Host Context ===
declare interface HostContext {
  theme?: 'light' | 'dark';
  locale?: string;
  containerDimensions?: { width?: number; maxHeight?: number };
}

// === Tool Result (Host -> View 推送) ===
declare interface ToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

// === App 类 (MCP Apps SDK) ===
declare class App {
  constructor(
    info?: { name: string; version: string },
    capabilities?: { tools?: { listChanged?: boolean } },
    options?: { autoResize?: boolean },
  );
  /** 连接到 Host */
  connect(): Promise<unknown>;
  /** 主动调用服务端工具 */
  callServerTool(name: string, args?: Record<string, unknown>): Promise<unknown>;
  /** 读取资源 */
  readResource(uri: string): Promise<unknown>;
  /** 请求 Host 打开链接 */
  openLink(url: string): Promise<unknown>;
  /** 向对话发送消息 */
  sendMessage(role: string, content: string): Promise<unknown>;
  /** 请求调整大小 */
  requestResize(width: number, height: number): void;
  /** Host 上下文 */
  hostContext: HostContext;
  /** 工具输入事件 */
  ontoolinput: ((params: { arguments: Record<string, unknown> }) => void) | null;
  /** 流式工具输入事件 */
  ontoolinputpartial: ((params: { arguments: Record<string, unknown> }) => void) | null;
  /** 工具结果事件 */
  ontoolresult: ((result: ToolResult) => void) | null;
  /** 工具取消事件 */
  ontoolcancelled: ((params: { reason?: string }) => void) | null;
  /** Host 上下文变化事件 */
  onhostcontextchanged: ((ctx: HostContext) => void) | null;
  /** View 销毁前回调 */
  onteardown: (() => Promise<Record<string, unknown>> | Record<string, unknown>) | null;
}

// === 沙盒全局变量 ===
/** 当前用户信息（只读） */
declare const user: UserInfo;
/** 持久化存储 API */
declare const storage: StorageAPI;
/** 通知 API */
declare const notification: NotificationAPI;
/** HTTP 请求 API */
declare const http: HttpAPI;
/** 日志输出（带 MiniApp 前缀） */
declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };
/** 当前 App 实例（在 HTML 模式下可用） */
declare const app: App;
/** UI HTML 资源（从 html 字段自动注入） */
declare function getUIResource(name: string): string;
`;

interface MiniAppViewerProps {
  miniApp?: MiniApp | null;
  isCreateMode?: boolean;
  isOwner?: boolean;
  onSaved?: (miniApp: MiniApp) => void;
  onCreated?: (miniApp: MiniApp) => void;
}

export function MiniAppViewer({
  miniApp,
  isCreateMode = false,
  isOwner,
  onSaved,
  onCreated,
}: MiniAppViewerProps) {
  const t = useTranslations('workspace');
  const hasHtmlResource = miniApp && Object.keys((miniApp as any).html || {}).length > 0;
  const [activeTab, setActiveTab] = useState<MiniAppEditMode>(
    isCreateMode ? 'code'
      : hasHtmlResource ? 'interact'
      : 'mcp'
  );
  const [saving, setSaving] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  // 编辑状态
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [skillContent, setSkillContent] = useState('');
  const [html, setHtml] = useState<Record<string, string>>({});

  // 脏状态标记
  const [isDirty, setIsDirty] = useState(false);

  // 初始化编辑状态
  useEffect(() => {
    if (miniApp) {
      setName(miniApp.name || '');
      setDisplayName(miniApp.display_name || '');
      setDescription(miniApp.description || '');
      setCode(miniApp.code || '');
      setSkillContent((miniApp as any).skill_content || '');
      setHtml((miniApp as any).html || {});
      setIsDirty(false);
    } else if (isCreateMode) {
      // 创建模式：使用默认模板（Vanilla JS）
      const defaultTemplate = MINIAPP_TEMPLATES[0];
      setName('');
      setDisplayName('');
      setDescription('');
      setCode(defaultTemplate.code);
      setSkillContent(defaultTemplate.skillContent);
      setHtml(defaultTemplate.html);
      setIsDirty(false);
    }
  }, [miniApp, isCreateMode]);

  // 处理字段变更
  const handleFieldChange = useCallback((field: string, value: string | Record<string, string>) => {
    setIsDirty(true);
    switch (field) {
      case 'name':
        setName(value as string);
        break;
      case 'displayName':
        setDisplayName(value as string);
        break;
      case 'description':
        setDescription(value as string);
        break;
      case 'code':
        setCode(value as string);
        break;
      case 'skillContent':
        setSkillContent(value as string);
        break;
      case 'html':
        setHtml(value as Record<string, string>);
        break;
    }
  }, []);

  // 模板选择处理
  const handleTemplateSelect = useCallback((template: MiniAppTemplate) => {
    setCode(template.code);
    setSkillContent(template.skillContent);
    setHtml(template.html);
    setIsDirty(true);
  }, []);

  // 保存/创建处理
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (isCreateMode) {
        // 创建新应用
        const response = await fetch('/api/miniapps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            display_name: displayName,
            description,
            code,
            skill_content: skillContent,
            html: Object.keys(html).length > 0 ? html : null,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setIsDirty(false);
          onCreated?.(result.data);
        } else {
          console.error('创建失败:', result.error);
        }
      } else if (miniApp) {
        // 更新现有应用
        const response = await fetch(`/api/miniapps/${miniApp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: displayName,
            description,
            code,
            skill_content: skillContent,
            html: Object.keys(html).length > 0 ? html : null,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setIsDirty(false);
          onSaved?.(result.data);
        } else {
          console.error('保存失败:', result.error);
        }
      }
    } catch (error) {
      console.error('保存出错:', error);
    } finally {
      setSaving(false);
    }
  }, [isCreateMode, miniApp, name, displayName, description, code, skillContent, html, onCreated, onSaved]);

  // 回滚后刷新数据
  const handleRollback = useCallback(async () => {
    if (!miniApp) return;
    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}`);
      const result = await response.json();
      if (result.success && result.data) {
        const app = result.data;
        setCode(app.code || '');
        setSkillContent(app.skill_content || '');
        setHtml(app.html || {});
        setDisplayName(app.display_name || '');
        setDescription(app.description || '');
        setIsDirty(false);
        onSaved?.(app);
      }
    } catch (error) {
      console.error('刷新数据失败:', error);
    }
  }, [miniApp, onSaved]);

  // 创建模式或无应用时显示创建表单
  if (isCreateMode || !miniApp) {
    return (
      <div className="flex flex-col h-full">
        <CreateModeHeader
          displayName={displayName}
          isDirty={isDirty}
          saving={saving}
          onSave={handleSave}
          canSave={!!name && !!displayName && !!description && !!code}
        />
        <CreateModeForm
          name={name}
          displayName={displayName}
          description={description}
          onFieldChange={handleFieldChange}
          onTemplateSelect={handleTemplateSelect}
        />
        <EditorTabs activeTab={activeTab} onTabChange={setActiveTab} isCreateMode={true} />
        <EditorContent
          activeTab={activeTab}
          code={code}
          skillContent={skillContent}
          htmlResources={html}
          onCodeChange={(v) => handleFieldChange('code', v || '')}
          onSkillChange={(v) => handleFieldChange('skillContent', v || '')}
          onHtmlResourcesChange={(v) => handleFieldChange('html', v)}
          isCreateMode={true}
        />
      </div>
    );
  }

  const miniAppIcon = miniApp.icon_url ? (
    <img
      src={miniApp.icon_url}
      alt={miniApp.display_name}
      className="h-10 w-10 rounded-lg object-cover"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Package className="h-5 w-5" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* 头部信息：可折叠，默认隐藏 */}
      {headerVisible && (
        <div className="flex items-center gap-3 p-4 border-b shrink-0">
          {miniAppIcon}
          {isOwner !== false ? (
            /* 拥有者：可编辑 */
            <>
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  value={displayName}
                  onChange={(e) => handleFieldChange('displayName', e.target.value)}
                  className="h-7 font-semibold text-base"
                  placeholder={t('miniAppViewer.appNamePlaceholder')}
                />
                <Input
                  value={description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="h-6 text-sm text-muted-foreground"
                  placeholder={t('miniAppViewer.appDescPlaceholder')}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  v{(miniApp.manifest as any)?.version || '1.0.0'}
                </span>
                {isDirty && (
                  <span className="text-xs text-orange-500">{t('miniAppViewer.unsaved')}</span>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-1">{t('miniAppViewer.save')}</span>
                </Button>
              </div>
            </>
          ) : (
            /* 非拥有者：只读展示 */
            <>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">{miniApp.display_name}</h2>
                <p className="text-sm text-muted-foreground truncate">{miniApp.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                v{(miniApp.manifest as any)?.version || '1.0.0'}
              </span>
            </>
          )}
        </div>
      )}

      {/* 标签切换 */}
      <EditorTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOwner={isOwner}
        headerVisible={headerVisible}
        onToggleHeader={() => setHeaderVisible(v => !v)}
        isDirty={isDirty}
      />

      {/* 内容区域 */}
      <EditorContent
        activeTab={activeTab}
        code={code}
        skillContent={skillContent}
        htmlResources={html}
        onCodeChange={(v) => handleFieldChange('code', v || '')}
        onSkillChange={(v) => handleFieldChange('skillContent', v || '')}
        onHtmlResourcesChange={(v) => handleFieldChange('html', v)}
        miniAppId={miniApp.id}
        onRollback={handleRollback}
      />
    </div>
  );
}

// 标签切换组件
function EditorTabs({
  activeTab,
  onTabChange,
  isOwner,
  isCreateMode,
  headerVisible,
  onToggleHeader,
  isDirty,
}: {
  activeTab: MiniAppEditMode;
  onTabChange: (tab: MiniAppEditMode) => void;
  isOwner?: boolean;
  isCreateMode?: boolean;
  headerVisible?: boolean;
  onToggleHeader?: () => void;
  isDirty?: boolean;
}) {
  const t = useTranslations('workspace');
  // 创建模式：仅 Code/Skill
  // 拥有者：Code/Skill/MCP/交互
  // 非拥有者：交互/MCP
  const allTabs: { key: MiniAppEditMode; label: string; icon: React.ReactNode }[] = [
    { key: 'code', label: 'Code', icon: <Code className="h-4 w-4" /> },
    { key: 'resources', label: t('miniAppViewer.resourcesTab'), icon: <Layers className="h-4 w-4" /> },
    { key: 'skill', label: 'Skill', icon: <FileText className="h-4 w-4" /> },
    { key: 'mcp', label: 'MCP', icon: <Terminal className="h-4 w-4" /> },
    { key: 'interact', label: t('miniAppViewer.interactTab'), icon: <Play className="h-4 w-4" /> },
    { key: 'history', label: t('miniAppViewer.historyTab'), icon: <History className="h-4 w-4" /> },
  ];

  let visibleTabs: typeof allTabs;
  if (isCreateMode) {
    visibleTabs = allTabs.filter(t => t.key === 'code' || t.key === 'resources' || t.key === 'skill');
  } else if (isOwner !== false) {
    visibleTabs = allTabs;
  } else {
    visibleTabs = allTabs.filter(t => t.key === 'interact' || t.key === 'mcp');
  }

  return (
    <div className="flex border-b shrink-0">
      <div className="flex min-w-0 overflow-x-auto">
        {visibleTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap',
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {/* 头部信息栏折叠切换（非创建模式） */}
      {!isCreateMode && onToggleHeader && (
        <button
          onClick={onToggleHeader}
          className={cn(
            'shrink-0 ml-auto flex items-center gap-1 px-3 py-2 text-xs transition-colors',
            'text-muted-foreground hover:text-foreground',
          )}
          title={headerVisible ? t('miniAppViewer.hideInfoBar') : t('miniAppViewer.showInfoBar')}
        >
          {headerVisible
            ? <PanelTopClose className="h-4 w-4" />
            : <PanelTop className="h-4 w-4" />
          }
          {!headerVisible && isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          )}
        </button>
      )}
    </div>
  );
}

// 创建模式头部
function CreateModeHeader({
  displayName,
  isDirty,
  saving,
  onSave,
  canSave,
}: {
  displayName: string;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  canSave: boolean;
}) {
  const t = useTranslations('workspace');
  return (
    <div className="flex items-center gap-3 p-4 border-b shrink-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Package className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold">
          {displayName || t('miniAppViewer.newMiniApp')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('miniAppViewer.fillInfoAndCode')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="text-xs text-orange-500">{t('miniAppViewer.unsaved')}</span>
        )}
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !canSave}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="ml-1">{t('miniAppViewer.create')}</span>
        </Button>
      </div>
    </div>
  );
}

// 创建模式表单
function CreateModeForm({
  name,
  displayName,
  description,
  onFieldChange,
  onTemplateSelect,
}: {
  name: string;
  displayName: string;
  description: string;
  onFieldChange: (field: string, value: string) => void;
  onTemplateSelect?: (template: MiniAppTemplate) => void;
}) {
  const t = useTranslations('workspace');
  const [selectedTemplateId, setSelectedTemplateId] = useState(MINIAPP_TEMPLATES[0].id);

  return (
    <div className="p-4 border-b space-y-3 shrink-0">
      {/* 模板选择 */}
      <div className="space-y-1">
        <Label className="text-xs">{t('miniAppViewer.codeTemplate')}</Label>
        <div className="flex gap-2">
          {MINIAPP_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                setSelectedTemplateId(tpl.id);
                onTemplateSelect?.(tpl);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs border transition-colors',
                selectedTemplateId === tpl.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="font-medium">{tpl.name}</div>
              <div className="text-muted-foreground mt-0.5">{tpl.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">
            {t('miniAppViewer.appId')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder={t('miniAppViewer.appIdPlaceholder')}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="displayName" className="text-xs">
            {t('miniAppViewer.displayName')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => onFieldChange('displayName', e.target.value)}
            placeholder={t('miniAppViewer.displayNamePlaceholder')}
            className="h-8"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description" className="text-xs">
          {t('miniAppViewer.appDesc')} <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          placeholder={t('miniAppViewer.appDescInputPlaceholder')}
          className="h-16 resize-none"
        />
      </div>
    </div>
  );
}

// 编辑器内容区域
function EditorContent({
  activeTab,
  code,
  skillContent,
  htmlResources,
  onCodeChange,
  onSkillChange,
  onHtmlResourcesChange,
  miniAppId,
  isCreateMode,
  onRollback,
}: {
  activeTab: MiniAppEditMode;
  code: string;
  skillContent: string;
  htmlResources: Record<string, string>;
  onCodeChange: (value: string | undefined) => void;
  onSkillChange: (value: string | undefined) => void;
  onHtmlResourcesChange: (value: Record<string, string>) => void;
  miniAppId?: string;
  isCreateMode?: boolean;
  onRollback?: () => void;
}) {
  const t = useTranslations('workspace');
  const basePath = isCreateMode ? 'new-miniapp' : miniAppId || 'miniapp';

  switch (activeTab) {
    case 'code':
      return (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            key={`${basePath}-code`}
            value={code}
            language="javascript"
            path={`${basePath}/code.js`}
            onChange={onCodeChange}
            extraLibs={[{ content: MINIAPP_SANDBOX_TYPES, filePath: 'ts:miniapp-sandbox.d.ts' }]}
          />
        </div>
      );
    case 'resources':
      return (
        <div className="flex-1 min-h-0">
          <ResourceEditor
            resources={htmlResources}
            onChange={onHtmlResourcesChange}
            basePath={basePath}
          />
        </div>
      );
    case 'skill':
      return (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            key={`${basePath}-skill`}
            value={skillContent}
            language="markdown"
            path={`${basePath}/skill.md`}
            onChange={onSkillChange}
          />
        </div>
      );
    case 'mcp':
      return (
        <div className="flex-1 min-h-0">
          {miniAppId ? (
            <MCPDebugPanel miniAppId={miniAppId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('miniAppViewer.saveMcpFirst')}
            </div>
          )}
        </div>
      );
    case 'interact':
      return (
        <div className="flex-1 min-h-0">
          {miniAppId ? (
            <InteractPanel miniAppId={miniAppId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('miniAppViewer.saveInteractFirst')}
            </div>
          )}
        </div>
      );
    case 'history':
      return (
        <div className="flex-1 min-h-0">
          {miniAppId ? (
            <VersionHistoryPanel miniAppId={miniAppId} onRollback={onRollback} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('miniAppViewer.saveHistoryFirst')}
            </div>
          )}
        </div>
      );
  }
}

// 资源编辑器组件
function ResourceEditor({
  resources,
  onChange,
  basePath,
}: {
  resources: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  basePath: string;
}) {
  const t = useTranslations('workspace');
  const keys = Object.keys(resources);
  const [selectedKey, setSelectedKey] = useState<string>(keys[0] || 'main');
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // 当 resources 变化时，确保 selectedKey 有效
  useEffect(() => {
    const currentKeys = Object.keys(resources);
    if (currentKeys.length > 0 && !currentKeys.includes(selectedKey)) {
      setSelectedKey(currentKeys[0]);
    }
  }, [resources, selectedKey]);

  const handleContentChange = useCallback((value: string | undefined) => {
    onChange({ ...resources, [selectedKey]: value || '' });
  }, [resources, selectedKey, onChange]);

  const handleAddResource = useCallback(() => {
    const name = newKeyName.trim();
    if (!name || name in resources) return;
    onChange({ ...resources, [name]: '' });
    setSelectedKey(name);
    setAddingNew(false);
    setNewKeyName('');
  }, [newKeyName, resources, onChange]);

  const handleDeleteResource = useCallback((key: string) => {
    const next = { ...resources };
    delete next[key];
    onChange(next);
    const remaining = Object.keys(next);
    if (selectedKey === key) {
      setSelectedKey(remaining[0] || '');
    }
  }, [resources, selectedKey, onChange]);

  const handleRename = useCallback((oldKey: string) => {
    const newKey = renameValue.trim();
    if (!newKey || newKey === oldKey || newKey in resources) {
      setRenamingKey(null);
      return;
    }
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(resources)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
    if (selectedKey === oldKey) setSelectedKey(newKey);
    setRenamingKey(null);
  }, [renameValue, resources, selectedKey, onChange]);

  const currentContent = resources[selectedKey] || '';

  return (
    <div className="flex h-full">
      {/* 左侧：资源列表 */}
      <div className="w-48 border-r flex flex-col shrink-0">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{t('miniAppViewer.resourceList')}</span>
          <button
            onClick={() => setAddingNew(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={t('miniAppViewer.addResource')}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {addingNew && (
          <div className="p-2 border-b flex gap-1">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t('miniAppViewer.resourceName')}
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddResource();
                if (e.key === 'Escape') { setAddingNew(false); setNewKeyName(''); }
              }}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddResource}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {keys.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              {t('miniAppViewer.noResources')}
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key}
                className={cn(
                  'group flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer transition-colors',
                  selectedKey === key
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => setSelectedKey(key)}
              >
                {renamingKey === key ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-6 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(key);
                      if (e.key === 'Escape') setRenamingKey(null);
                    }}
                    onBlur={() => handleRename(key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate text-xs">{key}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingKey(key);
                        setRenameValue(key);
                      }}
                      title={t('miniAppViewer.rename')}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteResource(key);
                      }}
                      title={t('miniAppViewer.delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧：Monaco HTML 编辑器 */}
      <div className="flex-1 min-w-0">
        {selectedKey && selectedKey in resources ? (
          <MonacoEditor
            key={`${basePath}-html-${selectedKey}`}
            value={currentContent}
            language="html"
            path={`${basePath}/${selectedKey}.html`}
            onChange={handleContentChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {keys.length === 0 ? t('miniAppViewer.addResourceToEdit') : t('miniAppViewer.selectResourceToEdit')}
          </div>
        )}
      </div>
    </div>
  );
}

// 版本列表项类型
interface VersionItem {
  version: string;
  change_summary: string | null;
  created_at: string;
  changed_by: string | null;
}

// 版本详情类型
interface VersionDetail {
  version: string;
  code_snapshot: string | null;
  skill_snapshot: string | null;
  html_snapshot: string | null;
  change_summary: string | null;
  created_at: string;
}

// 版本历史面板
function VersionHistoryPanel({
  miniAppId,
  onRollback,
}: {
  miniAppId: string;
  onRollback?: () => void;
}) {
  const t = useTranslations('workspace');
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'code' | 'skill' | 'resources'>('code');
  const [rolling, setRolling] = useState(false);

  // 加载版本列表
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/miniapps/${miniAppId}/versions`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setVersions(json.data || []);
        }
      } catch (e) {
        console.error('加载版本列表失败:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [miniAppId]);

  // 加载版本详情
  useEffect(() => {
    if (!selectedVersion) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/miniapps/${miniAppId}/versions/${selectedVersion}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setDetail(json.data);
        }
      } catch (e) {
        console.error('加载版本详情失败:', e);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [miniAppId, selectedVersion]);

  // 回滚处理
  const handleRollback = useCallback(async () => {
    if (!selectedVersion) return;
    setRolling(true);
    try {
      const res = await fetch(
        `/api/miniapps/${miniAppId}/versions/${selectedVersion}/rollback`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (json.success) {
        onRollback?.();
      } else {
        console.error('回滚失败:', json.error);
      }
    } catch (e) {
      console.error('回滚出错:', e);
    } finally {
      setRolling(false);
    }
  }, [miniAppId, selectedVersion, onRollback]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t('miniAppViewer.loadingVersionHistory')}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('miniAppViewer.noVersions')}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧：版本列表 */}
      <VersionList
        versions={versions}
        selectedVersion={selectedVersion}
        onSelect={setSelectedVersion}
      />

      {/* 右侧：版本详情 */}
      <VersionDetailView
        detail={detail}
        detailLoading={detailLoading}
        previewTab={previewTab}
        onPreviewTabChange={setPreviewTab}
        rolling={rolling}
        onRollback={handleRollback}
      />
    </div>
  );
}

// 版本列表子组件
function VersionList({
  versions,
  selectedVersion,
  onSelect,
}: {
  versions: VersionItem[];
  selectedVersion: string | null;
  onSelect: (version: string) => void;
}) {
  const t = useTranslations('workspace');
  return (
    <div className="w-64 border-r overflow-y-auto shrink-0">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">{t('miniAppViewer.versionHistory')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('miniAppViewer.totalVersions', { count: versions.length })}
        </p>
      </div>
      <div className="divide-y">
        {versions.map((v) => (
          <button
            key={v.version}
            onClick={() => onSelect(v.version)}
            className={cn(
              'w-full text-left px-3 py-2.5 text-sm transition-colors',
              selectedVersion === v.version
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted/50'
            )}
          >
            <div className="font-medium text-xs">v{v.version}</div>
            {v.change_summary && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {v.change_summary}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(v.created_at).toLocaleString('zh-CN')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Code / Skill / 资源 预览切换
function VersionPreviewTabs({
  previewTab,
  onPreviewTabChange,
}: {
  previewTab: 'code' | 'skill' | 'resources';
  onPreviewTabChange: (tab: 'code' | 'skill' | 'resources') => void;
}) {
  const t = useTranslations('workspace');
  return (
    <div className="flex border-b shrink-0">
      <button
        onClick={() => onPreviewTabChange('code')}
        className={cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 transition-colors',
          previewTab === 'code'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <Code className="h-3.5 w-3.5" />
        Code
      </button>
      <button
        onClick={() => onPreviewTabChange('skill')}
        className={cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 transition-colors',
          previewTab === 'skill'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        Skill
      </button>
      <button
        onClick={() => onPreviewTabChange('resources')}
        className={cn(
          'flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 transition-colors',
          previewTab === 'resources'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <Layers className="h-3.5 w-3.5" />
        {t('miniAppViewer.resourcesTab')}
      </button>
    </div>
  );
}

// 版本详情子组件
function VersionDetailView({
  detail,
  detailLoading,
  previewTab,
  onPreviewTabChange,
  rolling,
  onRollback,
}: {
  detail: VersionDetail | null;
  detailLoading: boolean;
  previewTab: 'code' | 'skill' | 'resources';
  onPreviewTabChange: (tab: 'code' | 'skill' | 'resources') => void;
  rolling: boolean;
  onRollback: () => void;
}) {
  const t = useTranslations('workspace');
  if (detailLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t('miniAppViewer.loadingVersionDetail')}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {t('miniAppViewer.selectVersionToView')}
      </div>
    );
  }

  // 解析 html_snapshot
  const htmlSnapshot = detail.html_snapshot
    ? (typeof detail.html_snapshot === 'string'
        ? JSON.parse(detail.html_snapshot)
        : detail.html_snapshot) as Record<string, string>
    : {};
  const htmlKeys = Object.keys(htmlSnapshot);

  let previewValue: string;
  let previewLanguage: string;
  let previewPath: string;

  if (previewTab === 'resources') {
    previewValue = htmlKeys.length > 0 ? htmlSnapshot[htmlKeys[0]] : '';
    previewLanguage = 'html';
    previewPath = `version-${detail.version}/${htmlKeys[0] || 'resource.html'}`;
  } else if (previewTab === 'skill') {
    previewValue = detail.skill_snapshot || '';
    previewLanguage = 'markdown';
    previewPath = `version-${detail.version}/skill.md`;
  } else {
    previewValue = detail.code_snapshot || '';
    previewLanguage = 'javascript';
    previewPath = `version-${detail.version}/code.js`;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 版本信息头 */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="min-w-0">
          <span className="text-sm font-medium">v{detail.version}</span>
          {detail.change_summary && (
            <span className="text-xs text-muted-foreground ml-2">
              {detail.change_summary}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRollback}
          disabled={rolling}
        >
          {rolling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <History className="h-3.5 w-3.5 mr-1" />
          )}
          {t('miniAppViewer.rollbackToVersion')}
        </Button>
      </div>

      {/* Code / Skill / 资源 切换 */}
      <VersionPreviewTabs
        previewTab={previewTab}
        onPreviewTabChange={onPreviewTabChange}
      />

      {/* 只读编辑器 */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key={`version-${detail.version}-${previewTab}`}
          value={previewValue}
          language={previewLanguage}
          path={previewPath}
          readOnly
        />
      </div>
    </div>
  );
}
