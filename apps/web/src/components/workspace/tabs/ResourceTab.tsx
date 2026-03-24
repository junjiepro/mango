'use client';

import React, { useCallback, useState } from 'react';
import { Globe, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { ResourceItem } from '../../resource/ResourceItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ResourceTabProps {
  conversationId?: string;
  resources?: DetectedResource[];
  onResourceClick?: (resource: DetectedResource) => void;
}

function normalizeLinkInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return `https://${trimmed}`;
}

export function ResourceTab({ resources = [], onResourceClick }: ResourceTabProps) {
  const t = useTranslations('workspace');
  const [linkInput, setLinkInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleOpenLink = useCallback(() => {
    const normalizedUrl = normalizeLinkInput(linkInput);
    if (!normalizedUrl) {
      setInputError(t('resourceTab.invalidLink'));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setInputError(t('resourceTab.invalidLink'));
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setInputError(t('resourceTab.invalidLink'));
      return;
    }

    setLinkInput(normalizedUrl);
    setInputError(null);

    onResourceClick?.({
      id: `manual-link-${encodeURIComponent(normalizedUrl)}`,
      type: 'link',
      content: normalizedUrl,
      metadata: {
        url: normalizedUrl,
        domain: parsedUrl.hostname,
        title: parsedUrl.hostname,
      },
      position: {
        start: 0,
        end: normalizedUrl.length,
      },
    });
  }, [linkInput, onResourceClick, t]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleOpenLink();
    },
    [handleOpenLink]
  );

  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-2 text-gray-400">
        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500">{t('resourceTab.empty')}</p>
      <p className="mt-1 text-xs text-gray-400">{t('resourceTab.emptyHint')}</p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <form className="flex items-center space-x-1" onSubmit={handleSubmit}>
          <Input
            type="url"
            value={linkInput}
            onChange={(event) => {
              setLinkInput(event.target.value);
              if (inputError) {
                setInputError(null);
              }
            }}
            placeholder={t('resourceTab.inputLinkPlaceholder')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={!linkInput.trim() || !onResourceClick}>
            <Link2 className="h-4 w-4" />
          </Button>
          {inputError ? <p className="text-xs text-destructive">{inputError}</p> : null}
        </form>
      </div>

      {resources.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollArea className="h-full flex-1">
          <div className="w-full min-w-0 space-y-0.5 p-2">
            {resources.map((resource) => (
              <ResourceItem key={resource.id} resource={resource} onClick={onResourceClick} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
