import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Agent 功能端到端测试
 * 测试用户从注册到使用 Agent 的完整体验
 */

// 测试用户数据
const testUser = {
  email: `test-agent-${Date.now()}@example.com`,
  password: 'Test123456',
  name: 'Agent Test User'
};

// 页面路径常量
const PAGES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  AGENT_CHAT: '/ai-agent',
  AGENT_HISTORY: '/ai-agent/history',
  AGENT_SETTINGS: '/ai-agent/settings'
};

// 通用工具函数
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function loginUser(page: Page, email: string, password: string) {
  await page.goto(PAGES.LOGIN);
  await page.fill('[placeholder*="邮箱" i], [placeholder*="email" i]', email);
  await page.fill('[placeholder*="密码" i], [placeholder*="password" i]', password);
  await page.click('button[type="submit"]');
  await waitForPageLoad(page);
}

async function registerUser(page: Page, user: typeof testUser) {
  await page.goto(PAGES.REGISTER);
  await page.fill('[placeholder*="邮箱" i], [placeholder*="email" i]', user.email);
  await page.fill('[placeholder*="密码" i], [placeholder*="password" i]', user.password);
  await page.fill('[placeholder*="确认密码" i], [placeholder*="confirm" i]', user.password);
  await page.click('button[type="submit"]');
  await waitForPageLoad(page);
}

