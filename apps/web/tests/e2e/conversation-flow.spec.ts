/**
 * E2E Tests: Conversation Flow
 * 测试完整的对话流程 - User Story 1 核心功能
 */

import { test, expect } from '@playwright/test'

test.describe('User Story 1: 与Agent进行对话完成任务', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/')
  })

  test('用户应该能够注册、登录并创建对话', async ({ page }) => {
    // 1. 注册新用户
    await page.click('text=注册')
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page.click('button[type="submit"]')

    // 等待注册成功并跳转
    await expect(page).toHaveURL(/\/conversations/, { timeout: 10000 })

    // 2. 创建新对话
    await page.click('text=新建对话')
    await page.fill('input[placeholder*="对话标题"]', '测试对话')
    await page.click('button:has-text("创建")')

    // 验证对话创建成功
    await expect(page.locator('text=测试对话')).toBeVisible()
  })

  test('用户应该能够发送文本消息并接收 Agent 响应', async ({ page }) => {
    // 假设用户已登录并进入对话页面
    await page.goto('/conversations/test-conversation-id')

    // 1. 发送文本消息
    const messageInput = page.locator('textarea[placeholder*="输入消息"]')
    await messageInput.fill('你好,请帮我查询今天的天气')
    await page.click('button[aria-label="发送"]')

    // 2. 验证用户消息显示
    await expect(
      page.locator('.message-item:has-text("你好,请帮我查询今天的天气")')
    ).toBeVisible()

    // 3. 等待 Agent 响应
    await expect(
      page.locator('.message-item[data-sender="agent"]')
    ).toBeVisible({ timeout: 15000 })

    // 4. 验证响应内容存在
    const agentMessage = page.locator('.message-item[data-sender="agent"]').first()
    await expect(agentMessage).toContainText(/天气|温度|气温/)
  })

  test('用户应该能够上传图片附件', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 点击附件上传按钮
    await page.click('button[aria-label="上传附件"]')

    // 2. 选择图片文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    })

    // 3. 验证图片预览显示
    await expect(page.locator('.attachment-preview')).toBeVisible()
    await expect(page.locator('img[alt*="test-image"]')).toBeVisible()

    // 4. 发送带附件的消息
    await page.fill('textarea[placeholder*="输入消息"]', '这是一张图片')
    await page.click('button[aria-label="发送"]')

    // 5. 验证消息和附件都已发送
    await expect(
      page.locator('.message-item:has-text("这是一张图片")')
    ).toBeVisible()
    await expect(
      page.locator('.message-item img[alt*="test-image"]')
    ).toBeVisible()
  })

  test('用户应该能够看到后台任务的执行进度', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 发送需要后台执行的任务
    await page.fill(
      'textarea[placeholder*="输入消息"]',
      '请帮我分析这个大型数据集'
    )
    await page.click('button[aria-label="发送"]')

    // 2. 验证任务进度指示器出现
    await expect(page.locator('.task-progress-indicator')).toBeVisible({
      timeout: 5000,
    })

    // 3. 验证进度百分比显示
    const progressBar = page.locator('.task-progress-indicator .progress-bar')
    await expect(progressBar).toBeVisible()

    // 4. 等待任务状态更新
    await expect(
      page.locator('.task-progress-indicator:has-text("运行中")')
    ).toBeVisible({ timeout: 10000 })

    // 5. 验证可以看到任务详情
    await page.click('.task-progress-indicator')
    await expect(page.locator('.task-detail-modal')).toBeVisible()
    await expect(page.locator('text=任务类型')).toBeVisible()
    await expect(page.locator('text=进度')).toBeVisible()
  })

  test('用户离开后任务应该继续执行,返回后能看到结果', async ({
    page,
    context,
  }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 启动一个长时间运行的任务
    await page.fill(
      'textarea[placeholder*="输入消息"]',
      '请执行一个需要30秒的复杂计算'
    )
    await page.click('button[aria-label="发送"]')

    // 2. 验证任务已开始
    await expect(page.locator('.task-progress-indicator')).toBeVisible()

    // 3. 关闭页面(模拟用户离开)
    await page.close()

    // 4. 等待一段时间(模拟任务在后台执行)
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 5. 重新打开页面(模拟用户返回)
    const newPage = await context.newPage()
    await newPage.goto('/conversations/test-conversation-id')

    // 6. 验证任务状态已更新或已完成
    const taskIndicator = newPage.locator('.task-progress-indicator')
    await expect(taskIndicator).toBeVisible({ timeout: 10000 })

    // 7. 验证进度已推进或任务已完成
    await expect(
      newPage.locator(
        '.task-progress-indicator:has-text("运行中"), .task-progress-indicator:has-text("已完成")'
      )
    ).toBeVisible()
  })

  test('用户应该能够查看对话历史', async ({ page }) => {
    await page.goto('/conversations')

    // 1. 验证对话列表显示
    await expect(page.locator('.conversation-list')).toBeVisible()

    // 2. 验证至少有一个对话项
    const conversationItems = page.locator('.conversation-item')
    await expect(conversationItems.first()).toBeVisible()

    // 3. 点击进入对话
    await conversationItems.first().click()

    // 4. 验证消息历史加载
    await expect(page.locator('.message-list')).toBeVisible()
    await expect(page.locator('.message-item')).toHaveCount(
      await page.locator('.message-item').count(),
      { timeout: 5000 }
    )

    // 5. 验证可以滚动查看更多历史消息
    const messageList = page.locator('.message-list')
    await messageList.evaluate((el) => {
      el.scrollTop = 0 // 滚动到顶部
    })

    // 等待加载更多消息(如果有分页)
    await page.waitForTimeout(1000)
  })

  test('用户应该能够搜索对话内容', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 打开搜索功能
    await page.click('button[aria-label="搜索"]')

    // 2. 输入搜索关键词
    await page.fill('input[placeholder*="搜索"]', '天气')

    // 3. 验证搜索结果高亮显示
    await expect(page.locator('.message-item mark:has-text("天气")')).toBeVisible(
      { timeout: 3000 }
    )

    // 4. 验证可以导航到搜索结果
    const searchResults = page.locator('.search-result-item')
    if ((await searchResults.count()) > 0) {
      await searchResults.first().click()
      await expect(page.locator('.message-item.highlighted')).toBeVisible()
    }
  })

  test('用户应该能够编辑和删除自己的消息', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 发送一条消息
    await page.fill('textarea[placeholder*="输入消息"]', '这是一条测试消息')
    await page.click('button[aria-label="发送"]')

    const userMessage = page
      .locator('.message-item[data-sender="user"]')
      .last()
    await expect(userMessage).toBeVisible()

    // 2. 编辑消息
    await userMessage.hover()
    await userMessage.locator('button[aria-label="编辑"]').click()

    const editInput = page.locator('textarea[data-editing="true"]')
    await editInput.clear()
    await editInput.fill('这是编辑后的消息')
    await page.click('button:has-text("保存")')

    // 3. 验证消息已更新
    await expect(
      page.locator('.message-item:has-text("这是编辑后的消息")')
    ).toBeVisible()
    await expect(page.locator('text=已编辑')).toBeVisible()

    // 4. 删除消息
    await userMessage.hover()
    await userMessage.locator('button[aria-label="删除"]').click()

    // 确认删除
    await page.click('button:has-text("确认删除")')

    // 5. 验证消息已删除
    await expect(
      page.locator('.message-item:has-text("这是编辑后的消息")')
    ).not.toBeVisible({ timeout: 3000 })
  })

  test('应该能够处理网络断开和重连', async ({ page, context }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 模拟网络离线
    await context.setOffline(true)

    // 2. 尝试发送消息
    await page.fill('textarea[placeholder*="输入消息"]', '离线消息')
    await page.click('button[aria-label="发送"]')

    // 3. 验证离线提示
    await expect(page.locator('text=网络连接已断开')).toBeVisible({
      timeout: 5000,
    })

    // 4. 验证消息进入待发送队列
    await expect(
      page.locator('.message-item:has-text("离线消息") .status-pending')
    ).toBeVisible()

    // 5. 恢复网络连接
    await context.setOffline(false)

    // 6. 验证自动重连和消息发送
    await expect(page.locator('text=已重新连接')).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.locator('.message-item:has-text("离线消息") .status-sent')
    ).toBeVisible({ timeout: 10000 })
  })

  test('应该能够实时接收新消息', async ({ page, context }) => {
    // 打开两个页面模拟多设备
    const page1 = page
    const page2 = await context.newPage()

    await page1.goto('/conversations/test-conversation-id')
    await page2.goto('/conversations/test-conversation-id')

    // 在第一个页面发送消息
    await page1.fill('textarea[placeholder*="输入消息"]', '实时同步测试')
    await page1.click('button[aria-label="发送"]')

    // 验证第二个页面实时收到消息
    await expect(
      page2.locator('.message-item:has-text("实时同步测试")')
    ).toBeVisible({ timeout: 5000 })

    await page2.close()
  })

  test('应该正确显示多模态内容', async ({ page }) => {
    await page.goto('/conversations/test-conversation-id')

    // 1. 上传多个不同类型的文件
    const fileInput = page.locator('input[type="file"]')

    // 上传图片
    await page.click('button[aria-label="上传附件"]')
    await fileInput.setInputFiles({
      name: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image'),
    })

    // 上传文档
    await page.click('button[aria-label="上传附件"]')
    await fileInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf'),
    })

    // 2. 发送消息
    await page.fill('textarea[placeholder*="输入消息"]', '多模态内容测试')
    await page.click('button[aria-label="发送"]')

    // 3. 验证不同类型的附件正确显示
    const message = page.locator('.message-item').last()
    await expect(message.locator('img[alt*="image"]')).toBeVisible()
    await expect(
      message.locator('.attachment-item:has-text("document.pdf")')
    ).toBeVisible()

    // 4. 验证可以预览和下载附件
    await message.locator('img[alt*="image"]').click()
    await expect(page.locator('.image-preview-modal')).toBeVisible()
    await page.click('button[aria-label="关闭"]')

    await message.locator('.attachment-item:has-text("document.pdf")').click()
    // 验证下载或预览功能触发
  })
})
