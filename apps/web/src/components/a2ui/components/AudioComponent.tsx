/**
 * Audio Component for A2UI
 * 用于播放音频
 */

'use client';

import React from 'react';

interface AudioComponentProps {
  src: string;
  title?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  onEvent?: (eventName: string, data: any) => void;
}

export function AudioComponent({
  src,
  title,
  controls = true,
  autoplay = false,
  loop = false,
  onEvent,
}: AudioComponentProps) {
  return (
    <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
      {title && (
        <p className="text-sm font-medium text-gray-900">{title}</p>
      )}
      <audio
        src={src}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        className="w-full"
        onPlay={() => onEvent?.('onPlay', { src })}
        onPause={() => onEvent?.('onPause', { src })}
      />
    </div>
  );
}
