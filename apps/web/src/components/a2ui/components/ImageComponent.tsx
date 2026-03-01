/**
 * Image Component for A2UI
 * 用于展示图片
 */

'use client';

import React from 'react';
import Image from 'next/image';

interface ImageComponentProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
  onEvent?: (eventName: string, data: any) => void;
}

export function ImageComponent({
  src,
  alt = 'Image',
  width,
  height,
  caption,
  onEvent,
}: ImageComponentProps) {
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border">
        {width && height ? (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="object-cover"
            onClick={() => onEvent?.('onClick', { src })}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className="w-full h-auto object-cover cursor-pointer"
            onClick={() => onEvent?.('onClick', { src })}
          />
        )}
      </div>
      {caption && (
        <p className="text-sm text-gray-600 text-center">{caption}</p>
      )}
    </div>
  );
}
