/**
 * Video Previewer Component
 * 视频预览器 - 支持多种视频格式和播放控制
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const videoUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  // 静音切换
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // 音量调节
  const handleVolumeChange = useCallback((value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  // 进度调节
  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // 快进/快退
  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      );
    }
  }, [duration]);

  // 全屏
  const handleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  }, []);

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = file.name;
    link.click();
  }, [videoUrl, file.name]);

  // 显示控制条
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // 视频事件处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError('视频加载失败');
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 下载 */}
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

  return (
    <PreviewContainer
      title={file.name}
      icon={<Video className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      {error ? (
        <PreviewError
          message={error}
          description="请检查文件格式是否支持"
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      ) : (
        <div
          className="relative flex-1 bg-black flex items-center justify-center group"
          onMouseMove={showControlsTemporarily}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {isLoading && (
            <div className="absolute inset-0 z-10">
              <PreviewLoading message="加载视频..." />
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full"
            onClick={togglePlay}
            onDoubleClick={handleFullscreen}
          />

          {/* 播放按钮覆盖层 */}
          {!isPlaying && !isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </div>
          )}

          {/* 控制条 */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* 进度条 */}
            <div className="mb-3">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* 播放控制 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => skip(-10)}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => skip(10)}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              {/* 时间显示 */}
              <span className="text-xs text-white/80 min-w-[80px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* 音量控制 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              {/* 全屏 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </PreviewContainer>
  );
}
