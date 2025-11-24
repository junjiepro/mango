<!--
  Sync Impact Report
  ===================
  Version change: N/A (initial) → 1.0.0

  Modified principles: N/A (initial creation)

  Added sections:
  - Core Principles (4 principles)
    - I. Code Quality First
    - II. Testing Standards
    - III. User Experience Consistency
    - IV. Performance Requirements
  - Quality Gates (new section)
  - Development Workflow (new section)
  - Governance

  Removed sections: N/A (initial creation)

  Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ No updates needed (Constitution Check section is placeholder-based)
  - .specify/templates/spec-template.md: ✅ No updates needed (aligns with UX and testing requirements)
  - .specify/templates/tasks-template.md: ✅ No updates needed (supports testing workflow and quality gates)
  - .specify/templates/checklist-template.md: ✅ No updates needed (generic template)

  Follow-up TODOs: None
-->

# Mango Constitution

## Core Principles

### I. Code Quality First

代码质量是项目长期可维护性的基础，所有提交的代码 MUST 满足以下标准：

- **可读性**：代码 MUST 具有清晰的命名、适当的注释和一致的格式化
- **单一职责**：每个函数、类或模块 MUST 只负责一个明确的功能（SRP）
- **低耦合高内聚**：模块之间 MUST 保持松散耦合，模块内部 MUST 保持高度内聚
- **无重复**：相同的逻辑 MUST NOT 在代码库中重复出现超过两次（DRY）
- **静态分析**：所有代码 MUST 通过配置的 linter 和类型检查工具，零警告提交
- **代码审查**：所有代码变更 MUST 经过至少一人审查后方可合并

**原则依据**：高质量代码减少技术债务，降低长期维护成本，提升团队协作效率。

### II. Testing Standards

测试是质量保证的核心手段，项目 MUST 遵循以下测试规范：

- **测试覆盖率**：核心业务逻辑 MUST 达到 80% 以上的语句覆盖率
- **测试金字塔**：测试分布 SHOULD 遵循金字塔模型（单元测试 > 集成测试 > 端到端测试）
- **测试隔离**：每个测试用例 MUST 独立运行，不依赖其他测试的执行顺序或状态
- **测试命名**：测试用例命名 MUST 清晰描述测试场景和预期行为
- **边界测试**：关键功能 MUST 包含边界条件和异常场景的测试
- **持续集成**：所有测试 MUST 在 CI 流水线中自动执行，测试失败 MUST 阻止合并

**原则依据**：完善的测试体系能够快速发现回归问题，为重构提供安全网，确保功能的稳定性。

### III. User Experience Consistency

用户体验的一致性直接影响产品的专业性和用户满意度：

- **设计规范**：所有 UI 组件 MUST 遵循统一的设计系统和样式指南
- **交互一致性**：相同类型的交互 MUST 在整个应用中保持一致的行为模式
- **响应反馈**：用户操作 MUST 在 100ms 内提供视觉反馈
- **错误处理**：错误信息 MUST 对用户友好、可操作，并提供解决建议
- **可访问性**：界面 SHOULD 满足 WCAG 2.1 AA 级别的可访问性标准
- **跨平台一致**：多平台应用 MUST 保持核心体验的一致性，同时尊重平台惯例

**原则依据**：一致的用户体验降低学习成本，建立用户信任，提升产品的整体质量感知。

### IV. Performance Requirements

性能是用户体验的关键组成部分，系统 MUST 满足以下性能标准：

- **首屏加载**：首屏内容 MUST 在 2 秒内完成渲染（良好网络条件下）
- **交互响应**：用户交互 MUST 在 100ms 内开始响应，300ms 内完成
- **API 响应**：常规 API 请求 MUST 在 500ms 内返回响应（p95）
- **内存效率**：应用 MUST NOT 出现内存泄漏，长时间运行后内存占用 SHOULD 保持稳定
- **性能监控**：关键性能指标 MUST 被持续监控和记录
- **性能预算**：新功能 MUST NOT 导致核心性能指标下降超过 10%

**原则依据**：良好的性能提升用户体验，减少用户流失，是产品竞争力的重要体现。

## Quality Gates

质量关卡是确保代码质量的检查点，代码变更在到达目标分支前 MUST 通过以下关卡：

### 提交前检查

- 代码格式化检查（自动化）
- Lint 规则检查（零警告）
- 类型检查通过（如适用）
- 提交信息符合规范

### 合并前检查

- 所有自动化测试通过
- 代码审查获得批准
- 无未解决的审查意见
- 变更符合宪法原则

### 发布前检查

- 集成测试全部通过
- 性能基准测试通过
- 安全扫描无高危漏洞
- 文档同步更新

## Development Workflow

开发流程 MUST 遵循以下规范以确保代码质量和团队协作效率：

### 分支策略

- **main**: 生产就绪代码，MUST 始终保持可部署状态
- **feature/***: 功能开发分支，从 main 创建，完成后合并回 main
- **fix/***: 问题修复分支，从 main 创建，完成后合并回 main

### 提交规范

提交信息 MUST 遵循 Conventional Commits 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 代码审查标准

- 审查者 MUST 检查代码是否符合宪法原则
- 审查者 MUST 验证测试覆盖是否充分
- 审查者 SHOULD 提供建设性的改进建议
- 作者 MUST 回应所有审查意见

## Governance

本宪法是项目的最高规范性文件，所有开发活动 MUST 遵守宪法规定。

### 修订程序

1. 修订提案 MUST 以书面形式提出，说明修订原因和预期影响
2. 修订 MUST 经过团队讨论并达成共识
3. 重大修订 MUST 提供迁移计划
4. 所有修订 MUST 更新版本号并记录修订日期

### 版本控制

版本号遵循语义化版本规范：

- **MAJOR**: 原则删除或重大重定义（不向后兼容）
- **MINOR**: 新增原则或章节，或对现有指导进行实质性扩展
- **PATCH**: 澄清、措辞修正、非语义性优化

### 合规审查

- 所有代码审查 MUST 包含宪法合规性检查
- 定期审计 SHOULD 验证项目实践与宪法的一致性
- 违反宪法的代码 MUST NOT 合并到主分支

**Version**: 1.0.0 | **Ratified**: 2025-01-24 | **Last Amended**: 2025-01-24
