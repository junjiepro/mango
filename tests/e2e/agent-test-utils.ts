import { test as base, expect, Page } from '@playwright/test';

/**
 * Agent E2E 测试辅助工具和配置
 * 提供专门用于 Agent 功能测试的工具和页面对象
 */

// 页面对象模式 - Agent 相关页面
export class AgentPageObjects {
  constructor(public readonly page: Page) {}

  // Agent Chat 页面对象
  get agentChatPage() {
    return {
      messageInput: () => this.page.locator('[placeholder*="输入您的问题" i]'),
      sendButton: () => this.page.locator('text=发送'),
      messageHistory: () => this.page.locator('[data-testid="conversation"]'),
      userMessage: (content: string) => this.page.locator(`[data-testid="message-user"]:has-text("${content}")`),
      assistantMessage: () => this.page.locator('[data-testid="message-assistant"]').first(),
      clearButton: () => this.page.locator('text=清空对话'),
      newSessionButton: () => this.page.locator('text=新建对话'),

      // 模式切换
      simpleMode: () => this.page.locator('text=简洁'),
      advancedMode: () => this.page.locator('text=高级'),

      // 侧边栏
      sidebar: {
        chat: () => this.page.locator('text=AI对话'),
        history: () => this.page.locator('text=对话历史'),
        plugins: () => this.page.locator('text=插件管理'),
        settings: () => this.page.locator('text=设置'),
      },

      // 发送消息并等待响应
      async sendMessage(message: string) {
        await this.messageInput().fill(message);
        await this.sendButton().click();
        await this.page.waitForTimeout(1000); // 等待消息出现
      },

      // 验证消息出现
      async expectMessage(content: string, role: 'user' | 'assistant' = 'user') {
        await expect(this.page.locator(`[data-testid="message-${role}"]:has-text("${content}")`)).toBeVisible();
      }
    };
  }

  // Agent History 页面对象
  get agentHistoryPage() {
    return {
      searchInput: () => this.page.locator('[data-testid="input"]'),
      filterButtons: {
        all: () => this.page.locator('text=全部'),
        today: () => this.page.locator('text=今天'),
        week: () => this.page.locator('text=本周'),
        month: () => this.page.locator('text=本月'),
      },
      sessionCards: () => this.page.locator('[data-testid="session-card"]'),
      selectAllButton: () => this.page.locator('text=全选'),
      batchActions: {
        archive: () => this.page.locator('text=归档'),
        export: () => this.page.locator('text=导出'),
        delete: () => this.page.locator('text=删除'),
      },

      // 搜索会话
      async searchSessions(query: string) {
        await this.searchInput().fill(query);
        await this.page.waitForTimeout(500);
      },

      // 选择会话
      async selectSession(index: number) {
        const checkboxes = this.page.locator('[data-testid="checkbox"]');
        await checkboxes.nth(index).click();
      },

      // 获取会话统计
      async getSessionCount() {
        const statsText = await this.page.locator('text*="Total" i').textContent();
        return statsText ? parseInt(statsText.match(/\d+/)?.[0] || '0') : 0;
      }
    };
  }

