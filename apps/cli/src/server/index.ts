/**
 * Device Service HTTP Server
 * 使用Hono框架构建轻量级HTTP服务器
 * 新的绑定流程：临时绑定码 + Realtime Channel + 正式绑定码
 */

import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import https from 'https';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import type { CLIConfig } from '../types/index.js';
import { mcpConnector } from '../lib/connectors/mcp-connector.js';
import { acpConnector } from '../lib/connectors/acp-connector.js';
import { serviceHealthChecker } from '../lib/service-health.js';
import { findAvailablePort } from '../lib/port-utils.js';
import { bindingCodeManager, BindingConfig } from '../lib/binding-code-manager.js';
import { generateDeviceId, getLocalIpAddress, getTailscaleAddress } from '../lib/device-id.js';
import { buildDeviceUrls } from '../lib/device-urls.js';
import { tempBindingManager } from '../lib/temp-binding-manager.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { randomBytes } from 'crypto';
import { actualHttpsPort, actualPort } from '../commands/start.js';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { existsSync, mkdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { fileWatcherManager, type FileChangeEvent } from '../lib/file-watcher.js';
import { webServiceScanner } from '../lib/web-service-scanner.js';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import { planEntrySchema } from '@agentclientprotocol/sdk';
import z from 'zod';

export interface TlsOptions {
  cert: string;
  key: string;
  httpsPort: number;
}

export interface ServerResult {
  httpPort: number;
  httpsPort?: number;
}

// Preview token management for iframe access
const PREVIEW_TOKEN_TTL_MS = 8 * 60 * 60_000;
const previewSessions = new Map<
  string,
  { bindingCode: string; serviceId: string; expiresAt: number }
>();
const runtimeRequire = createRequire(import.meta.url);

const PAGE_AGENT_RUNTIME = (() => {
  try {
    const pageAgentEntry = runtimeRequire.resolve('page-agent');
    const pageAgentEntryDir = path.dirname(pageAgentEntry);
    const chalkEntry = runtimeRequire.resolve('chalk');
    const zodPackageJson = runtimeRequire.resolve('zod/package.json');

    return {
      modules: {
        'page-agent.js': pageAgentEntry,
        'core.js': runtimeRequire.resolve('@page-agent/core', { paths: [pageAgentEntryDir] }),
        'page-controller.js': runtimeRequire.resolve('@page-agent/page-controller', {
          paths: [pageAgentEntryDir],
        }),
        'ui.js': runtimeRequire.resolve('@page-agent/ui', { paths: [pageAgentEntryDir] }),
        'llms.js': runtimeRequire.resolve('@page-agent/llms', { paths: [pageAgentEntryDir] }),
      },
      vendorRoots: {
        zod: path.dirname(zodPackageJson),
        chalk: path.resolve(path.dirname(chalkEntry), '..'),
      },
    };
  } catch (error) {
    console.warn('[page-agent runtime] failed to resolve local runtime modules:', error);
    return null;
  }
})();

function rewriteRuntimeImports(code: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce((nextCode, [from, to]) => {
    return nextCode.replaceAll(`'${from}'`, `'${to}'`).replaceAll(`"${from}"`, `"${to}"`);
  }, code);
}

async function loadPageAgentRuntimeModule(moduleName: string): Promise<string | null> {
  if (!PAGE_AGENT_RUNTIME) {
    return null;
  }

  const absolutePath =
    PAGE_AGENT_RUNTIME.modules[moduleName as keyof typeof PAGE_AGENT_RUNTIME.modules];
  if (!absolutePath) {
    return null;
  }

  const source = await readFile(absolutePath, 'utf8');
  const replacementsByModule: Record<string, Record<string, string>> = {
    'page-agent.js': {
      '@page-agent/core': '/page-agent/runtime/modules/core.js',
      '@page-agent/page-controller': '/page-agent/runtime/modules/page-controller.js',
      '@page-agent/ui': '/page-agent/runtime/modules/ui.js',
    },
    'core.js': {
      '@page-agent/llms': '/page-agent/runtime/modules/llms.js',
      chalk: '/page-agent/runtime/vendor/chalk/source/index.js',
      'zod/v4': '/page-agent/runtime/vendor/zod/v4/index.js',
    },
    'llms.js': {
      chalk: '/page-agent/runtime/vendor/chalk/source/index.js',
      'zod/v4': '/page-agent/runtime/vendor/zod/v4/index.js',
    },
  };

  return rewriteRuntimeImports(source, replacementsByModule[moduleName] || {});
}

async function loadPageAgentRuntimeVendorFile(
  vendor: 'zod' | 'chalk',
  relativePath: string
): Promise<string | null> {
  if (!PAGE_AGENT_RUNTIME) {
    return null;
  }

  if (!relativePath || relativePath.includes('..')) {
    return null;
  }

  const root = PAGE_AGENT_RUNTIME.vendorRoots[vendor];
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root)) {
    return null;
  }

  let source: string;
  try {
    source = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  if (vendor === 'chalk') {
    return rewriteRuntimeImports(source, {
      '#ansi-styles': '/page-agent/runtime/vendor/chalk/source/vendor/ansi-styles/index.js',
      '#supports-color': '/page-agent/runtime/vendor/chalk/source/vendor/supports-color/browser.js',
    });
  }

  return source;
}

function createPreviewToken(bindingCode: string, serviceId: string): string {
  // Clean expired tokens
  const now = Date.now();
  for (const [token, session] of previewSessions) {
    if (session.expiresAt <= now) previewSessions.delete(token);
  }
  const token = randomBytes(24).toString('base64url');
  previewSessions.set(token, { bindingCode, serviceId, expiresAt: now + PREVIEW_TOKEN_TTL_MS });
  return token;
}

function getPreviewSession(
  token: string | undefined,
  serviceId?: string
): { bindingCode: string; serviceId: string; expiresAt: number } | null {
  if (!token) {
    return null;
  }

  const session = previewSessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    previewSessions.delete(token);
    return null;
  }

  if (serviceId && session.serviceId !== serviceId) {
    return null;
  }

  return session;
}

function validatePreviewToken(token: string | undefined, serviceId: string): boolean {
  return Boolean(getPreviewSession(token, serviceId));
}

function hasActivePreviewSession(serviceId: string): boolean {
  const now = Date.now();
  for (const [token, session] of previewSessions) {
    if (session.expiresAt <= now) {
      previewSessions.delete(token);
      continue;
    }
    if (session.serviceId === serviceId) return true;
  }
  return false;
}

function getPreviewTokenFromRequest(c: Context): string | undefined {
  const requestUrl = new URL(c.req.url);
  const directToken = requestUrl.searchParams.get('_preview_token');
  if (directToken) {
    return directToken;
  }

  const referer = c.req.header('referer');
  if (!referer) {
    return undefined;
  }

  try {
    return new URL(referer).searchParams.get('_preview_token') || undefined;
  } catch {
    return undefined;
  }
}

