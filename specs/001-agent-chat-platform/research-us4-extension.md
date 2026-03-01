# User Story 4 扩展研究补充文档

**研究日期**: 2026-01-06
**主文档**: research.md

本文档是 research.md 的补充，专门针对 User Story 4 的扩展需求进行深入研究。

## 扩展 Skill 生成算法（续）

### 扩展 Skill 生成流程实现

```typescript
class ExtensionSkillGenerator {
  // 分析反馈,生成扩展 Skill
  async generateExtensionSkills(
    feedbacks: FeedbackRecord[],
    threshold: number = 5
  ): Promise<Skill[]> {
    // 1. 聚类相似反馈
    const clusters = this.clusterFeedbacks(feedbacks);

    const skills: Skill[] = [];

    for (const cluster of clusters) {
      // 2. 判断是否达到生成阈值
      if (cluster.feedbacks.length < threshold) {
        continue;
      }

      // 3. 提取共同模式
      const pattern = this.extractPattern(cluster);

      // 4. 生成 Skill
      const skill = await this.createExtensionSkill(pattern, cluster);
      skills.push(skill);
    }

    return skills;
  }

  // 聚类相似反馈
  private clusterFeedbacks(feedbacks: FeedbackRecord[]): FeedbackCluster[] {
    const clusters: Map<string, FeedbackCluster> = new Map();

    for (const feedback of feedbacks) {
      // 基于用户意图和工具使用聚类
      const key = `${feedback.userIntent}:${feedback.toolsUsed.sort().join(',')}`;

      if (!clusters.has(key)) {
        clusters.set(key, {
          key,
          userIntent: feedback.userIntent,
          toolsUsed: feedback.toolsUsed,
          feedbacks: [],
          avgRating: 0,
        });
      }

      clusters.get(key)!.feedbacks.push(feedback);
    }

    // 计算平均评分
    for (const cluster of clusters.values()) {
      cluster.avgRating = cluster.feedbacks.reduce((sum, f) => sum + f.rating, 0) / cluster.feedbacks.length;
    }

    return Array.from(clusters.values());
  }

  // 提取行为模式
  private extractPattern(cluster: FeedbackCluster): BehaviorPattern {
    const isGoodPractice = cluster.avgRating >= 4;

    return {
      userIntent: cluster.userIntent,
      toolsUsed: cluster.toolsUsed,
      type: isGoodPractice ? 'good' : 'bad',
      confidence: this.calculateConfidence(cluster),
      examples: cluster.feedbacks.slice(0, 3).map(f => ({
        action: f.agentAction,
        outcome: f.agentSelfAssessment?.actualOutcome || '',
        rating: f.rating,
      })),
    };
  }

  // 创建扩展 Skill
  private async createExtensionSkill(
    pattern: BehaviorPattern,
    cluster: FeedbackCluster
  ): Promise<Skill> {
    const skillName = pattern.type === 'good'
      ? `✅ ${pattern.userIntent} - 推荐做法`
      : `❌ ${pattern.userIntent} - 避免做法`;

    const description = pattern.type === 'good'
      ? `当用户意图是"${pattern.userIntent}"时,推荐使用以下方法`
      : `当用户意图是"${pattern.userIntent}"时,避免使用以下方法`;

    return {
      id: `extension:${pattern.type}:${generateId()}`,
      name: skillName,
      description,
      category: 'remote',
      priority: pattern.type === 'good' ? 8 : 9, // 负向案例优先级更高
      tags: ['extension', pattern.type, pattern.userIntent],
      triggerConditions: {
        userIntent: [pattern.userIntent],
      },
      tools: [], // 扩展 Skill 不提供工具,仅提供指导
      metadata: {
        pattern,
        examples: pattern.examples,
        confidence: pattern.confidence,
        sampleSize: cluster.feedbacks.length,
      },
    };
  }

  // 计算置信度
  private calculateConfidence(cluster: FeedbackCluster): number {
    // 基于样本数量和评分一致性
    const sampleScore = Math.min(cluster.feedbacks.length / 10, 1) * 0.5;

    const ratings = cluster.feedbacks.map(f => f.rating);
    const variance = this.calculateVariance(ratings);
    const consistencyScore = (1 - variance / 4) * 0.5; // 评分方差越小,一致性越高

    return sampleScore + consistencyScore;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }
}
```

