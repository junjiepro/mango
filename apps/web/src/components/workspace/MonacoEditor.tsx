/**
 * MonacoEditor Component
 * Monaco Editor 编辑器组件 - 支持代码编辑和语法高亮
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, Monaco, BeforeMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import type { editor } from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  onSave?: (value: string) => void;
  className?: string;
}

export function MonacoEditor({
  value,
  language = 'plaintext',
  path,
  readOnly = false,
  onChange,
  onSave,
  className = '',
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const [isEditorReady, setIsEditorReady] = useState(false);

  // 根据文件路径自动检测语言
  const detectedLanguage = React.useMemo(() => {
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
    // 定义自定义 light 主题，使用 mango-light 背景色
    monaco.editor.defineTheme('mango-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#faf9f5', // --mango-light
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
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

    // 注册保存快捷键 (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentValue = editor.getValue();
      onSave?.(currentValue);
    });
  };

  return (
    <div className={`h-full w-full ${className}`}>
      <Editor
        height="100%"
        language={detectedLanguage}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'mango-light'}
        onChange={onChange}
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
