/**
 * FilePreview Component
 * 文件预览组件 - 支持图片、PDF、视频等多种格式
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Video, Music, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import type { FileNode, DeviceClientAPI } from '@/hooks/useDeviceClient';

interface FilePreviewProps {
  file: FileNode;
  deviceClient: DeviceClientAPI | null;
  className?: string;
}

export function FilePreview({ file, deviceClient, className = '' }: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 获取文件扩展名
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const ext = getFileExtension(file.name);

  // 判断文件类型
  const fileType = React.useMemo(() => {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
    const pdfExts = ['pdf'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (pdfExts.includes(ext)) return 'pdf';
    return 'text';
  }, [ext]);

  // 加载文件内容
  useEffect(() => {
    const loadFile = async () => {
      if (!deviceClient) {
        toast.error('设备客户端未就绪');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await deviceClient.files.read(file.path);
        setContent(data.content || '');
      } catch (error) {
        toast.error('读取失败', {
          description: error instanceof Error ? error.message : '未知错误',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (fileType === 'text') {
      loadFile();
    } else {
      setIsLoading(false);
    }
  }, [file.path, deviceClient, fileType]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // 图片预览
  if (fileType === 'image') {
    const imageUrl = deviceClient
      ? `${deviceClient.deviceUrl}/files/download?path=${encodeURIComponent(file.path)}`
      : '';
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10">
          <img src={imageUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
        </div>
      </div>
    );
  }

  // 视频预览
  if (fileType === 'video') {
    const videoUrl = deviceClient
      ? `${deviceClient.deviceUrl}/files/download?path=${encodeURIComponent(file.path)}`
      : '';
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
          <video controls className="max-w-full max-h-full">
            <source src={videoUrl} />
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
    );
  }

  // 音频预览
  if (fileType === 'audio') {
    const audioUrl = deviceClient
      ? `${deviceClient.deviceUrl}/files/download?path=${encodeURIComponent(file.path)}`
      : '';
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <audio controls className="w-full max-w-md">
            <source src={audioUrl} />
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>
    );
  }

  // PDF 预览
  if (fileType === 'pdf') {
    const pdfUrl = deviceClient
      ? `${deviceClient.deviceUrl}/files/download?path=${encodeURIComponent(file.path)}`
      : '';
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-full border-0" title={file.name} />
        </div>
      </div>
    );
  }

  // 文本预览
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-muted/10">
        <pre className="text-sm font-mono whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
}
