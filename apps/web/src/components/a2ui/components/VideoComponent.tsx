/**
 * Video Component for A2UI
 * 用于展示视频
 */

'use client';

import React from 'react';

interface VideoComponentProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  caption?: string;
  onEvent?: (eventName: string, data: any) => void;
}

export function VideoComponent({
  src,
  poster,
  width,
  height,
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  caption,
  onEvent,
}: VideoComponentProps) {
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border bg-black">
        <video
          src={src}
          poster={poster}
          width={width || '100%'}
          height={height}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          className="w-full"
          onPlay={() => onEvent?.('onPlay', { src })}
          onPause={() => onEvent?.('onPause', { src })}
        />
      </div>
      {caption && (
        <p className="text-sm text-gray-600 text-center">{caption}</p>
      )}
    </div>
  );
}