  // Agent Settings 页面对象
  get agentSettingsPage() {
    return {
      tabs: {
        account: () => this.page.locator('text=账户信息'),
        agent: () => this.page.locator('text=Agent 设置'),
      },
      basicSettings: {
        modeSelect: () => this.page.locator('text=Agent 模式').locator('..').locator('select, button').first(),
        themeSelect: () => this.page.locator('text=外观主题').locator('..').locator('select, button').first(),
        languageSelect: () => this.page.locator('text=界面语言').locator('..').locator('select, button').first(),
      },
      conversationSettings: {
        autoSave: () => this.page.locator('text=自动保存对话').locator('..').locator('input[type="checkbox"], button[role="switch"]').first(),
        showTimestamps: () => this.page.locator('text=显示时间戳').locator('..').locator('input[type="checkbox"], button[role="switch"]').first(),
        showTyping: () => this.page.locator('text=打字指示器').locator('..').locator('input[type="checkbox"], button[role="switch"]').first(),
      },
      saveButton: () => this.page.locator('text=保存'),
      successMessage: () => this.page.locator('text=设置保存成功'),

      // 更新设置
      async updateBasicSetting(setting: 'mode' | 'theme' | 'language', value?: string) {
        const selectors = this.basicSettings;
        let selector;

        switch (setting) {
          case 'mode':
            selector = selectors.modeSelect();
            break;
          case 'theme':
            selector = selectors.themeSelect();
            break;
          case 'language':
            selector = selectors.languageSelect();
            break;
        }

        await selector.click();
        if (value) {
          await this.page.locator(`text=${value}`).first().click();
        }
      },

      // 切换开关设置
      async toggleSetting(setting: 'autoSave' | 'showTimestamps' | 'showTyping') {
        const selectors = this.conversationSettings;
        let selector;

        switch (setting) {
          case 'autoSave':
            selector = selectors.autoSave();
            break;
          case 'showTimestamps':
            selector = selectors.showTimestamps();
            break;
          case 'showTyping':
            selector = selectors.showTyping();
            break;
        }

        if (await selector.isVisible()) {
          await selector.click();
        }
      },

      // 保存设置并验证
      async saveSettings() {
        await this.saveButton().click();
        await expect(this.successMessage()).toBeVisible();
      }
    };
  }

  // Agent Navigation 页面对象
  get agentNavigation() {
    return {
      brand: () => this.page.locator('text=Mango AI'),
      navItems: {
        activityCenter: () => this.page.locator('text=活动中心'),
        newChat: () => this.page.locator('text=新对话'),
        history: () => this.page.locator('text=历史记录'),
      },
      userMenu: {
        avatar: () => this.page.locator('[data-testid="avatar"]'),
        profile: () => this.page.locator('text=个人设置'),
        agentConfig: () => this.page.locator('text=Agent 配置'),
        logout: () => this.page.locator('text=退出登录'),
      },
      languageSwitcher: () => this.page.locator('[data-testid="language-switcher"]'),

      // 导航到特定页面
      async navigateTo(page: 'activityCenter' | 'newChat' | 'history') {
        const navItems = this.navItems;
        switch (page) {
          case 'activityCenter':
            await navItems.activityCenter().click();
            break;
          case 'newChat':
            await navItems.newChat().click();
            break;
          case 'history':
            await navItems.history().click();
            break;
        }
      },

      // 打开用户菜单
      async openUserMenu() {
        await this.userMenu.avatar().click();
      }
    };
  }

  // Onboarding 页面对象
  get onboardingModal() {
    return {
      modal: () => this.page.locator('[role="dialog"]'),
      title: () => this.page.locator('text=欢迎使用 AI Agent'),
      nextButton: () => this.page.locator('text=下一步'),
      previousButton: () => this.page.locator('text=上一步'),
      skipButton: () => this.page.locator('text=跳过引导'),
      completeButton: () => this.page.locator('text=开始使用'),
      progressIndicator: () => this.page.locator('text*="第" i'),

      // 完成引导流程
      async completeOnboarding() {
        if (await this.modal().isVisible()) {
          // 点击完成所有步骤
          while (await this.nextButton().isVisible()) {
            await this.nextButton().click();
            await this.page.waitForTimeout(500);
          }

          // 点击开始使用
          if (await this.completeButton().isVisible()) {
            await this.completeButton().click();
          }
        }
      },

      // 跳过引导
      async skipOnboarding() {
        if (await this.modal().isVisible()) {
          await this.skipButton().click();
        }
      }
    };
  }

