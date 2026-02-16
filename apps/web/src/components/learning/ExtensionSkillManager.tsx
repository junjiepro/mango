'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2Icon, SparklesIcon } from 'lucide-react';

interface ExtensionSkill {
  id: string;
  name: string;
  description: string;
  confidence: number;
  enabled: boolean;
}

interface ExtensionSkillManagerProps {
  userId: string;
}

export function ExtensionSkillManager({ userId }: ExtensionSkillManagerProps) {
  const [skills, setSkills] = useState<ExtensionSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learning/rules');
      const data = await res.json();
      const extensionSkills = data.rules
        ?.filter((r: any) => r.rule_type === 'extension_skill')
        .map((r: any) => ({
          id: r.id,
          name: r.rule_content?.name || 'Unknown',
          description: r.rule_content?.description || '',
          confidence: r.confidence_score,
          enabled: true,
        })) || [];
      setSkills(extensionSkills);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (id: string) => {
    setSkills(skills.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const deleteSkill = async (id: string) => {
    await fetch(`/api/learning/cleanup?ruleId=${id}`, { method: 'DELETE' });
    setSkills(skills.filter((s) => s.id !== id));
  };

  if (loading) {
    return <div className="text-center py-4">加载中...</div>;
  }

  if (skills.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <SparklesIcon className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            暂无扩展技能。通过反馈帮助 Agent 学习。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onToggle={() => toggleSkill(skill.id)}
          onDelete={() => deleteSkill(skill.id)}
        />
      ))}
    </div>
  );
}

function SkillCard({
  skill,
  onToggle,
  onDelete,
}: {
  skill: ExtensionSkill;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={!skill.enabled ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-yellow-500" />
          <CardTitle className="text-sm">{skill.name}</CardTitle>
          <Badge variant="outline">
            {(skill.confidence * 100).toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={skill.enabled} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </CardHeader>
      {skill.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{skill.description}</p>
        </CardContent>
      )}
    </Card>
  );
}
