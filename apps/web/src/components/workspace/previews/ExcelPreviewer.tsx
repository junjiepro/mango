/**
 * Excel Previewer Component
 * Excel 表格预览器 - 使用 SheetJS 解析 + LuckySheet 渲染
 * 支持本地预览，无需公网 URL
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

type ViewMode = 'spreadsheet' | 'raw';

// LuckySheet 配置类型
interface LuckySheetOptions {
  container: string;
  data: LuckySheetData[];
  showtoolbar?: boolean;
  showinfobar?: boolean;
  showsheetbar?: boolean;
  showstatisticBar?: boolean;
  sheetBottomConfig?: boolean;
  allowEdit?: boolean;
  enableAddRow?: boolean;
  enableAddBackTop?: boolean;
  showConfigWindowResize?: boolean;
  forceCalculation?: boolean;
  lang?: string;
}

interface LuckySheetData {
  name: string;
  color?: string;
  index?: number;
  status?: number;
  order?: number;
  hide?: number;
  row?: number;
  column?: number;
  defaultRowHeight?: number;
  defaultColWidth?: number;
  celldata?: LuckySheetCell[];
  config?: Record<string, unknown>;
}

interface LuckySheetCell {
  r: number;
  c: number;
  v: {
    v?: string | number | boolean | null;
    m?: string;
    ct?: { fa?: string; t?: string };
    bg?: string;
    fc?: string;
    ff?: string;
    fs?: number;
    bl?: number;
    it?: number;
  } | string | number | boolean | null;
}

// 全局 LuckySheet 引用
declare global {
  interface Window {
    luckysheet?: {
      create: (options: LuckySheetOptions) => void;
      destroy: () => void;
    };
  }
}

// 将 SheetJS 数据转换为 LuckySheet 格式
function convertToLuckySheet(workbook: import('xlsx').WorkBook): LuckySheetData[] {
  const XLSX = require('xlsx');

  return workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const celldata: LuckySheetCell[] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];

        if (cell) {
          celldata.push({
            r,
            c,
            v: {
              v: cell.v,
              m: cell.w || String(cell.v ?? ''),
            },
          });
        }
      }
    }

    return {
      name,
      index,
      status: index === 0 ? 1 : 0,
      order: index,
      row: Math.max(range.e.r + 1, 50),
      column: Math.max(range.e.c + 1, 26),
      celldata,
    };
  });
}

export function ExcelPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [allSheetsData, setAllSheetsData] = useState<(string | number | boolean | null)[][][]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [luckyData, setLuckyData] = useState<LuckySheetData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('raw');
  const [luckyLoaded, setLuckyLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const luckyContainerId = useRef(`luckysheet-${Date.now()}`);
  const fileUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 当前工作表数据
  const rawData = allSheetsData[currentSheetIndex] || [];

  // 加载 LuckySheet CSS 和 JS
  const loadLuckySheet = useCallback(async () => {
    if (luckyLoaded || typeof window === 'undefined') return;

    // 检查是否已加载
    if (window.luckysheet) {
      setLuckyLoaded(true);
      return;
    }

    // 加载 CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/css/pluginsCss.css';
    document.head.appendChild(cssLink);

    const cssLink2 = document.createElement('link');
    cssLink2.rel = 'stylesheet';
    cssLink2.href = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/plugins.css';
    document.head.appendChild(cssLink2);

    const cssLink3 = document.createElement('link');
    cssLink3.rel = 'stylesheet';
    cssLink3.href = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/css/luckysheet.css';
    document.head.appendChild(cssLink3);

    const cssLink4 = document.createElement('link');
    cssLink4.rel = 'stylesheet';
    cssLink4.href = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/assets/iconfont/iconfont.css';
    document.head.appendChild(cssLink4);

    // 加载 JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/plugins/js/plugin.js';
    document.body.appendChild(script);

    await new Promise((resolve) => (script.onload = resolve));

    const script2 = document.createElement('script');
    script2.src = 'https://cdn.jsdelivr.net/npm/luckysheet/dist/luckysheet.umd.js';
    document.body.appendChild(script2);

    await new Promise((resolve) => (script2.onload = resolve));

    setLuckyLoaded(true);
  }, [luckyLoaded]);

  // 加载并解析 Excel
  const loadDocument = useCallback(async () => {
    if (!deviceClient) {
      setError('设备客户端未就绪');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${deviceClient.deviceBindingCode}` },
      });

      if (!response.ok) throw new Error('文件加载失败');

      const arrayBuffer = await response.arrayBuffer();
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // 保存工作表名称
      setSheetNames(workbook.SheetNames);

      // 转换为 LuckySheet 格式
      const luckySheetData = convertToLuckySheet(workbook);
      setLuckyData(luckySheetData);

      // 保存所有工作表的原始数据用于简单表格视图
      const allData = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
          sheet,
          { header: 1, defval: null }
        );
      });
      setAllSheetsData(allData);
      setCurrentSheetIndex(0);
    } catch (err) {
      console.error('Excel 预览错误:', err);
      setError(err instanceof Error ? err.message : '文件加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, deviceClient]);

  // 初始化加载
  useEffect(() => {
    loadDocument();
    loadLuckySheet();
  }, [loadDocument, loadLuckySheet]);

  // 初始化 LuckySheet
  useEffect(() => {
    if (!luckyLoaded || !luckyData || viewMode !== 'spreadsheet') return;
    if (!window.luckysheet) return;

    // 延迟初始化确保 DOM 已渲染
    const timer = setTimeout(() => {
      try {
        window.luckysheet?.destroy();
        window.luckysheet?.create({
          container: luckyContainerId.current,
          data: luckyData,
          showtoolbar: false,
          showinfobar: false,
          showsheetbar: sheetNames.length > 1,
          showstatisticBar: false,
          allowEdit: false,
          enableAddRow: false,
          enableAddBackTop: false,
          lang: 'zh',
        });
      } catch (e) {
        console.error('LuckySheet 初始化失败:', e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      try {
        window.luckysheet?.destroy();
      } catch {}
    };
  }, [luckyLoaded, luckyData, viewMode, sheetNames.length]);

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    link.click();
  }, [fileUrl, file.name]);

  // 工具栏
  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 视图切换 */}
        <div className="flex items-center gap-1 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'spreadsheet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('spreadsheet')}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>表格视图</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('raw')}
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>简单视图</TooltipContent>
          </Tooltip>
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadDocument}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>下载</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  // 加载状态
  if (isLoading) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<FileSpreadsheet className="h-4 w-4" />}
        className={className}
      >
        <PreviewLoading message="正在解析 Excel 文件..." />
      </PreviewContainer>
    );
  }

  // 错误状态
  if (error) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<FileSpreadsheet className="h-4 w-4" />}
        toolbar={toolbar}
        className={className}
      >
        <PreviewError message="文件加载失败" description={error} onRetry={loadDocument} />
      </PreviewContainer>
    );
  }

  // 获取最大列数
  const maxCols = rawData.length > 0 ? Math.max(...rawData.map((row) => row.length)) : 0;

  return (
    <PreviewContainer
      title={file.name}
      icon={<FileSpreadsheet className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      {viewMode === 'spreadsheet' ? (
        <div ref={containerRef} className="flex-1 relative min-h-0">
          {!luckyLoaded ? (
            <PreviewLoading message="加载表格组件..." />
          ) : (
            <div
              id={luckyContainerId.current}
              className="absolute inset-0"
              style={{ margin: 0, padding: 0, width: '100%', height: '100%' }}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted">
                <th className="border border-border px-2 py-1 text-center text-xs text-muted-foreground w-12 bg-muted">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <th
                    key={i}
                    className="border border-border px-3 py-1 text-center text-xs font-medium text-muted-foreground min-w-[80px] bg-muted"
                  >
                    {String.fromCharCode(65 + (i % 26))}
                    {i >= 26 ? Math.floor(i / 26) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/50">
                  <td className="border border-border px-2 py-1 text-center text-xs text-muted-foreground bg-muted/50">
                    {rowIndex + 1}
                  </td>
                  {Array.from({ length: maxCols }).map((_, colIndex) => {
                    const val = row[colIndex];
                    const display = val === null || val === undefined ? '' : String(val);
                    return (
                      <td
                        key={colIndex}
                        className="border border-border px-3 py-1 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                        title={display}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* 底部状态栏 */}
      <div className="shrink-0 border-t bg-muted/20">
        {/* 简单视图模式下显示工作表切换标签 */}
        {viewMode === 'raw' && sheetNames.length > 1 && (
          <div className="flex items-center gap-1 px-2 py-1 border-b overflow-x-auto">
            {sheetNames.map((name, index) => (
              <button
                key={index}
                onClick={() => setCurrentSheetIndex(index)}
                className={`px-3 py-1 text-xs rounded-t whitespace-nowrap transition-colors ${
                  index === currentSheetIndex
                    ? 'bg-background text-foreground border border-b-0 border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {/* 统计信息 */}
        <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-4">
          <span>工作表: {sheetNames.length}</span>
          <span>行数: {rawData.length}</span>
          <span>列数: {maxCols}</span>
        </div>
      </div>
    </PreviewContainer>
  );
}