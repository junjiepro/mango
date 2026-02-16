/**
 * MonacoEditor Component
 * Monaco Editor 编辑器组件 - 支持代码编辑和语法高亮
 * User Story 5: 富交互界面与工作区
 *
 * 性能优化:
 * - Monaco模型缓存和复用
 * - 避免重复创建编辑器实例
 * - 优化内容更新策略
 */

'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import Editor, { OnMount, Monaco, BeforeMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import type { editor } from 'monaco-editor';

// 全局Monaco模型缓存
const modelCache = new Map<string, editor.ITextModel>();

// 清理指定路径的模型缓存（关闭标签页时调用）
export function clearModelCache(filePath: string) {
  const model = modelCache.get(filePath);
  if (model && !model.isDisposed()) {
    model.dispose();
  }
  modelCache.delete(filePath);
  console.log(`[MonacoEditor] 清理模型缓存: ${filePath}`);
}

interface MonacoEditorProps {
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  onSave?: (value: string) => void;
  onMount?: (currentValue: string) => void; // 挂载时返回当前内容
  className?: string;
  isVisible?: boolean; // 新增：标识编辑器是否可见
  extraLibs?: Array<{ content: string; filePath?: string }>;
}

export function MonacoEditor({
  value,
  language = 'plaintext',
  path,
  readOnly = false,
  onChange,
  onSave,
  onMount,
  isVisible = true,
  className = '',
  extraLibs,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { theme } = useTheme();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const changeListenerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const saveCommandRef = useRef<string | null>(null); // 保存快捷键的ID

  // 保持onChange引用最新
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // 根据文件路径自动检测语言
  const detectedLanguage = useMemo(() => {
    if (language !== 'plaintext') return language;
    if (!path) return 'plaintext';

    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      md: 'markdown',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      sh: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sql: 'sql',
    };

    return languageMap[ext || ''] || 'plaintext';
  }, [language, path]);

  const handleEditorBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;

    // 定义自定义 light 主题，使用 mango-light 背景色
    monaco.editor.defineTheme('mango-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#faf9f5', // --mango-light
      },
    });

    // 注入额外的类型声明（用于沙盒 API 自动补全）
    if (extraLibs?.length) {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowJs: true,
        checkJs: true,
        allowNonTsExtensions: true,
      });
      for (const lib of extraLibs) {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
          lib.content,
          lib.filePath || `ts:extra-${Date.now()}.d.ts`
        );
      }
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);

    // 配置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 21,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    });

    // 注意：不在这里注册快捷键，而是在下面的useEffect中根据isVisible动态注册
  };

  // 根据可见性动态注册/注销保存快捷键
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // 如果可见，注册快捷键
    if (isVisible && onSave) {
      const commandId = editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          const currentValue = editor.getValue();
          onSave(currentValue);
        }
      );
      saveCommandRef.current = commandId;

      console.log(`[MonacoEditor] 注册快捷键: ${path}`);
    }

    // 清理函数：注销快捷键
    return () => {
      if (saveCommandRef.current) {
        // Monaco没有直接的removeCommand API，但切换标签页时会自动处理
        console.log(`[MonacoEditor] 清理快捷键: ${path}`);
        saveCommandRef.current = null;
      }
    };
  }, [isVisible, isEditorReady, onSave, path]);

  // 使用模型缓存优化性能
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current || !path) {
      return;
    }

    const monaco = monacoRef.current;
    const editor = editorRef.current;

    // 检查是否已有缓存的模型
    let model = modelCache.get(path);
    let isNewModel = false;

    // 检查模型是否已被销毁
    if (model && model.isDisposed()) {
      modelCache.delete(path);
      model = undefined;
    }

    if (!model) {
      // 创建新模型并缓存
      const uri = monaco.Uri.parse(path);
      model = monaco.editor.createModel(value, detectedLanguage, uri);
      modelCache.set(path, model);
      isNewModel = true;
      console.log(`[MonacoEditor] 创建新模型: ${path}`);
    }

    // 设置编辑器使用该模型
    editor.setModel(model);

    // 如果是已存在的模型，且传入的value有内容，需要同步
    // 这处理了关闭标签页后重新打开的情况
    if (!isNewModel && value && model.getValue() !== value) {
      console.log(`[MonacoEditor] 同步模型内容: ${path}`);
      model.setValue(value);
    }

    // 通知父组件当前模型的内容(用于恢复编辑状态)
    if (onMount) {
      onMount(model.getValue());
    }

    // 清理旧的监听器
    if (changeListenerRef.current) {
      changeListenerRef.current.dispose();
    }

    // 绑定新的内容变化监听器
    changeListenerRef.current = editor.onDidChangeModelContent(() => {
      const currentModel = editor.getModel();
      if (currentModel && onChangeRef.current) {
        onChangeRef.current(currentModel.getValue());
      }
    });

    // 清理函数
    return () => {
      // 模型保留在缓存中,不调用 model.dispose()
      // 但要清理监听器
      if (changeListenerRef.current) {
        changeListenerRef.current.dispose();
        changeListenerRef.current = null;
      }
    };
  }, [path, detectedLanguage, isEditorReady, value, onMount]);

  return (
    <div className={`h-full w-full ${className}`}>
      <Editor
        height="100%"
        theme={theme === 'dark' ? 'vs-dark' : 'mango-light'}
        beforeMount={handleEditorBeforeMount}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          selectOnLineNumbers: true,
          roundedSelection: false,
          cursorStyle: 'line',
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">加载编辑器...</div>
          </div>
        }
      />
    </div>
  );
}