### 扩展 Skill 注入到提示词

```typescript
function buildPromptWithExtensionSkills(
  basePrompt: string,
  extensionSkills: Skill[],
  context: ConversationContext
): string {
  const goodPractices = extensionSkills.filter(s => s.metadata.pattern.type === 'good');
  const badPractices = extensionSkills.filter(s => s.metadata.pattern.type === 'bad');

  let prompt = basePrompt;

  if (goodPractices.length > 0) {
    prompt += `\n\n# 推荐做法 (基于用户反馈)\n\n`;
    for (const skill of goodPractices) {
      prompt += `## ${skill.name}\n\n`;
      prompt += `${skill.description}\n\n`;
      prompt += `**成功案例**:\n`;
      for (const example of skill.metadata.examples) {
        prompt += `- ${example.action} (评分: ${example.rating}/5)\n`;
      }
      prompt += `\n`;
    }
  }

  if (badPractices.length > 0) {
    prompt += `\n\n# ⚠️ 避免做法 (基于用户反馈)\n\n`;
    for (const skill of badPractices) {
      prompt += `## ${skill.name}\n\n`;
      prompt += `${skill.description}\n\n`;
      prompt += `**失败案例**:\n`;
      for (const example of skill.metadata.examples) {
        prompt += `- ${example.action} (评分: ${example.rating}/5)\n`;
      }
      prompt += `\n`;
    }
  }

  return prompt;
}
```

## 技术参考：mcp-use 和 mcp-ui

### mcp-use 研究

**项目地址**: https://github.com/modelcontextprotocol/mcp-use

**核心功能**:
- 简化 MCP 客户端的使用
- 提供 React Hooks 风格的 API
- 自动管理连接生命周期

**示例用法**:

```typescript
import { useMCP } from 'mcp-use';

function MyComponent() {
  const { tools, callTool, resources, readResource } = useMCP({
    serverUrl: 'http://localhost:3000/mcp',
  });

  const handleCallTool = async () => {
    const result = await callTool('my_tool', { arg1: 'value' });
    console.log(result);
  };

  return (
    <div>
      <h2>Available Tools</h2>
      {tools.map(tool => (
        <div key={tool.name}>{tool.name}</div>
      ))}
    </div>
  );
}
```

**对 Mango 的启发**:
- 可以创建类似的 `useSkill` Hook
- 简化 Skill 调用的前端代码
- 统一的错误处理和加载状态

### mcp-ui 研究

**项目地址**: https://github.com/modelcontextprotocol/mcp-ui

**核心功能**:
- MCP Resource 的 UI 渲染
- 支持多种 MIME 类型
- 可扩展的渲染器架构

**架构设计**:

```typescript
interface MCPUIRenderer {
  mimeType: string;
  render(resource: MCPResource): React.ReactNode;
}

const renderers: MCPUIRenderer[] = [
  {
    mimeType: 'application/vnd.a2ui+json',
    render: (resource) => {
      const schema = JSON.parse(resource.text);
      return <A2UIRenderer schema={schema} />;
    },
  },
  {
    mimeType: 'text/markdown',
    render: (resource) => {
      return <MarkdownRenderer content={resource.text} />;
    },
  },
];
```

**对 Mango 的启发**:
- MiniApp 的 UI Resource 可以使用类似架构
- 支持多种 UI 格式 (A2UI, Markdown, HTML)
- 可扩展的渲染器系统

## 决策总结

### 扩展 Skill 机制

**采用方案**: 自动化扩展 Skill 生成
- ✅ 基于真实用户反馈
- ✅ 自动聚类和模式识别
- ✅ 正向/负向案例分离
- ✅ 置信度评估

**优势**:
- 持续改进: 随着反馈积累,Skill 质量提升
- 个性化: 每个用户有独立的扩展 Skill
- 可解释: 提供具体案例支持
- 可控: 用户可查看和删除扩展 Skill

---

**研究完成日期**: 2026-01-06