function getServiceIdFromReferer(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }

  try {
    const pathname = new URL(referer).pathname;
    const match = pathname.match(/^\/proxy\/web\/([^/]+)(?:\/|$)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export function createWebPreviewBridgeScript(): string {
  const llmProxyBase = '/page-agent/llm';
  const moduleUrls = ['/page-agent/runtime/modules/page-agent.js'];
  return `<script>(function(){
if(window.__MANGO_PREVIEW_BRIDGE_INSTALLED__)return;
window.__MANGO_PREVIEW_BRIDGE_INSTALLED__=true;
var MODULE_URLS=${JSON.stringify(moduleUrls)};
var LLM_PROXY_BASE=${JSON.stringify(llmProxyBase)};
var DEBUG_PREFIX='[mango page-agent]';
var runtime={
  executor:null,
  stopCurrentTask:null,
  setExecutor:function(fn){
    this.executor=typeof fn==='function'?fn:null;
    notify('preview/runtime',{available:!!this.executor});
  },
  setStopHandler:function(fn){
    this.stopCurrentTask=typeof fn==='function'?fn:null;
  }
};
var agentPromise=null;
var agentInstance=null;
var constructorPromise=null;
window.__MANGO_PAGE_AGENT_BRIDGE__=runtime;
function debug(){
  try{
    var args=[DEBUG_PREFIX];
    for(var index=0;index<arguments.length;index+=1){
      args.push(arguments[index]);
    }
    console.log.apply(console,args);
  }catch(_err){}
}
function summary(){
  return {
    title:document.title||'',
    url:location.href,
    forms:document.forms.length,
    inputs:document.querySelectorAll('input, textarea, select').length,
    buttons:document.querySelectorAll('button, [role="button"]').length,
    runtimeAvailable:typeof runtime.executor==='function'
  };
}
function post(message){
  try{
    window.parent.postMessage(Object.assign({
      source:'mango-web-preview',
      version:'1.0'
    },message),'*');
  }catch(_err){}
}
function notify(event,payload){
  post({kind:'event',event:event,payload:payload,timestamp:Date.now()});
}
function respond(id,result,error){
  post({kind:'response',id:id,result:result,error:error,timestamp:Date.now()});
}
function normalizeResult(result){
  if(result===undefined)return { ok:true };
  try{
    return JSON.parse(JSON.stringify(result));
  }catch(_err){
    return { value:String(result) };
  }
}
function getGlobalPageAgentCtor(){
  if(typeof window.PageAgent==='function') return window.PageAgent;
  if(window.pageAgent&&typeof window.pageAgent.PageAgent==='function') return window.pageAgent.PageAgent;
  if(window.PageAgent&&typeof window.PageAgent.PageAgent==='function') return window.PageAgent.PageAgent;
  return null;
}
function resolvePageAgentCtor(moduleValue){
  debug('resolvePageAgentCtor',{
    moduleKeys:moduleValue&&typeof moduleValue==='object'?Object.keys(moduleValue):[],
    defaultKeys:moduleValue&&moduleValue.default&&typeof moduleValue.default==='object'
      ? Object.keys(moduleValue.default)
      : []
  });
  if(moduleValue&&typeof moduleValue.PageAgent==='function') return moduleValue.PageAgent;
  if(moduleValue&&moduleValue.default){
    if(typeof moduleValue.default==='function') return moduleValue.default;
    if(typeof moduleValue.default.PageAgent==='function') return moduleValue.default.PageAgent;
  }
  return getGlobalPageAgentCtor();
}
async function ensurePageAgentCtor(){
  var existingCtor=getGlobalPageAgentCtor();
  if(existingCtor){
    debug('using existing global PageAgent ctor');
    return existingCtor;
  }
  if(!constructorPromise){
    constructorPromise=(async function(){
      var errors=[];
      for(var index=0;index<MODULE_URLS.length;index+=1){
        var url=MODULE_URLS[index];
        try{
          debug('importing page-agent module',url);
          var moduleValue=await import(url);
          var ctor=resolvePageAgentCtor(moduleValue);
          if(typeof ctor==='function'){
            debug('resolved PageAgent ctor from module',{
              url:url,
              ctorName:ctor.name||'anonymous'
            });
            return ctor;
          }
          errors.push('PageAgent export not found after importing '+url);
        }catch(err){
          debug('failed to import page-agent module',{
            url:url,
            message:err&&err.message?err.message:String(err),
            stack:err&&err.stack?String(err.stack):null
          });
          errors.push(err&&err.message?err.message:String(err));
        }
      }
      throw new Error(errors.join(' | '));
    })().catch(function(err){
      constructorPromise=null;
      throw err;
    });
  }
  return constructorPromise;
}
async function getAgent(){
  if(agentInstance)return agentInstance;
  if(!agentPromise){
    agentPromise=ensurePageAgentCtor()
      .then(function(PageAgentCtor){
        debug('creating PageAgent instance',{
          ctorName:PageAgentCtor&&PageAgentCtor.name?PageAgentCtor.name:'anonymous',
          baseURL:LLM_PROXY_BASE,
          model:'default'
        });
        agentInstance=new PageAgentCtor({
          model:'default',
          baseURL:LLM_PROXY_BASE,
          apiKey:'mango-server-proxy',
          language:document.documentElement.lang||navigator.language||'zh-CN',
          enableMask:false,
          onDispose: function() {
            agentInstance = null;
            agentPromise=null;
          }
        });
        debug('PageAgent instance created',{
          prototypeMethods:agentInstance
            ? Object.getOwnPropertyNames(Object.getPrototypeOf(agentInstance)).slice(0,20)
            : []
        });
        return agentInstance;
      })
      .catch(function(err){
        debug('failed to create PageAgent instance',{
          message:err&&err.message?err.message:String(err),
          stack:err&&err.stack?String(err.stack):null
        });
        agentPromise=null;
        throw err;
      });
  }
  return agentPromise;
}
runtime.setExecutor(async function(params){
  var task=String(params&&params.task||'').trim();
  if(!task){
    throw new Error('Missing task');
  }
  debug('executor start',{ task:task });
  var abortController=new AbortController();
  var agent=await getAgent();
  var originalFetch=window.fetch.bind(window);
  runtime.setStopHandler(function(){
    debug('stop requested by host');
    agent.stop();
    abortController.abort(new Error('Page Agent task aborted by user'));
  });
  window.fetch=function(input,init){
    var requestUrl=typeof input==='string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
    var nextInit=init?Object.assign({},init):{};
    if(
      requestUrl.indexOf(LLM_PROXY_BASE)===0 ||
      requestUrl.indexOf('/page-agent/llm')===0
    ){
      debug('forwarding LLM request through preview proxy',requestUrl);
      nextInit.signal=nextInit.signal||abortController.signal;
    }
    return originalFetch(input,nextInit);
  };
  try{
    debug('calling agent.execute');
    var result=await agent.execute(task);
    debug('agent.execute resolved',{
      resultType:typeof result,
      hasResult:result!==undefined&&result!==null
    });
    return {
      ok:true,
      task:task,
      result:normalizeResult(result),
      summary:summary()
    };
  }finally{
    debug('executor cleanup');
    window.fetch=originalFetch;
    runtime.setStopHandler(null);
  }
});
window.addEventListener('message',function(event){
  if(event.source!==window.parent)return;
  var data=event.data;
  if(!data||data.source!=='mango-web-preview-host'||data.kind!=='request')return;
  var id=data.id;
  var method=data.method;
  var params=data.params||{};
  debug('received host request',{ id:id, method:method });
  if(method==='bridge/ping'){
    respond(id,{ok:true,summary:summary()});
    return;
  }
  if(method==='page-agent/execute'){
    if(typeof runtime.executor!=='function'){
      var unavailable='page-agent runtime unavailable in preview iframe';
      notify('preview/error',{message:unavailable});
      respond(id,null,{code:'runtime_unavailable',message:unavailable});
      return;
    }
    notify('page-agent/status',{state:'running',task:String(params.task||'')});
    Promise.resolve()
      .then(function(){ return runtime.executor(params); })
      .then(function(result){
        notify('page-agent/status',{state:'idle'});
        respond(id,result||{ok:true});
      })
      .catch(function(err){
        var message=err&&err.message?err.message:String(err);
        debug('page-agent execution failed',{
          message:message,
          stack:err&&err.stack?String(err.stack):null
        });
        if(
          message.indexOf('aborted by user')!==-1 ||
          message.indexOf('AbortError')!==-1 ||
          message.indexOf('aborted')!==-1
        ){
          notify('page-agent/status',{state:'aborted',message:message});
          respond(id,{ok:false,aborted:true,message:message});
          return;
        }
        notify('preview/error',{message:message});
        notify('page-agent/status',{state:'error',message:message});
        respond(id,null,{code:'execution_failed',message:message});
      });
    return;
  }
  if(method==='page-agent/stop'){
    if(typeof runtime.stopCurrentTask==='function'){
      debug('invoking runtime stop handler');
      runtime.stopCurrentTask();
      notify('page-agent/status',{state:'aborted'});
      respond(id,{ok:true});
      return;
    }
    respond(id,{ok:true});
    return;
  }
  respond(id,null,{code:'method_not_found',message:'Unknown method: '+method});
});
getAgent();
debug('preview bridge installed',{
  moduleUrls:MODULE_URLS,
  llmProxyBase:LLM_PROXY_BASE,
  url:location.href
});
window.addEventListener('error',function(event){
  notify('preview/error',{message:event.message||'Unknown preview error'});
});
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){
    notify('preview/ready',{summary:summary()});
  },{once:true});
}else{
  notify('preview/ready',{summary:summary()});
}
})();</script>`;
}

const getBindingCodeAndCheckFromHeader = (
  c: Context
): [string, BindingConfig | undefined, Response | undefined] => {
  // 从请求头获取 binding code
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return [
      '',
      undefined,
      c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Missing authorization header' },
          id: null,
        },
        { status: 401 }
      ),
    ];
  }

  const bindingCode = authHeader.replace('Bearer ', '');

  // 验证 binding code
  const config = bindingCodeManager.readConfig();
  const codeConfig = config?.[bindingCode];

  return [
    bindingCode,
    codeConfig,
    !codeConfig
      ? c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Invalid binding code' },
            id: null,
          },
          { status: 401 }
        )
      : undefined,
  ];
};

