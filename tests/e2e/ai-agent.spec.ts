import { test, expect, type Page } from '@playwright/test'

// Test data
const testUser = {
  email: 'ai-agent-test@example.com',
  password: 'TestPassword123!'
}

const testSession = {
  title: 'E2E Test Session',
  messages: [
    'Hello, can you help me with a simple task?',
    'What programming languages do you support?',
    'Can you analyze some code for me?'
  ]
}

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/zh/login')
  await page.fill('[data-testid="email-input"]', testUser.email)
  await page.fill('[data-testid="password-input"]', testUser.password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/zh/dashboard')
}

async function navigateToAIAgent(page: Page) {
  await page.goto('/zh/ai-agent')
  await page.waitForSelector('[data-testid="ai-agent-layout"]')
}

async function waitForAIResponse(page: Page, timeout: number = 30000) {
  await page.waitForSelector('[data-testid="ai-response"]', { timeout })
}

test.describe('AI Agent E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/')
  })

  test.describe('Authentication and Access', () => {
    test('should require authentication to access AI Agent', async ({ page }) => {
      await page.goto('/zh/ai-agent')

      // Should redirect to login page
      await page.waitForURL('/zh/login*')
      expect(page.url()).toContain('/zh/login')
    })

    test('should allow authenticated users to access AI Agent', async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Should see AI Agent interface
      await expect(page.locator('[data-testid="ai-agent-layout"]')).toBeVisible()
      await expect(page.locator('h1')).toContainText('AI Agent')
    })

    test('should maintain session across page refreshes', async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      await page.reload()

      // Should still be on AI Agent page
      await expect(page.locator('[data-testid="ai-agent-layout"]')).toBeVisible()
    })
  })

  test.describe('Simple Mode User Journey', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Ensure we're in simple mode
      await page.click('[data-testid="mode-switch-simple"]')
      await expect(page.locator('[data-testid="mode-indicator"]')).toContainText('简单模式')
    })

    test('should start a new conversation in simple mode', async ({ page }) => {
      // Should see welcome panel
      await expect(page.locator('[data-testid="welcome-panel"]')).toBeVisible()

      // Should see conversation interface
      await expect(page.locator('[data-testid="conversation-interface"]')).toBeVisible()

      // Should see input area
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
    })

    test('should send and receive messages', async ({ page }) => {
      const testMessage = testSession.messages[0]

      // Type and send message
      await page.fill('[data-testid="message-input"]', testMessage)
      await page.click('[data-testid="send-button"]')

      // Should see user message
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText(testMessage)

      // Should see loading indicator
      await expect(page.locator('[data-testid="ai-loading"]')).toBeVisible()

      // Should receive AI response
      await waitForAIResponse(page)
      await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible()
    })

    test('should handle multiple messages in conversation', async ({ page }) => {
      for (const message of testSession.messages) {
        await page.fill('[data-testid="message-input"]', message)
        await page.click('[data-testid="send-button"]')

        // Wait for response before sending next message
        await waitForAIResponse(page)
        await page.waitForTimeout(1000) // Brief pause between messages
      }

      // Should have all messages in conversation
      const userMessages = page.locator('[data-testid="user-message"]')
      const aiResponses = page.locator('[data-testid="ai-response"]')

      await expect(userMessages).toHaveCount(testSession.messages.length)
      await expect(aiResponses).toHaveCount(testSession.messages.length)
    })

    test('should show quick actions in simple mode', async ({ page }) => {
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()

      // Should show appropriate quick actions for simple mode
      await expect(page.locator('[data-testid="quick-action-help"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-action-analyze"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-action-create"]')).toBeVisible()

      // Should not show advanced actions
      await expect(page.locator('[data-testid="quick-action-tools"]')).not.toBeVisible()
    })

    test('should handle conversation errors gracefully', async ({ page }) => {
      // Simulate network error by blocking API requests
      await page.route('/api/ai-agent', route => route.abort())

      await page.fill('[data-testid="message-input"]', 'This should fail')
      await page.click('[data-testid="send-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-message"]')).toContainText('对话出现错误')

      // Should allow retry
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })
  })

  test.describe('Advanced Mode User Journey', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Switch to advanced mode
      await page.click('[data-testid="mode-switch-advanced"]')
      await expect(page.locator('[data-testid="mode-indicator"]')).toContainText('高级模式')
    })

    test('should display advanced interface elements', async ({ page }) => {
      // Should show tabs interface
      await expect(page.locator('[data-testid="tabs-interface"]')).toBeVisible()

      // Should show chat, tools, and history tabs
      await expect(page.locator('[data-testid="tab-chat"]')).toBeVisible()
      await expect(page.locator('[data-testid="tab-tools"]')).toBeVisible()
      await expect(page.locator('[data-testid="tab-history"]')).toBeVisible()
    })

    test('should navigate between tabs', async ({ page }) => {
      // Start on chat tab
      await expect(page.locator('[data-testid="chat-content"]')).toBeVisible()

      // Switch to tools tab
      await page.click('[data-testid="tab-tools"]')
      await expect(page.locator('[data-testid="tools-content"]')).toBeVisible()

      // Switch to history tab
      await page.click('[data-testid="tab-history"]')
      await expect(page.locator('[data-testid="history-content"]')).toBeVisible()

      // Switch back to chat
      await page.click('[data-testid="tab-chat"]')
      await expect(page.locator('[data-testid="chat-content"]')).toBeVisible()
    })

    test('should display tool execution visualizer', async ({ page }) => {
      // Send a message that would trigger tool usage
      await page.fill('[data-testid="message-input"]', 'Analyze this code: console.log("hello");')
      await page.click('[data-testid="send-button"]')

      await waitForAIResponse(page)

      // Should show tool execution details
      await expect(page.locator('[data-testid="tool-execution-visualizer"]')).toBeVisible()
    })

    test('should show session management options', async ({ page }) => {
      // Should show session info
      await expect(page.locator('[data-testid="session-info"]')).toBeVisible()

      // Should show session actions
      await expect(page.locator('[data-testid="session-actions"]')).toBeVisible()
    })
  })

  test.describe('Plugin Management (Advanced Mode)', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
      await page.goto('/zh/ai-agent/plugins')
      await page.waitForSelector('[data-testid="plugin-management"]')
    })

    test('should display plugin management interface', async ({ page }) => {
      // Should show plugin management layout
      await expect(page.locator('[data-testid="plugin-management"]')).toBeVisible()
      await expect(page.locator('h1')).toContainText('插件管理')

      // Should show tabs
      await expect(page.locator('[data-testid="plugin-tabs"]')).toBeVisible()
    })

    test('should show system overview', async ({ page }) => {
      // Should be on overview tab by default
      await expect(page.locator('[data-testid="overview-content"]')).toBeVisible()

      // Should show system metrics
      await expect(page.locator('[data-testid="system-metrics"]')).toBeVisible()
      await expect(page.locator('[data-testid="metrics-servers"]')).toBeVisible()
      await expect(page.locator('[data-testid="metrics-plugins"]')).toBeVisible()
    })

    test('should display MCP servers tab', async ({ page }) => {
      await page.click('[data-testid="tab-servers"]')
      await expect(page.locator('[data-testid="servers-content"]')).toBeVisible()

      // Should show server list
      await expect(page.locator('[data-testid="server-list"]')).toBeVisible()

      // Should show add server button
      await expect(page.locator('[data-testid="add-server-button"]')).toBeVisible()
    })

    test('should display plugins tab', async ({ page }) => {
      await page.click('[data-testid="tab-plugins"]')
      await expect(page.locator('[data-testid="plugins-content"]')).toBeVisible()

      // Should show plugin list
      await expect(page.locator('[data-testid="plugin-list"]')).toBeVisible()

      // Should show install plugin button
      await expect(page.locator('[data-testid="install-plugin-button"]')).toBeVisible()
    })

    test('should handle plugin actions', async ({ page }) => {
      await page.click('[data-testid="tab-plugins"]')

      // Find first plugin card
      const pluginCard = page.locator('[data-testid="plugin-card"]').first()
      await expect(pluginCard).toBeVisible()

      // Should show plugin actions
      await pluginCard.locator('[data-testid="plugin-menu-trigger"]').click()
      await expect(page.locator('[data-testid="plugin-menu"]')).toBeVisible()

      // Should show action options
      await expect(page.locator('[data-testid="plugin-action-configure"]')).toBeVisible()
      await expect(page.locator('[data-testid="plugin-action-reload"]')).toBeVisible()
    })
  })

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)
      await page.click('[data-testid="mode-switch-advanced"]')
    })

    test('should create new session', async ({ page }) => {
      await page.click('[data-testid="new-session-button"]')

      // Should start with empty conversation
      const messages = page.locator('[data-testid="conversation-message"]')
      await expect(messages).toHaveCount(0)

      // Should show new session indicator
      await expect(page.locator('[data-testid="session-status"]')).toContainText('新对话')
    })

    test('should persist conversation across sessions', async ({ page }) => {
      // Send a message
      const testMessage = 'Test message for persistence'
      await page.fill('[data-testid="message-input"]', testMessage)
      await page.click('[data-testid="send-button"]')

      await waitForAIResponse(page)

      // Navigate away and back
      await page.goto('/zh/dashboard')
      await navigateToAIAgent(page)

      // Should see previous conversation
      await expect(page.locator('[data-testid="user-message"]')).toContainText(testMessage)
    })

    test('should display session history', async ({ page }) => {
      await page.click('[data-testid="tab-history"]')

      // Should show history content
      await expect(page.locator('[data-testid="history-content"]')).toBeVisible()

      // Should show session list (if any exist)
      const sessionList = page.locator('[data-testid="session-list"]')
      await expect(sessionList).toBeVisible()
    })
  })

  test.describe('Internationalization', () => {
    test('should work in Chinese (default)', async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Should see Chinese interface
      await expect(page.locator('h1')).toContainText('AI助手')
      await expect(page.locator('[data-testid="welcome-title"]')).toContainText('欢迎使用AI助手')
    })

    test('should work in English', async ({ page }) => {
      await page.goto('/en/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.click('[data-testid="login-button"]')
      await page.waitForURL('/en/dashboard')

      await page.goto('/en/ai-agent')

      // Should see English interface
      await expect(page.locator('h1')).toContainText('AI Agent')
      await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome to AI Agent')
    })

    test('should maintain language preference across navigation', async ({ page }) => {
      await page.goto('/en/login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.click('[data-testid="login-button"]')

      await page.goto('/en/ai-agent')
      await page.goto('/en/ai-agent/plugins')

      // Should still be in English
      await expect(page.locator('h1')).toContainText('Plugin Management')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await loginUser(page)
      await navigateToAIAgent(page)

      // Should see mobile-optimized layout
      await expect(page.locator('[data-testid="ai-agent-layout"]')).toBeVisible()
      await expect(page.locator('[data-testid="conversation-interface"]')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await loginUser(page)
      await navigateToAIAgent(page)

      // Should see tablet-optimized layout
      await expect(page.locator('[data-testid="ai-agent-layout"]')).toBeVisible()
    })

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })

      await loginUser(page)
      await navigateToAIAgent(page)

      // Should see desktop layout with all features
      await expect(page.locator('[data-testid="ai-agent-layout"]')).toBeVisible()
      await page.click('[data-testid="mode-switch-advanced"]')
      await expect(page.locator('[data-testid="tabs-interface"]')).toBeVisible()
    })
  })

  test.describe('Performance and Reliability', () => {
    test('should handle slow API responses', async ({ page }) => {
      // Slow down API responses
      await page.route('/api/ai-agent', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        await route.continue()
      })

      await loginUser(page)
      await navigateToAIAgent(page)

      await page.fill('[data-testid="message-input"]', 'Test slow response')
      await page.click('[data-testid="send-button"]')

      // Should show loading state
      await expect(page.locator('[data-testid="ai-loading"]')).toBeVisible()

      // Should eventually get response
      await waitForAIResponse(page, 10000)
    })

    test('should handle offline scenarios', async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Go offline
      await page.context().setOffline(true)

      await page.fill('[data-testid="message-input"]', 'Test offline')
      await page.click('[data-testid="send-button"]')

      // Should show offline error
      await expect(page.locator('[data-testid="offline-error"]')).toBeVisible()
    })

    test('should maintain state during network interruptions', async ({ page }) => {
      await loginUser(page)
      await navigateToAIAgent(page)

      // Send initial message
      await page.fill('[data-testid="message-input"]', 'First message')
      await page.click('[data-testid="send-button"]')
      await waitForAIResponse(page)

      // Simulate network interruption
      await page.context().setOffline(true)
      await page.waitForTimeout(2000)
      await page.context().setOffline(false)

      // Should recover and maintain conversation
      await expect(page.locator('[data-testid="user-message"]')).toContainText('First message')

      // Should be able to continue conversation
      await page.fill('[data-testid="message-input"]', 'Second message after recovery')
      await page.click('[data-testid="send-button"]')
      await waitForAIResponse(page)
    })
  })
})