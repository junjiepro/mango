'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2Icon } from 'lucide-react';
import type { LearningRule } from '@/services/LearningService';

interface RulesListProps {
  rules: LearningRule[];
  onDelete?: (ruleId: string) => void;
  loading?: boolean;
}

export function RulesList({ rules, onDelete, loading }: RulesListProps) {
  const t = useTranslations('feedback');

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('learning.noRules')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <RuleItem key={rule.id} rule={rule} onDelete={onDelete} />
      ))}
    </div>
  );
}

function RuleItem({
  rule,
  onDelete,
}: {
  rule: LearningRule;
  onDelete?: (id: string) => void;
}) {
  const t = useTranslations('feedback');
  const confidenceColor =
    rule.confidence_score >= 0.8
      ? 'bg-green-100 text-green-800'
      : rule.confidence_score >= 0.5
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-100 text-gray-800';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {formatRuleType(rule.rule_type, t)}
          </CardTitle>
          <Badge variant="outline" className={confidenceColor}>
            {(rule.confidence_score * 100).toFixed(0)}%
          </Badge>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onDelete(rule.id)}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <RuleContent content={rule.rule_content} />
      </CardContent>
    </Card>
  );
}

function RuleContent({ content }: { content: Record<string, unknown> }) {
  const t = useTranslations('feedback');
  const { category, preference, patterns } = content as {
    category?: string;
    preference?: string;
    patterns?: string[];
  };

  return (
    <div className="text-sm space-y-2">
      {category && (
        <div>
          <span className="text-muted-foreground">{t('learning.category')}</span> {category}
        </div>
      )}
      {preference && (
        <div>
          <span className="text-muted-foreground">{t('learning.preference')}</span>{' '}
          {preference === 'positive' ? `👍 ${t('learning.positive')}` : `👎 ${t('learning.negative')}`}
        </div>
      )}
      {patterns && patterns.length > 0 && (
        <div>
          <span className="text-muted-foreground">{t('learning.pattern')}</span>
          <ul className="mt-1 list-disc list-inside text-xs">
            {patterns.slice(0, 3).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatRuleType(type: string, t: ReturnType<typeof useTranslations>): string {
  return type
    .replace('preference_', t('learning.preferencePrefix'))
    .replace('extension_skill', t('learning.extensionSkill'))
    .replace(/_/g, ' ');
}