/**
 * 创建HTTP服务器
 */
export function createServer(config: CLIConfig) {
  const app = new Hono();
  const deviceSecret = config.deviceSecret || randomBytes(32).toString('base64url');

  // 全局中间件
  app.use('*', cors());
  app.use('*', logger());

  // 健康检查端点（无需认证）
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '0.1.0',
      platform: process.platform,
      hostname: os.hostname(),
    });
  });

  // 创建新的临时绑定码端点
  app.post('/new-binding', async (c) => {
    try {
      const body = await c.req.json();
      const { device_secret } = body;

      // 验证 device_secret
      if (!device_secret || device_secret !== deviceSecret) {
        return c.json({ error: 'Invalid device_secret' }, 401);
      }

      // 生成新的临时绑定码
      const tempCode = tempBindingManager.generateTempCode();

      // 准备设备 URL 信息
      const tunnelUrl = tunnelManager.getTunnelUrl();
      const localIp = getLocalIpAddress();
      const tailscaleAddr = getTailscaleAddress();
      const deviceUrls = buildDeviceUrls({
        appUrl: config.appUrl,
        tunnelUrl,
        httpPort: actualPort,
        httpsPort: actualHttpsPort,
        localIp,
        tailscaleAddr,
      });

      // 准备设备信息
      const deviceId = generateDeviceId();
      const deviceInfo = {
        platform: process.platform,
        hostname: os.hostname(),
        deviceId,
      };

      // 建立 Realtime Channel 并发送设备 URL
      await tempBindingManager.publishDeviceUrls(tempCode, deviceUrls, deviceInfo);

      // 生成绑定 URL
      const bindUrl = `${config.appUrl}/devices/bind?code=${tempCode}`;

      return c.json({
        success: true,
        temp_code: tempCode,
        bind_url: bindUrl,
        device_urls: deviceUrls,
        expires_in: 3600, // 1小时后过期（可配置）
      });
    } catch (error) {
      console.error('New binding endpoint error:', error);
      return c.json({ error: 'Failed to create new binding' }, 500);
    }
  });

  // 设备绑定端点（新的绑定流程）
  app.post('/bind', async (c) => {
    try {
      const body = await c.req.json();
      const { user_id, binding_name } = body;

      if (!user_id || !binding_name) {
        return c.json({ error: 'Missing required fields: user_id, binding_name' }, 400);
      }

      // 1. 生成设备 ID（基于硬件信息）
      const deviceId = generateDeviceId();

      // 2. 生成并保存正式绑定码（256位）
      const bindingCode = bindingCodeManager.generateAndSave();

      // 3. 转换 platform 格式以匹配数据库约束
      const platformMap: Record<string, string> = {
        win32: 'windows',
        darwin: 'macos',
        linux: 'linux',
      };
      const platform = platformMap[process.platform] || 'linux';

      // 4. 使用新的目录结构生成工作空间目录
      const workingDir = bindingCodeManager.getBindingWorkspaceDir(bindingCode);
      const bindingDataDir = bindingCodeManager.getBindingDataDir(bindingCode);

      // 5. 返回设备信息和绑定码给 Web 端
      // Web 端负责创建 devices 和 device_bindings 记录
      return c.json({
        success: true,
        binding_code: bindingCode,
        working_dir: workingDir,
        binding_data_dir: bindingDataDir,
        device_info: {
          device_id: deviceId,
          device_name: binding_name,
          platform: platform,
          hostname: os.hostname(),
        },
      });
    } catch (error) {
      console.error('Bind endpoint error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  // 配置管理端点（GET）
  app.get('/setting', async (c) => {
    const [bindingCode, targetConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);

    if (errorResponse) {
      return errorResponse;
    }

    const workingDir = bindingCodeManager.getBindingWorkspaceDir(bindingCode);
    const bindingDataDir = bindingCodeManager.getBindingDataDir(bindingCode);

    return c.json({
      success: true,
      config: {
        ...targetConfig,
        workspaceDir: targetConfig?.workspaceDir || workingDir,
        bindingDataDir: targetConfig?.bindingDataDir || bindingDataDir,
      },
    });
  });

  // 配置管理端点（POST）- 保存绑定配置
  app.post('/setting', async (c) => {
    try {
      const body = await c.req.json();
      const {
        binding_code,
        device_id,
        device_name,
        user_id,
        platform,
        hostname,
        temp_code,
        mcp_services,
        mcpServices,
        workspace_dir,
        workspaceDir,
        binding_data_dir,
        bindingDataDir,
      } = body;
      // 规范化字段名为驼峰命名
      const rest = { ...body };
      delete rest.binding_code;
      delete rest.temp_code;

      // 统一使用驼峰命名
      if (workspaceDir || workspace_dir) {
        rest.workspaceDir = workspaceDir || workspace_dir;
        delete rest.workspace_dir;
      }
      if (bindingDataDir || binding_data_dir) {
        rest.bindingDataDir = bindingDataDir || binding_data_dir;
        delete rest.binding_data_dir;
      }
      if (mcpServices || mcp_services) {
        rest.mcpServices = mcpServices || mcp_services;
        delete rest.mcp_services;
      }

      // 验证必需字段
      if (!binding_code) {
        return c.json({ error: 'Missing required field: binding_code' }, 400);
      }

      console.log('Received binding configuration:', rest, binding_code);

      // 保存完整的绑定配置（支持驼峰和下划线命名）
      bindingCodeManager.saveConfig(binding_code, rest, {
        bindingCode: binding_code,
        deviceId: device_id,
        deviceName: device_name,
        boundAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        userId: user_id,
        workspaceDir: workspaceDir || workspace_dir,
        bindingDataDir: bindingDataDir || binding_data_dir,
        metadata: {
          platform: platform || process.platform,
          hostname: hostname || os.hostname(),
          arch: os.arch(),
        },
        mcpServices: mcpServices || mcp_services,
      });

      // 如果提供了 temp_code，标记为已使用并清理 Channel
      if (temp_code && tempBindingManager.isValidTempCode(temp_code)) {
        tempBindingManager.markAsUsed(temp_code);
        // 延迟清理 Channel，给 Web 端一些时间完成操作
        setTimeout(async () => {
          await tempBindingManager.cleanupTempCode(temp_code);
        }, 5000); // 5秒后清理
      }

      return c.json({
        success: true,
        message: 'Binding configuration saved successfully',
      });
    } catch (error) {
      console.error('Failed to save binding configuration:', error);
      return c.json({ error: 'Failed to save configuration' }, 500);
    }
  });

  // Web 服务发现端点 - 获取已发现的服务列表
  app.get('/web-services', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      return c.json({
        services: webServiceScanner.getServices(),
        lastScanAt: webServiceScanner.getLastScanAt(),
        scanConfig: webServiceScanner.getScanConfig(),
      });
    } catch (error) {
      console.error('Web services list error:', error);
      return c.json({ error: 'Failed to list web services' }, 500);
    }
  });

  // Web 服务发现端点 - 手动刷新扫描
  app.post('/web-services/refresh', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const services = await webServiceScanner.refresh();
      return c.json({
        services,
        lastScanAt: webServiceScanner.getLastScanAt(),
      });
    } catch (error) {
      console.error('Web services refresh error:', error);
      return c.json({ error: 'Failed to refresh web services' }, 500);
    }
  });

  // Web 服务发现端点 - 手动探测单个端口
  app.post('/web-services/probe', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { port } = body;

      if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
        return c.json({ error: 'Invalid port number (1-65535)' }, 400);
      }

      const service = await webServiceScanner.probePort(port);
      return c.json({ service });
    } catch (error) {
      console.error('Web services probe error:', error);
      return c.json({ error: 'Failed to probe port' }, 500);
    }
  });

  // Web 服务预览会话端点 - 生成短期 token 供 iframe 使用
  app.post('/web-services/:serviceId/preview-session', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const { serviceId } = c.req.param();
      const service = webServiceScanner.getServiceById(serviceId);

      if (!service) {
        return c.json({ error: 'Service not found' }, 404);
      }
      if (service.status !== 'online') {
        return c.json({ error: 'Service is offline' }, 503);
      }

      const token = createPreviewToken(bindingCode, serviceId);
      return c.json({
        previewUrl: `/proxy/web/${serviceId}/?_preview_token=${token}`,
        token,
        expiresInMs: PREVIEW_TOKEN_TTL_MS,
      });
    } catch (error) {
      console.error('Web service preview session error:', error);
      return c.json({ error: 'Failed to create preview session' }, 500);
    }
  });

  // Web 服务代理端点 - 反向代理到本地服务
  const handlePageAgentLlmProxy = async (c: Context) => {
    try {
      if (c.req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'content-type, authorization',
          },
        });
      }

      const requestUrl = new URL(c.req.url);
      const referer = c.req.header('referer');
      const previewToken = getPreviewTokenFromRequest(c);
      const previewServiceId = getServiceIdFromReferer(referer);
      const authHeader = c.req.header('Authorization');
      const bindingConfig = bindingCodeManager.readConfig();
      let bindingCode: string | undefined;

      if (authHeader?.startsWith('Bearer ')) {
        const candidate = authHeader.replace('Bearer ', '').trim();
        if (candidate && bindingConfig?.[candidate]) {
          bindingCode = candidate;
        } else {
          console.warn('[page-agent proxy] rejected unknown binding code from authorization header');
        }
      }

      if (!bindingCode && previewToken) {
        const previewSession = getPreviewSession(previewToken, previewServiceId);
        if (previewSession) {
          bindingCode = previewSession.bindingCode;
        }
      }

      if (!bindingCode) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const suffix = requestUrl.pathname.startsWith('/page-agent/llm')
        ? requestUrl.pathname.slice('/page-agent/llm'.length)
        : '';
      const upstreamSearchParams = new URLSearchParams(requestUrl.search);
      upstreamSearchParams.delete('_preview_token');
      const search = upstreamSearchParams.toString();
      const upstreamUrl = `${config.appUrl.replace(/\/$/, '')}/api/page-agent/llm${suffix}${
        search ? `?${search}` : ''
      }`;
      console.log('[page-agent proxy] upstream:', upstreamUrl, {
        viaPreviewSession: Boolean(previewToken),
        previewServiceId,
      });

      const forwardHeaders = new Headers();
      c.req.raw.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (
          lower === 'host' ||
          lower === 'connection' ||
          lower === 'content-length' ||
          lower === 'origin' ||
          lower === 'referer' ||
          lower === 'authorization'
        ) {
          return;
        }
        forwardHeaders.set(key, value);
      });
      forwardHeaders.set('Authorization', `Bearer ${bindingCode}`);

      const contentType = c.req.header('content-type') || '';
      const body =
        c.req.method === 'GET' || c.req.method === 'HEAD'
          ? undefined
          : contentType.includes('application/json') || contentType.includes('text/')
            ? await c.req.text()
            : new Uint8Array(await c.req.arrayBuffer());

      const upstreamResponse = await fetch(upstreamUrl, {
        method: c.req.method,
        headers: forwardHeaders,
        body,
      });
      console.log(
        '[page-agent proxy] response:',
        upstreamResponse.status,
        upstreamResponse.url,
        upstreamResponse.redirected
      );

      const responseHeaders = new Headers();
      upstreamResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'content-length') {
          return;
        }
        responseHeaders.set(key, value);
      });

      const responseBody = await upstreamResponse.arrayBuffer();
      return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Page-agent LLM proxy error:', error);
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Failed to proxy page-agent LLM request',
        },
        502
      );
    }
  };

  app.all('/page-agent/llm', handlePageAgentLlmProxy);
  app.all('/page-agent/llm/*', handlePageAgentLlmProxy);

  app.get('/page-agent/runtime/modules/:moduleName', async (c) => {
    try {
      const moduleName = c.req.param('moduleName');
      const source = await loadPageAgentRuntimeModule(moduleName);

      if (!source) {
        return c.json({ error: 'Page-agent runtime module not found' }, 404);
      }

      return new Response(source, {
        status: 200,
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Page-agent runtime module error:', error);
      return c.json({ error: 'Failed to load page-agent runtime module' }, 500);
    }
  });

  app.get('/page-agent/runtime/vendor/:vendor/*', async (c) => {
    try {
      const vendor = c.req.param('vendor');
      if (vendor !== 'zod' && vendor !== 'chalk') {
        return c.json({ error: 'Unsupported page-agent runtime vendor' }, 404);
      }

      const prefix = `/page-agent/runtime/vendor/${vendor}/`;
      const relativePath = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
      const source = await loadPageAgentRuntimeVendorFile(vendor, relativePath);

      if (!source) {
        return c.json({ error: 'Page-agent runtime vendor file not found' }, 404);
      }

      return new Response(source, {
        status: 200,
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Page-agent runtime vendor error:', error);
      return c.json({ error: 'Failed to load page-agent runtime vendor file' }, 500);
    }
  });

  app.all('/proxy/web/:serviceId/*', async (c) => {
    try {
      const { serviceId } = c.req.param();
      const authHeader = c.req.header('Authorization');
      const reqPath = c.req.path;

      console.log(`[proxy] >>> ${c.req.method} ${reqPath}`);

      // Extract _preview_token from raw URL
      let previewToken: string | undefined;
      const rawUrl = c.req.url;
      const tokenMatch = rawUrl.match(/[?&]_preview_token=([^&]+)/);
      if (tokenMatch) {
        previewToken = decodeURIComponent(tokenMatch[1]);
      }

      // Auth: preview token > active session > binding_code header
      let authorized = false;

      if (previewToken && validatePreviewToken(previewToken, serviceId)) {
        authorized = true;
      } else if (hasActivePreviewSession(serviceId)) {
        authorized = true;
      } else if (authHeader?.startsWith('Bearer ')) {
        const bindingCode = authHeader.replace('Bearer ', '');
        const bconfig = bindingCodeManager.readConfig();
        if (bconfig?.[bindingCode]) {
          authorized = true;
        }
      }

      console.log(
        `[proxy] auth=${authorized} token=${!!previewToken} session=${hasActivePreviewSession(serviceId)} mapSize=${previewSessions.size}`
      );

      if (!authorized) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const service = webServiceScanner.getServiceById(serviceId);

      if (!service) {
        return c.json({ error: 'Service not found' }, 404);
      }
      if (service.status !== 'online') {
        return c.json({ error: 'Service is offline' }, 503);
      }

      // Build target URL — extract path from c.req.path (c.req.param('*') is unreliable)
      const proxyPrefix = `/proxy/web/${serviceId}/`;
      const fullPath = c.req.path;
      const pathParam = fullPath.startsWith(proxyPrefix) ? fullPath.slice(proxyPrefix.length) : '';
      const targetUrl = `${service.protocol}://127.0.0.1:${service.port}/${pathParam}`;

      // Forward headers (exclude host, connection)
      const forwardHeaders: Record<string, string> = {};
      c.req.raw.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== 'host' && lower !== 'connection' && lower !== 'authorization') {
          forwardHeaders[key] = value;
        }
      });
      forwardHeaders['host'] = `127.0.0.1:${service.port}`;

      // Forward request
      const method = c.req.method;
      const body = ['GET', 'HEAD'].includes(method) ? undefined : await c.req.arrayBuffer();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const proxyResp = await fetch(targetUrl, {
          method,
          headers: forwardHeaders,
          body: body ? Buffer.from(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[proxy] target ${targetUrl} => ${proxyResp.status}`);

        const proxyPrefix = `/proxy/web/${serviceId}`;
        const tokenQs = previewToken ? `_preview_token=${previewToken}` : '';

        // Build response headers, removing iframe-blocking headers
        const respHeaders = new Headers();
        proxyResp.headers.forEach((value, key) => {
          const lower = key.toLowerCase();
          if (lower === 'x-frame-options') return;
          if (
            lower === 'content-security-policy' ||
            lower === 'content-security-policy-report-only'
          ) {
            return;
          }
          if (lower === 'transfer-encoding') return;

          // Rewrite Location header for redirects
          if (lower === 'location') {
            let loc = value;
            // Absolute path: /foo → /proxy/web/ws-8080/foo
            if (loc.startsWith('/') && !loc.startsWith('//')) {
              loc = `${proxyPrefix}${loc}`;
              if (tokenQs) loc += (loc.includes('?') ? '&' : '?') + tokenQs;
            }
            // Absolute URL pointing to the target service
            const targetOrigin = `${service.protocol}://127.0.0.1:${service.port}`;
            if (loc.startsWith(targetOrigin)) {
              loc = `${proxyPrefix}${loc.slice(targetOrigin.length)}`;
              if (tokenQs) loc += (loc.includes('?') ? '&' : '?') + tokenQs;
            }
            respHeaders.set(key, loc);
            return;
          }

          // Rewrite Set-Cookie path to include proxy prefix
          if (lower === 'set-cookie') {
            const rewritten = value.replace(
              /;\s*path=\/?([^;]*)/gi,
              (_m, p) => `; path=${proxyPrefix}/${p}`
            );
            respHeaders.append(key, rewritten);
            return;
          }

          respHeaders.set(key, value);
        });

        // For HTML responses, rewrite URLs and inject fetch/XHR interceptor
        const contentType = proxyResp.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          let html = await proxyResp.text();
          html = html.replace(
            /<meta[^>]+http-equiv=["']content-security-policy(?:-report-only)?["'][^>]*>/gi,
            ''
          );

          // Build token suffix for sub-resource URLs
          const tokenSuffix = previewToken ? `?_preview_token=${previewToken}` : '';

          // Inject script to intercept fetch() and XMLHttpRequest for dynamic requests
          const interceptorScript = `<script>(function(){
var P="${proxyPrefix}",T="${previewToken || ''}";
function s(u){
return u==="/page-agent/llm"||u.startsWith("/page-agent/llm/")||u.startsWith("/page-agent/")
}
function r(u){
if(typeof u!=="string")return u;
if(s(u))return u;
if(u.startsWith("/")&&!u.startsWith("//")&&!u.startsWith(P+"/")){
u=P+u;if(T){u+=(u.includes("?")?"&":"?")+"_preview_token="+T}
}return u}
var _f=window.fetch;
window.fetch=function(u,o){
if(typeof u==="string")u=r(u);
else if(u instanceof Request){var nu=r(u.url);if(nu!==u.url)u=new Request(nu,u)}
return _f.call(this,u,o)};
var _o=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
arguments[1]=r(u);return _o.apply(this,arguments)};
})();</script>`;
          const previewBridgeScript = createWebPreviewBridgeScript();

          // Inject interceptor right after <head> (or at start if no <head>)
          const headIdx = html.search(/<head[^>]*>/i);
          if (headIdx !== -1) {
            const headEnd = html.indexOf('>', headIdx) + 1;
            html =
              html.slice(0, headEnd) +
              interceptorScript +
              previewBridgeScript +
              html.slice(headEnd);
          } else {
            html = interceptorScript + previewBridgeScript + html;
          }

          // Rewrite absolute paths in src, href, action attributes
          html = html.replace(
            /(\s(?:src|href|action)=["'])\/(?!\/)(.*?)(["'])/g,
            (_match, prefix, path, quote) => {
              if (path.startsWith('#')) return `${prefix}/${path}${quote}`;
              const separator = path.includes('?') ? '&' : '';
              const token = tokenSuffix
                ? separator
                  ? tokenSuffix.replace('?', '&')
                  : tokenSuffix
                : '';
              return `${prefix}${proxyPrefix}/${path}${token}${quote}`;
            }
          );

          // Rewrite url() in inline styles
          html = html.replace(/url\(["']?\/(?!\/)/g, `url(${proxyPrefix}/`);

          // Update content-length
          const encoded = new TextEncoder().encode(html);
          respHeaders.set('content-length', String(encoded.length));

          return new Response(encoded, {
            status: proxyResp.status,
            headers: respHeaders,
          });
        }

        const respBody = await proxyResp.arrayBuffer();
        return new Response(respBody, {
          status: proxyResp.status,
          headers: respHeaders,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Proxy fetch error:', fetchError);
        return c.json({ error: 'Failed to reach target service' }, 502);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      return c.json({ error: 'Proxy error' }, 500);
    }
  });

  // 服务健康检查端点
  app.get('/health/services', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const healthStatus = serviceHealthChecker.getAllStatus(bindingCode);
      return c.json({
        services: healthStatus,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to get service health status:', error);
      return c.json({ error: 'Failed to get health status' }, 500);
    }
  });

  // 单个服务健康检查端点
  app.get('/health/services/:service', async (c) => {
    const { service } = c.req.param();
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const status = serviceHealthChecker.getServiceStatus(bindingCode, service);
      if (!status) {
        return c.json({ error: `Service "${service}" not found` }, 404);
      }
      return c.json(status);
    } catch (error) {
      console.error(`Failed to get health status for service "${service}":`, error);
      return c.json({ error: 'Failed to get health status' }, 500);
    }
  });

  // MCP服务列表端点
  app.get('/mcp/services', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const services = mcpConnector.getServices(bindingCode);
      return c.json({
        services: services.map((s) => ({
          name: s.name,
          status: s.status,
          command: s.command,
        })),
      });
    } catch (error) {
      console.error('Failed to list MCP services:', error);
      return c.json({ error: 'Failed to list MCP services' }, 500);
    }
  });

  // MCP服务重新加载端点（需要认证）
  app.post('/mcp/reload', async (c) => {
    try {
      const body = await c.req.json();
      const { action, service } = body;

      if (!action) {
        return c.json({ error: 'Action is required' }, 400);
      }

      return c.json({
        success: true,
        message: `MCP service ${action} completed successfully`,
      });
    } catch (error) {
      console.error('MCP reload endpoint error:', error);
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Failed to reload MCP services',
        },
        500
      );
    }
  });

  // MCP 服务端点
  app.all('/mcp', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const aggregator = mcpConnector.getAggregator(bindingCode);
      if (!aggregator) {
        return c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Missing MCP aggregator' },
            id: null,
          },
          { status: 401 }
        );
      }

      try {
        // Get the aggregator's transport
        const transport = await aggregator.getConnectedTransport();
        return transport.handleRequest(c);
      } catch (transportError) {
        console.error('MCP transport error:', transportError);
        return c.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: transportError instanceof Error ? transportError.message : 'Transport error',
            },
            id: null,
          },
          { status: 503 }
        );
      }
    } catch (error) {
      console.error('MCP streamable endpoint error:', error);
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        },
        { status: 500 }
      );
    }
  });

  // ACP会话创建端点
  app.post('/acp/sessions', async (c) => {
    try {
      const [bindingCode, codeConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { agent, envVars, workingDirectory } = body;

      if (!agent || !agent.command) {
        return c.json({ error: 'Agent configuration is required' }, 400);
      }

      // 准备会话配置，优先使用传入的workingDirectory
      const cwd = workingDirectory || codeConfig?.workspaceDir || process.cwd();
      const session = {
        cwd,
        mcpServers: codeConfig?.mcpServices || [],
      };

      // 创建 ACP 会话
      const sessionId = await acpConnector.createSession(
        bindingCode,
        {
          command: agent.command,
          args: agent.args,
          env: envVars,
          authMethodId: agent.authMethodId,
        },
        session
      );

      return c.json({
        success: true,
        sessionId,
        workingDirectory: cwd,
        message: 'ACP session created successfully',
      });
    } catch (error) {
      console.error('ACP session creation error:', error);
      return c.json({ error: 'Failed to create ACP session' }, 500);
    }
  });

  // ACP会话列表端点
  app.get('/acp/sessions', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const sessions = acpConnector.getSessionsByBinding(bindingCode);
      return c.json({
        success: true,
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          status: s.config.status,
          createdAt: s.config.createdAt,
          lastActiveAt: s.config.lastActiveAt,
          agent: s.config.agent,
          isActivated: acpConnector.isSessionActivated(s.sessionId),
        })),
      });
    } catch (error) {
      console.error('ACP sessions list error:', error);
      return c.json({ error: 'Failed to list ACP sessions' }, 500);
    }
  });

  // ACP会话关闭端点
  app.delete('/acp/sessions/:sessionId', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const { sessionId } = c.req.param();
      const success = await acpConnector.closeSession(sessionId);

      if (!success) {
        return c.json({ error: 'Session not found' }, 404);
      }

      return c.json({ success: true, message: 'Session closed successfully' });
    } catch (error) {
      console.error('ACP session close error:', error);
      return c.json({ error: 'Failed to close session' }, 500);
    }
  });

  // ACP会话历史消息获取端点
  app.get('/acp/sessions/:sessionId/messages', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const { sessionId } = c.req.param();
      const session = acpConnector.getSession(sessionId);

      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }

      const messages = acpConnector.getSessionMessages(sessionId);
      return c.json({
        success: true,
        sessionId,
        messages,
        isActivated: acpConnector.isSessionActivated(sessionId),
      });
    } catch (error) {
      console.error('ACP session messages error:', error);
      return c.json({ error: 'Failed to get session messages' }, 500);
    }
  });

  // ACP会话激活端点
  app.post('/acp/sessions/:sessionId/activate', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const { sessionId } = c.req.param();
      const session = acpConnector.getSession(sessionId);

      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }

      // 如果已经激活，直接返回成功
      if (acpConnector.isSessionActivated(sessionId)) {
        return c.json({
          success: true,
          message: 'Session already activated',
          sessionId,
          isActivated: true,
        });
      }

      // 激活会话
      const success = await acpConnector.activateSession(sessionId);

      if (!success) {
        return c.json(
          {
            error: 'Failed to activate session',
            details: session.initError || 'Unknown error',
          },
          503
        );
      }

      return c.json({
        success: true,
        message: 'Session activated successfully',
        sessionId,
        isActivated: true,
      });
    } catch (error) {
      console.error('ACP session activate error:', error);
      return c.json({ error: 'Failed to activate session' }, 500);
    }
  });

  // ACP聊天端点（AI SDK兼容）
  app.post('/acp/chat', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { sessionId, messages } = body;

      if (!sessionId || !messages) {
        return c.json({ error: 'sessionId and messages are required' }, 400);
      }

      // 使用带就绪检查的获取方法
      const session = await acpConnector.getReadySession(sessionId);
      if (!session) {
        const rawSession = acpConnector.getSession(sessionId);
        if (!rawSession) {
          return c.json({ error: 'Session not found' }, 404);
        }
        // 会话存在但未就绪
        return c.json(
          {
            error: 'Session not ready',
            details: rawSession.initError || 'Session is still initializing',
          },
          503
        );
      }

      // 更新会话活跃时间
      acpConnector.updateSessionActivity(sessionId);

      // 保存用户消息到持久化存储
      // messages 是 UIMessage[] 格式，直接保存
      acpConnector.updateSessionMessages(sessionId, messages);

      try {
        // 使用 ACP provider 的 streamText
        const result = streamText({
          model: session.provider!.languageModel(),
          tools: session.provider!.tools,
          stopWhen: stepCountIs(20),
          // Ensure raw chunks like agent plan are included for streaming
          includeRawChunks: true,
          messages: await convertToModelMessages(messages, {
            tools: session.provider!.tools,
            ignoreIncompleteToolCalls: true,
          }),
          onError: (error) => {
            console.error('Error occurred while streaming text:', error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: ({ messages: updatedMessages }) => {
            acpConnector.updateSessionMessages(sessionId, updatedMessages as UIMessage[]);
            console.log(`Saved ${updatedMessages.length} messages for session ${sessionId}`);
          },
          messageMetadata: ({ part }) => {
            // Convert raw parts to metadata for easier UI access
            if (part.type === 'raw' && part.rawValue) {
              try {
                const data = JSON.parse(part.rawValue as string);
                switch (data.type) {
                  case 'plan':
                    return { plan: data.entries };
                  case 'diff':
                    return { diffs: [data] }; // Accumulate multiple diffs
                  case 'terminal':
                    return { terminals: [data] }; // Accumulate terminal outputs
                }
              } catch {
                // 忽略解析错误
              }
            }
          },
          onError: (error) => {
            console.error('Stream error:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (streamError) {
        // 捕获 streamText 的同步错误
        console.error('StreamText error:', streamError);
        return c.json(
          {
            error: 'Failed to process stream',
            details: streamError instanceof Error ? streamError.message : String(streamError),
          },
          500
        );
      }
    } catch (error) {
      console.error('ACP chat error:', error);
      return c.json({ error: 'Failed to process chat' }, 500);
    }
  });

  // 文件列表端点
  app.get('/files/list', async (c) => {
    try {
      const [bindingCode, codeConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      let path = c.req.query('path') || '';
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      // 如果请求的path为空或'/',则使用配置的workspaceDir作为默认路径
      if (!path || path === '/' || path === '') {
        const workspaceDir = codeConfig?.workspaceDir;
        if (workspaceDir) {
          // 确保工作空间目录存在
          try {
            await fs.mkdir(workspaceDir, { recursive: true });
            path = workspaceDir;
          } catch (mkdirError) {
            console.error('Failed to create workspace directory:', mkdirError);
            path = process.cwd();
          }
        } else {
          path = process.cwd();
        }
      }

      const fullPath = pathModule.resolve(path);
      const stats = await fs.stat(fullPath);

      if (!stats.isDirectory()) {
        return c.json({ error: 'Path is not a directory' }, 400);
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = pathModule.join(fullPath, entry.name);
          const entryStat = await fs.stat(entryPath);
          return {
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entryStat.size,
            modified: entryStat.mtime.toISOString(),
          };
        })
      );

      return c.json({ success: true, files, path: fullPath });
    } catch (error) {
      console.error('File list error:', error);
      return c.json({ error: 'Failed to list files' }, 500);
    }
  });

  // 文件读取端点
  app.get('/files/read', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const path = c.req.query('path');
      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);
      const [content, stats] = await Promise.all([
        fs.readFile(fullPath, 'utf-8'),
        fs.stat(fullPath),
      ]);

      return c.json({
        success: true,
        content,
        path: fullPath,
        modified: stats.mtime.toISOString(),
        size: stats.size,
      });
    } catch (error) {
      console.error('File read error:', error);
      return c.json({ error: 'Failed to read file' }, 500);
    }
  });

  // 文件元数据获取端点（仅获取修改时间、大小等，不读取内容）
  app.get('/files/stat', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const path = c.req.query('path');
      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);
      const stats = await fs.stat(fullPath);

      return c.json({
        success: true,
        path: fullPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        accessed: stats.atime.toISOString(),
      });
    } catch (error) {
      console.error('File stat error:', error);
      return c.json({ error: 'Failed to get file stats' }, 500);
    }
  });

  // 文件写入端点
  app.post('/files/write', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path, content } = body;

      if (!path || content === undefined) {
        return c.json({ error: 'Path and content are required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);
      await fs.writeFile(fullPath, content, 'utf-8');

      return c.json({ success: true, message: 'File written successfully' });
    } catch (error) {
      console.error('File write error:', error);
      return c.json({ error: 'Failed to write file' }, 500);
    }
  });

  // 文件/目录创建端点
  app.post('/files/create', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path, type } = body;

      if (!path || !type) {
        return c.json({ error: 'Path and type are required' }, 400);
      }

      if (type !== 'file' && type !== 'directory') {
        return c.json({ error: 'Type must be "file" or "directory"' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);

      if (type === 'directory') {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        // 确保父目录存在
        const dir = pathModule.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        // 创建空文件
        await fs.writeFile(fullPath, '', 'utf-8');
      }

      return c.json({
        success: true,
        message: `${type === 'file' ? 'File' : 'Directory'} created successfully`,
      });
    } catch (error) {
      console.error('File/directory create error:', error);
      return c.json({ error: 'Failed to create file or directory' }, 500);
    }
  });

  // 文件/目录删除端点
  app.delete('/files/delete', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path } = body;

      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);

      // 检查文件/目录是否存在
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }

      return c.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('File/directory delete error:', error);
      return c.json({ error: 'Failed to delete file or directory' }, 500);
    }
  });

  // 文件/目录重命名端点
  app.post('/files/rename', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { oldPath, newPath } = body;

      if (!oldPath || !newPath) {
        return c.json({ error: 'oldPath and newPath are required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullOldPath = pathModule.resolve(oldPath);
      const fullNewPath = pathModule.resolve(newPath);

      // 检查源文件/目录是否存在
      const stats = await fs.stat(fullOldPath);

      // 尝试使用 rename，如果失败则使用 copy + delete（支持跨设备）
      try {
        await fs.rename(fullOldPath, fullNewPath);
      } catch (renameError: any) {
        // EXDEV 错误表示跨设备操作，需要使用 copy + delete
        if (renameError.code === 'EXDEV') {
          if (stats.isDirectory()) {
            // 递归复制目录
            await fs.cp(fullOldPath, fullNewPath, { recursive: true });
            // 删除原目录
            await fs.rm(fullOldPath, { recursive: true, force: true });
          } else {
            // 复制文件
            await fs.copyFile(fullOldPath, fullNewPath);
            // 删除原文件
            await fs.unlink(fullOldPath);
          }
        } else {
          throw renameError;
        }
      }

      return c.json({ success: true, message: 'Renamed successfully' });
    } catch (error) {
      console.error('File/directory rename error:', error);
      return c.json({ error: 'Failed to rename file or directory' }, 500);
    }
  });

  // 文件上传端点（支持二进制文件）
  app.post('/files/upload', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      const targetPath = formData.get('path') as string | null;

      if (!file || !targetPath) {
        return c.json({ error: 'File and path are required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(targetPath);

      // 确保父目录存在
      const dir = pathModule.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // 将文件内容写入目标路径
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(fullPath, buffer);

      return c.json({
        success: true,
        message: 'File uploaded successfully',
        path: fullPath,
        size: buffer.length,
      });
    } catch (error) {
      console.error('File upload error:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }
  });

  // 文件下载端点（返回二进制流）
  app.get('/files/download', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const path = c.req.query('path');
      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);

      // 检查文件是否存在
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return c.json({ error: 'Cannot download a directory' }, 400);
      }

      // 读取文件内容
      const content = await fs.readFile(fullPath);
      const filename = pathModule.basename(fullPath);

      // 设置响应头
      c.header('Content-Type', 'application/octet-stream');
      c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      c.header('Content-Length', String(content.length));

      return c.body(content);
    } catch (error) {
      console.error('File download error:', error);
      return c.json({ error: 'Failed to download file' }, 500);
    }
  });

  // 404处理
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  // 错误处理
  app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}

