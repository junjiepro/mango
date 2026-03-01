/**
 * Audio Previewer Component
 * 音频预览器 - 支持多种音频格式和播放控制
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, Download, SkipBack, SkipForward } from 'lucide-react';
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

export function AudioPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const audioUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  // 静音切换
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // 音量调节
  const handleVolumeChange = useCallback((value: number[]) => {
    if (audioRef.current) {
      const newVolume = value[0];
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  // 进度调节
  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // 快进/快退
  const skip = useCallback(
    (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          Math.min(duration, audioRef.current.currentTime + seconds)
        );
      }
    },
    [duration]
  );

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = file.name;
    link.click();
  }, [audioUrl, file.name]);

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError('音频加载失败');
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
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
      icon={<Music className="h-4 w-4" />}
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
        <div className="flex-1 flex items-center justify-center p-8">
          <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

          {isLoading ? (
            <PreviewLoading message="加载音频..." />
          ) : (
            <div className="w-full max-w-lg">
              {/* 封面/波形图区域 */}
              <div className="aspect-square max-w-[200px] mx-auto mb-8 rounded-lg bg-muted/30 flex items-center justify-center">
                <Music className="h-16 w-16 text-muted-foreground/50" />
              </div>

              {/* 文件名 */}
              <h3 className="text-center text-lg font-medium mb-6 truncate">{file.name}</h3>

              {/* 进度条 */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* 控制按钮 */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => skip(-10)}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  className="h-14 w-14 rounded-full"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => skip(10)}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* 音量控制 */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </PreviewContainer>
  );
}