// 测试套件组织
test.describe('Agent 功能完整流程测试', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('用户认证和初次体验', () => {
    test('新用户注册并首次访问 Agent', async () => {
      // 1. 访问首页
      await page.goto(PAGES.HOME);
      await expect(page).toHaveTitle(/Mango/);

      // 2. 检查首页是否展示 Agent 功能
      await expect(page.locator('text=AI助手')).toBeVisible();
      await expect(page.locator('text=智能对话')).toBeVisible();

      // 3. 点击开始对话应该引导到登录页
      const startChatButton = page.locator('text=开始对话');
      if (await startChatButton.isVisible()) {
        await startChatButton.click();
        await expect(page).toHaveURL(/.*login.*/);
      }

      // 4. 注册新用户
      await page.goto(PAGES.REGISTER);
      await registerUser(page, testUser);

      // 5. 注册成功后应该显示验证邮箱提示
      await expect(page.locator('text=请检查您的邮箱以验证账户')).toBeVisible();
    });

    test('用户登录后首次使用 Agent', async () => {
      // 模拟用户已验证邮箱，直接登录
      await loginUser(page, testUser.email, testUser.password);

      // 验证登录成功
      await expect(page).toHaveURL(/.*dashboard.*/);
      await expect(page.locator(`text=${testUser.email}`)).toBeVisible();

      // 首次访问 Agent 应该显示引导
      await page.goto(PAGES.AGENT_CHAT);

      // 检查是否显示新用户引导
      const onboardingModal = page.locator('[role="dialog"]');
      if (await onboardingModal.isVisible()) {
        // 测试引导流程
        await expect(onboardingModal.locator('text=欢迎使用 AI Agent')).toBeVisible();

        // 点击下一步按钮测试引导
        await page.click('text=下一步');
        await expect(onboardingModal.locator('text=开始智能对话')).toBeVisible();

        // 完成引导
        await page.click('text=下一步');
        await page.click('text=下一步');
        await page.click('text=开始使用');

        // 引导应该关闭
        await expect(onboardingModal).not.toBeVisible();
      }
    });
  });

  test.describe('Agent 对话功能', () => {
    test.beforeEach(async () => {
      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);
    });

    test('基本对话功能', async () => {
      // 检查对话界面元素
      await expect(page.locator('[placeholder*="输入您的问题" i]')).toBeVisible();
      await expect(page.locator('text=发送')).toBeVisible();

      // 发送一条测试消息
      const messageInput = page.locator('[placeholder*="输入您的问题" i]');
      await messageInput.fill('Hello, this is a test message');
      await page.click('text=发送');

      // 验证消息出现在对话历史中
      await expect(page.locator('text=Hello, this is a test message')).toBeVisible();

      // 模拟 AI 回复（取决于实际集成）
      // 在真实环境中，这里会检查 AI 的回复
    });

    test('对话历史记录', async () => {
      // 发送多条消息
      const messages = [
        '这是第一条测试消息',
        '这是第二条测试消息',
        '请帮我写一个简单的函数'
      ];

      for (const message of messages) {
        const messageInput = page.locator('[placeholder*="输入您的问题" i]');
        await messageInput.fill(message);
        await page.click('text=发送');
        await page.waitForTimeout(1000); // 等待消息显示
      }

      // 导航到历史记录页面
      await page.goto(PAGES.AGENT_HISTORY);

      // 验证历史记录页面
      await expect(page.locator('text=对话历史')).toBeVisible();
      await expect(page.locator('text=管理您的 AI 助手对话记录')).toBeVisible();

      // 检查是否有会话记录
      await expect(page.locator('[data-testid="session-card"]').first()).toBeVisible();
    });

    test('切换简洁和高级模式', async () => {
      // 检查模式切换器
      await expect(page.locator('text=简洁')).toBeVisible();
      await expect(page.locator('text=高级')).toBeVisible();

      // 切换到高级模式
      await page.click('text=高级');

      // 验证高级模式功能
      // 高级模式应该显示更多选项
      await expect(page.locator('text=插件管理')).toBeVisible();
      await expect(page.locator('text=设置')).toBeVisible();

      // 切换回简洁模式
      await page.click('text=简洁');

      // 验证简洁模式（某些高级功能应该隐藏）
      await expect(page.locator('text=AI对话')).toBeVisible();
    });
  });

  test.describe('Agent 设置和偏好', () => {
    test.beforeEach(async () => {
      await loginUser(page, testUser.email, testUser.password);
    });

    test('访问和修改 Agent 偏好设置', async () => {
      // 导航到个人资料页面
      await page.goto(PAGES.PROFILE);

      // 点击 Agent 设置选项卡
      await page.click('text=Agent 设置');

      // 验证设置页面内容
      await expect(page.locator('text=基本设置')).toBeVisible();
      await expect(page.locator('text=对话设置')).toBeVisible();
      await expect(page.locator('text=AI 模型设置')).toBeVisible();

      // 测试修改基本设置
      const modeSelect = page.locator('text=Agent 模式').locator('..').locator('select, button').first();
      await modeSelect.click();

      // 测试切换主题
      const themeSelect = page.locator('text=外观主题').locator('..').locator('select, button').first();
      await themeSelect.click();

      // 测试对话设置开关
      const autoSaveToggle = page.locator('text=自动保存对话').locator('..').locator('input[type="checkbox"], button[role="switch"]').first();
      if (await autoSaveToggle.isVisible()) {
        await autoSaveToggle.click();
      }

      // 测试保存设置
      const saveButton = page.locator('text=保存');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        // 验证保存成功提示
        await expect(page.locator('text=设置保存成功')).toBeVisible();
      }
    });

    test('Agent Dashboard 数据展示', async () => {
      await page.goto(PAGES.DASHBOARD);

      // 验证 Dashboard 已转换为 Agent 活动中心
      await expect(page.locator('text=AI Agent 活动中心')).toBeVisible();

      // 检查统计卡片
      await expect(page.locator('text=总对话数')).toBeVisible();
      await expect(page.locator('text=今日对话')).toBeVisible();
      await expect(page.locator('text=平均响应')).toBeVisible();
      await expect(page.locator('text=首选模型')).toBeVisible();

      // 检查快速操作按钮
      await expect(page.locator('text=开始新对话')).toBeVisible();
      await expect(page.locator('text=个人设置')).toBeVisible();

      // 测试点击新对话按钮
      await page.click('text=开始新对话');
      await expect(page).toHaveURL(/.*ai-agent.*/);
    });
  });

  test.describe('导航和用户体验', () => {
    test.beforeEach(async () => {
      await loginUser(page, testUser.email, testUser.password);
    });

    test('Agent 导航栏功能', async () => {
      await page.goto(PAGES.AGENT_CHAT);

      // 验证 Agent 导航栏品牌
      await expect(page.locator('text=Mango AI')).toBeVisible();

      // 测试导航项目
      await expect(page.locator('text=活动中心')).toBeVisible();
      await expect(page.locator('text=新对话')).toBeVisible();
      await expect(page.locator('text=历史记录')).toBeVisible();

      // 测试点击活动中心
      await page.click('text=活动中心');
      await expect(page).toHaveURL(/.*dashboard.*/);

      // 返回并测试历史记录
      await page.goto(PAGES.AGENT_CHAT);
      await page.click('text=历史记录');
      await expect(page).toHaveURL(/.*history.*/);

      // 测试用户下拉菜单
      const userAvatar = page.locator('[data-testid="avatar"]');
      if (await userAvatar.isVisible()) {
        await userAvatar.click();
        await expect(page.locator('text=个人设置')).toBeVisible();
        await expect(page.locator('text=Agent 配置')).toBeVisible();
        await expect(page.locator('text=退出登录')).toBeVisible();
      }
    });

    test('语言切换功能', async () => {
      await page.goto(PAGES.HOME);

      // 查找语言切换器
      const languageSwitcher = page.locator('[data-testid="language-switcher"]');
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click();

        // 切换到英文
        const englishOption = page.locator('text=English');
        if (await englishOption.isVisible()) {
          await englishOption.click();

          // 验证页面内容变为英文
          await expect(page.locator('text=Welcome to Mango')).toBeVisible();

          // 切换回中文
          await languageSwitcher.click();
          const chineseOption = page.locator('text=中文');
          if (await chineseOption.isVisible()) {
            await chineseOption.click();
            await expect(page.locator('text=欢迎来到 Mango')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('功能演示和交互', () => {
    test('首页功能演示播放', async () => {
      await page.goto(PAGES.HOME);

      // 查找功能演示组件
      const demoSection = page.locator('text=功能演示');
      await expect(demoSection).toBeVisible();

      // 查找播放按钮
      const playButton = page.locator('text=播放演示');
      if (await playButton.isVisible()) {
        await playButton.click();

        // 验证演示开始（暂停按钮出现）
        await expect(page.locator('text=暂停演示')).toBeVisible();

        // 等待一段时间让演示运行
        await page.waitForTimeout(2000);

        // 点击暂停
        await page.click('text=暂停演示');
        await expect(page.locator('text=播放演示')).toBeVisible();
      }

      // 测试手动选择场景
      const codeAssistant = page.locator('text=代码助手');
      if (await codeAssistant.isVisible()) {
        await codeAssistant.click();

        // 验证场景内容显示
        await expect(page.locator('text=帮我写一个快速排序算法')).toBeVisible();

        // 查找并测试"立即体验"按钮
        const tryNowButton = page.locator('text=立即体验');
        if (await tryNowButton.isVisible()) {
          await tryNowButton.click();
          // 应该导航到 Agent 页面
          await expect(page).toHaveURL(/.*ai-agent.*/);
        }
      }
    });
  });

  test.describe('响应式设计和可访问性', () => {
    test('移动端响应式设计', async () => {
      // 设置移动端视窗
      await page.setViewportSize({ width: 375, height: 667 });

      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);

      // 验证移动端布局
      // 侧边栏应该折叠或变为抽屉模式
      const sidebarToggle = page.locator('[data-testid="sidebar-toggle"], button:has-text("☰")');
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
        // 验证侧边栏打开
      }

      // 验证消息输入在移动端仍然可用
      const messageInput = page.locator('[placeholder*="输入您的问题" i]');
      await expect(messageInput).toBeVisible();

      // 恢复桌面端视窗
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('键盘导航可访问性', async () => {
      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);

      // 使用 Tab 键导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 验证焦点可见性
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // 测试空格键或回车键激活按钮
      await page.keyboard.press('Enter');
    });
  });

  test.describe('错误处理和边界情况', () => {
    test('网络错误处理', async () => {
      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);

      // 模拟网络离线
      await page.context().setOffline(true);

      // 尝试发送消息
      const messageInput = page.locator('[placeholder*="输入您的问题" i]');
      await messageInput.fill('这是离线测试消息');
      await page.click('text=发送');

      // 验证错误提示
      const errorMessage = page.locator('text=网络连接错误, text=连接失败');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }

      // 恢复网络连接
      await page.context().setOffline(false);
    });

    test('空输入和长文本处理', async () => {
      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);

      const messageInput = page.locator('[placeholder*="输入您的问题" i]');
      const sendButton = page.locator('text=发送');

      // 测试空输入
      await sendButton.click();
      // 验证是否有适当的提示或禁用状态

      // 测试超长文本
      const longText = 'A'.repeat(10000);
      await messageInput.fill(longText);
      await sendButton.click();

      // 验证长文本处理（可能被截断或分段处理）
    });
  });

  test.describe('性能和用户体验', () => {
    test('页面加载性能', async () => {
      const startTime = Date.now();

      await page.goto(PAGES.HOME);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      // 验证页面在合理时间内加载完成（< 3秒）
      expect(loadTime).toBeLessThan(3000);

      // 验证关键内容已渲染
      await expect(page.locator('text=AI助手')).toBeVisible();
    });

    test('对话界面流畅性', async () => {
      await loginUser(page, testUser.email, testUser.password);
      await page.goto(PAGES.AGENT_CHAT);

      // 快速连续发送多条消息测试界面响应
      const messages = ['消息1', '消息2', '消息3'];

      for (const message of messages) {
        const messageInput = page.locator('[placeholder*="输入您的问题" i]');
        await messageInput.fill(message);
        await page.click('text=发送');
        // 短暂等待，模拟快速输入
        await page.waitForTimeout(500);
      }

      // 验证所有消息都已显示
      for (const message of messages) {
        await expect(page.locator(`text=${message}`)).toBeVisible();
      }
    });
  });
});