/**
 * 为 HTTP/HTTPS 服务器设置 WebSocket upgrade 处理
 * 抽取为共享函数，HTTP 和 HTTPS 服务器共用
 */
function setupWebSocketHandlers(server: any): void {
  const terminalWss = new WebSocketServer({ noServer: true });
  const fileWss = new WebSocketServer({ noServer: true });

  // 手动处理 upgrade 请求
  server.on('upgrade', (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === '/terminal') {
      terminalWss.handleUpgrade(request, socket, head, (ws) => {
        terminalWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/files') {
      fileWss.handleUpgrade(request, socket, head, (ws) => {
        fileWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // 终端 WebSocket 连接处理
  terminalWss.on('connection', (ws, req) => {
    console.log('[Server] Terminal WebSocket connected');

    let ptyProcess: pty.IPty | null = null;
    let authenticated = false;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[Server] Received message:', message.type);

        if (message.type === 'auth') {
          const bindingConfig = bindingCodeManager.readConfig();
          if (bindingConfig && bindingConfig[message.token]) {
            authenticated = true;
            const config = bindingConfig[message.token];
            ws.send(JSON.stringify({ type: 'auth', success: true }));

            let workingDir = config.workspaceDir || process.cwd();
            try {
              if (!existsSync(workingDir)) {
                mkdirSync(workingDir, { recursive: true });
              }
            } catch (err) {
              console.error('Failed to create workspace directory:', err);
              workingDir = process.cwd();
            }

            try {
              const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
              ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols: 80,
                rows: 30,
                cwd: workingDir,
                env: process.env as { [key: string]: string },
              });

              console.log('[Server] PTY created:', shell, 'in directory:', workingDir);

              ptyProcess.onData((data) => {
                try {
                  ws.send(JSON.stringify({ type: 'output', data }));
                } catch (sendError) {
                  console.error('Failed to send PTY output:', sendError);
                }
              });

              ptyProcess.onExit(({ exitCode }) => {
                console.log('[Server] PTY exited with code:', exitCode);
                try {
                  ws.close();
                } catch {
                  /* ignore */
                }
              });
            } catch (ptyError) {
              console.error('Failed to create PTY:', ptyError);
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create terminal' }));
              ws.close();
            }
          } else {
            ws.send(JSON.stringify({ type: 'auth', success: false }));
            ws.close();
          }
        } else if (message.type === 'resize') {
          if (ptyProcess && message.cols && message.rows) {
            try {
              ptyProcess.resize(message.cols, message.rows);
              console.log('[Server] Terminal resized to:', message.cols, 'x', message.rows);
            } catch (resizeError) {
              console.error('Failed to resize PTY:', resizeError);
            }
          }
        } else if (message.type === 'input') {
          if (authenticated && ptyProcess) {
            try {
              ptyProcess.write(message.data);
            } catch (e) {
              console.error('Failed to write to PTY:', e);
            }
          }
        }
      } catch (error) {
        console.error('Terminal message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('[Server] Terminal WebSocket disconnected');
      if (ptyProcess) {
        try {
          ptyProcess.kill();
        } catch {
          /* ignore */
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[Server] Terminal WebSocket error:', error);
      if (ptyProcess) {
        try {
          ptyProcess.kill();
        } catch {
          /* ignore */
        }
      }
    });
  });

  // 文件监听 WebSocket 连接处理
  fileWss.on('connection', (ws, req) => {
    console.log('[Server] Files WebSocket connected');

    let authenticated = false;
    let bindingCode = '';
    let watchPath = '';
    let unsubscribe: (() => void) | null = null;

    const sendMessage = (msg: object) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          const config = bindingCodeManager.readConfig();
          if (config && config[message.token]) {
            authenticated = true;
            bindingCode = message.token;
            sendMessage({ type: 'auth', success: true });
            console.log('[Server] Files WebSocket authenticated');
          } else {
            sendMessage({ type: 'auth', success: false });
            ws.close();
          }
        } else if (message.type === 'subscribe' && authenticated) {
          const config = bindingCodeManager.readConfig();
          const bindingConfig = config?.[bindingCode];
          watchPath = message.path || bindingConfig?.workspaceDir || process.cwd();

          if (unsubscribe) {
            unsubscribe();
          }

          unsubscribe = fileWatcherManager.subscribe(watchPath, (event: FileChangeEvent) => {
            sendMessage({
              type: 'file_change',
              event: {
                changeType: event.type,
                path: event.path,
                relativePath: event.relativePath,
                timestamp: event.timestamp,
              },
            });
          });

          sendMessage({ type: 'subscribed', path: watchPath });
          console.log(`[Server] Files WebSocket subscribed to: ${watchPath}`);
        } else if (message.type === 'unsubscribe' && authenticated) {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          sendMessage({ type: 'unsubscribed' });
        }
      } catch (error) {
        console.error('[Server] Files WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('[Server] Files WebSocket disconnected');
      if (unsubscribe) {
        unsubscribe();
      }
    });

    ws.on('error', (error) => {
      console.error('[Server] Files WebSocket error:', error);
      if (unsubscribe) {
        unsubscribe();
      }
    });
  });
}

/**
 * 启动服务器（HTTP + 可选 HTTPS）
 */
export async function startServer(
  config: CLIConfig,
  tlsOptions?: TlsOptions
): Promise<ServerResult> {
  const app = createServer(config);
  const availablePort = await findAvailablePort(config.port);

  const result: ServerResult = { httpPort: availablePort };

  // 启动 HTTP 服务器
  await new Promise<void>((resolve, reject) => {
    try {
      const server = serve({ fetch: app.fetch, port: availablePort }, () => {
        setupWebSocketHandlers(server as any);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });

  // 如果提供了 TLS 选项，额外启动 HTTPS 服务器
  if (tlsOptions) {
    const httpsPort = await findAvailablePort(tlsOptions.httpsPort);
    result.httpsPort = httpsPort;

    await new Promise<void>((resolve, reject) => {
      try {
        const httpsServer = https.createServer(
          { cert: tlsOptions.cert, key: tlsOptions.key },
          async (req, res) => {
            // 使用 Hono 的 fetch handler 处理 HTTPS 请求
            const url = `https://${req.headers.host}${req.url}`;
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }

            const body = ['GET', 'HEAD'].includes(req.method || '')
              ? undefined
              : await new Promise<Buffer>((res) => {
                  const chunks: Buffer[] = [];
                  req.on('data', (chunk) => chunks.push(chunk));
                  req.on('end', () => res(Buffer.concat(chunks)));
                });

            const request = new Request(url, {
              method: req.method,
              headers,
              body,
            });

            const response = await app.fetch(request);

            res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          }
        );

        setupWebSocketHandlers(httpsServer);

        httpsServer.listen(httpsPort, () => {
          resolve();
        });

        httpsServer.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  return result;
}
