'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { learningService, type LearningRule } from '@/services/LearningService';
import { Trash2Icon, DownloadIcon, RefreshCwIcon } from 'lucide-react';

export default function LearningPage() {
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await learningService.getRules();
      setRules(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleDelete = async (ruleId: string) => {
    await learningService.deleteRule(ruleId);
    setRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learning-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">学习规则</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRules}>
            <RefreshCwIcon className="size-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <DownloadIcon className="size-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无学习规则。通过反馈帮助 Agent 学习您的偏好。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function RuleCard({
  rule,
  onDelete,
}: {
  rule: LearningRule;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base">{rule.rule_type}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(rule.id)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-2">
          置信度: {(rule.confidence_score * 100).toFixed(0)}%
        </div>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
          {JSON.stringify(rule.rule_content, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
