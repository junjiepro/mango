/**
 * Language Switcher Component
 * T161: Toggle between zh/en via Cookie + API
 */

'use client';

import React, { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Locale, locales } from '@/i18n/config';

const localeLabels: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (target: Locale) => {
    if (target === locale) return;
    document.cookie = `NEXT_LOCALE=${target};path=/;max-age=${365 * 24 * 60 * 60}`;
    fetch('/api/profile/language', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: target }),
    }).catch(() => {});
    startTransition(() => { router.refresh(); });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending} className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span>{localeLabels[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => switchTo(l)}>
            <span className="flex-1">{localeLabels[l]}</span>
            {l === locale && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