  // Feature Preview 页面对象
  get featurePreview() {
    return {
      title: () => this.page.locator('text=功能演示'),
      playButton: () => this.page.locator('text=播放演示'),
      pauseButton: () => this.page.locator('text=暂停演示'),
      scenarios: {
        codeHelp: () => this.page.locator('text=代码助手'),
        analysis: () => this.page.locator('text=数据分析'),
        creative: () => this.page.locator('text=创意写作'),
        problemSolving: () => this.page.locator('text=问题解决'),
      },
      tryNowButton: () => this.page.locator('text=立即体验'),

      // 播放演示
      async playDemo() {
        await this.playButton().click();
        await expect(this.pauseButton()).toBeVisible();
      },

      // 选择场景
      async selectScenario(scenario: 'codeHelp' | 'analysis' | 'creative' | 'problemSolving') {
        const scenarios = this.scenarios;
        switch (scenario) {
          case 'codeHelp':
            await scenarios.codeHelp().click();
            break;
          case 'analysis':
            await scenarios.analysis().click();
            break;
          case 'creative':
            await scenarios.creative().click();
            break;
          case 'problemSolving':
            await scenarios.problemSolving().click();
            break;
        }
      }
    };
  }
}

// 扩展基础测试以包含 Agent 页面对象
export const test = base.extend<{ agentPages: AgentPageObjects }>({
  agentPages: async ({ page }, use) => {
    const agentPages = new AgentPageObjects(page);
    await use(agentPages);
  },
});

// 通用测试数据和工具
export const TEST_DATA = {
  users: {
    agent: {
      email: `agent-test-${Date.now()}@example.com`,
      password: 'Test123456',
      name: 'Agent Test User'
    }
  },
  messages: {
    simple: ['你好', 'Hello', '帮我写代码'],
    complex: [
      '请帮我写一个计算斐波那契数列的Python函数',
      '分析一下这段代码的时间复杂度',
      '如何优化网站的加载速度？'
    ],
    edge: [
      '', // 空消息
      'A'.repeat(1000), // 长消息
      '特殊字符 !@#$%^&*()_+-=[]{}|;:,.<>?', // 特殊字符
    ]
  },
  urls: {
    home: '/',
    login: '/login',
    register: '/register',
    dashboard: '/dashboard',
    profile: '/dashboard/profile',
    agentChat: '/ai-agent',
    agentHistory: '/ai-agent/history',
    agentSettings: '/ai-agent/settings'
  }
};

// 测试工具函数
export class TestUtils {
  constructor(private page: Page) {}

  // 等待页面完全加载
  async waitForFullLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // 登录助手函数
  async loginUser(email: string, password: string) {
    await this.page.goto(TEST_DATA.urls.login);
    await this.page.fill('[placeholder*="邮箱" i], [placeholder*="email" i]', email);
    await this.page.fill('[placeholder*="密码" i], [placeholder*="password" i]', password);
    await this.page.click('button[type="submit"]');
    await this.waitForFullLoad();
  }

  // 注册助手函数
  async registerUser(email: string, password: string, name?: string) {
    await this.page.goto(TEST_DATA.urls.register);
    await this.page.fill('[placeholder*="邮箱" i], [placeholder*="email" i]', email);
    await this.page.fill('[placeholder*="密码" i], [placeholder*="password" i]', password);
    await this.page.fill('[placeholder*="确认密码" i], [placeholder*="confirm" i]', password);
    if (name) {
      const nameField = this.page.locator('[placeholder*="姓名" i], [placeholder*="name" i]');
      if (await nameField.isVisible()) {
        await nameField.fill(name);
      }
    }
    await this.page.click('button[type="submit"]');
    await this.waitForFullLoad();
  }

  // 截图助手 - 用于调试
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `tests/screenshots/${name}-${Date.now()}.png`, fullPage: true });
  }

  // 检查元素是否可见且可交互
  async isElementReady(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
      return true;
    } catch {
      return false;
    }
  }

  // 等待并点击元素
  async waitAndClick(selector: string, timeout: number = 5000) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.click();
  }

  // 模拟慢速打字
  async typeSlowly(selector: string, text: string, delay: number = 100) {
    const element = this.page.locator(selector);
    await element.focus();
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.page.waitForTimeout(delay);
    }
  }

  // 清理测试数据
  async cleanup() {
    // 清理本地存储
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 清理 cookies
    await this.page.context().clearCookies();
  }
}

// 导出给测试使用
export { expect };

// 性能测试工具
export class PerformanceUtils {
  constructor(private page: Page) {}

  // 测量页面加载时间
  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  // 测量交互响应时间
  async measureInteractionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  // 检查页面性能指标
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });
  }
}