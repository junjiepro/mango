/**
 * E2E Tests: US4 Agent 持续学习与改进
 * 测试 6 个验收场景
 */

import { test, expect } from '@playwright/test'

test.describe('US4: Agent 持续学习与改进', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // 场景 1: 用户偏好格式学习
  test('Agent 应该学习用户偏好的输出格式', async ({ page }) => {
    // 1. 进入对话页面
    await page.goto('/conversations/test-conversation-id')

    // 2. 用户发送消息，Agent 回复
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('请列出今天的待办事项')
    await page.click('button[aria-label="发送"]')

    // 3. 等待 Agent 回复
    await expect(
      page.locator('.message-item[data-sender="agent"]')
    ).toBeVisible({ timeout: 15000 })

    // 4. 用户提交负面反馈："希望用表格展示"
    const agentMessage = page.locator('.message-item[data-sender="agent"]').last()
    await agentMessage.hover()
    await agentMessage.locator('button[aria-label="反馈"]').click()

    // 选择负面反馈
    await page.click('button[data-rating="negative"]')
    await page.fill('textarea[placeholder*="反馈"]', '希望用表格展示数据')
    await page.click('button:has-text("提交")')

    // 5. 验证反馈已提交
    await expect(page.locator('text=反馈已提交')).toBeVisible()

    // 6. 用户再次发送类似请求
    await messageInput.fill('请列出本周的会议安排')
    await page.click('button[aria-label="发送"]')

    // 7. 验证 Agent 使用表格格式回复
    const newAgentMessage = page.locator('.message-item[data-sender="agent"]').last()
    await expect(newAgentMessage).toBeVisible({ timeout: 15000 })
    // 检查是否包含表格元素
    await expect(
      newAgentMessage.locator('table, .markdown-table')
    ).toBeVisible({ timeout: 5000 })
  })

  // 场景 2: 负面反馈记录
  test('Agent 应该记录负面反馈并改进', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. Agent 完成任务
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('帮我写一段代码')
    await page.click('button[aria-label="发送"]')

    await expect(
      page.locator('.message-item[data-sender="agent"]')
    ).toBeVisible({ timeout: 15000 })

    // 2. 用户点击"不满意"按钮
    const agentMessage = page.locator('.message-item[data-sender="agent"]').last()
    await agentMessage.hover()
    await agentMessage.locator('button[aria-label="反馈"]').click()
    await page.click('button[data-rating="negative"]')

    // 3. 用户填写反馈原因
    await page.fill('textarea[placeholder*="反馈"]', '代码缺少注释，不够清晰')
    await page.click('button:has-text("提交")')

    // 4. 验证反馈已保存
    await expect(page.locator('text=反馈已提交')).toBeVisible()

    // 验证可以在学习页面看到此反馈
    await page.goto('/learning')
    await expect(
      page.locator('text=代码缺少注释')
    ).toBeVisible({ timeout: 5000 })
  })

  // 场景 3: 学习记录管理
  test('用户可以查看和删除学习记录', async ({ page }) => {
    // 1. 导航到学习总结页面
    await page.goto('/learning')

    // 2. 验证显示学习规则列表
    await expect(page.locator('.learning-rules-list')).toBeVisible()
    const ruleItems = page.locator('.learning-rule-item')
    const initialCount = await ruleItems.count()
    expect(initialCount).toBeGreaterThan(0)

    // 3. 点击删除按钮
    const firstRule = ruleItems.first()
    await firstRule.hover()
    await firstRule.locator('button[aria-label="删除"]').click()

    // 4. 确认删除
    await page.click('button:has-text("确认删除")')

    // 5. 验证规则已删除
    await expect(ruleItems).toHaveCount(initialCount - 1)
  })

  // 场景 4: Skill 语义搜索性能
  test('Skill 语义搜索响应时间 <200ms', async ({ page, request }) => {
    // 直接调用 API 测试响应时间
    const startTime = performance.now()

    const response = await request.post('/api/skills/search', {
      data: { query: '待办事项管理' },
    })

    const endTime = performance.now()
    const responseTime = endTime - startTime

    expect(response.ok()).toBeTruthy()
    expect(responseTime).toBeLessThan(200)

    const data = await response.json()
    expect(data.results).toBeDefined()
  })

  // 场景 5: MiniApp MCP 调用
  test('Agent 可以调用 MiniApp 工具', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 用户请求使用待办小应用
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('帮我添加一个待办事项：完成测试报告')
    await page.click('button[aria-label="发送"]')

    // 2. 等待 Agent 响应
    await expect(
      page.locator('.message-item[data-sender="agent"]')
    ).toBeVisible({ timeout: 15000 })

    // 3. 验证工具调用成功（检查工具调用指示器）
    await expect(
      page.locator('.tool-call-indicator, .miniapp-result')
    ).toBeVisible({ timeout: 10000 })

    // 4. 验证 UI 资源正确渲染
    await expect(
      page.locator('.miniapp-ui-container')
    ).toBeVisible({ timeout: 5000 })
  })

  // 场景 6: 扩展 Skill 置信度
  test('高置信度扩展 Skill 自动应用', async ({ page, request }) => {
    // 1. 创建置信度 >=0.7 的扩展 Skill
    await request.post('/api/learning/rules', {
      data: {
        record_type: 'skill',
        content: {
          name: 'auto-table-format',
          trigger: '列出数据时自动使用表格',
        },
        confidence: 0.8,
      },
    })

    // 2. 进入对话页面
    await page.goto('/conversations/test-conversation-id')

    // 3. 发送触发消息
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('请列出所有项目的状态')
    await page.click('button[aria-label="发送"]')

    // 4. 验证 Skill 自动应用（无需确认）
    const agentMessage = page.locator('.message-item[data-sender="agent"]').last()
    await expect(agentMessage).toBeVisible({ timeout: 15000 })

    // 验证使用了表格格式
    await expect(
      agentMessage.locator('table, .markdown-table')
    ).toBeVisible({ timeout: 5000 })
  })

  test('低置信度扩展 Skill 需用户确认', async ({ page, request }) => {
    // 1. 创建置信度 <0.7 的扩展 Skill
    await request.post('/api/learning/rules', {
      data: {
        record_type: 'skill',
        content: {
          name: 'experimental-format',
          trigger: '使用实验性格式',
        },
        confidence: 0.5,
      },
    })

    // 2. 进入对话页面
    await page.goto('/conversations/test-conversation-id')

    // 3. 发送触发消息
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('请使用实验性格式展示数据')
    await page.click('button[aria-label="发送"]')

    // 4. 验证显示确认对话框
    await expect(
      page.locator('.skill-confirmation-dialog')
    ).toBeVisible({ timeout: 10000 })

    // 5. 确认应用
    await page.click('button:has-text("应用")')

    // 6. 验证 Skill 被应用
    await expect(
      page.locator('.message-item[data-sender="agent"]')
    ).toBeVisible({ timeout: 15000 })
  })
})
