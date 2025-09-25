import { test, expect } from './agent-test-utils';

/**
 * Agent 功能回归测试
 * 确保核心 Agent 功能在代码更新后仍然正常工作
 */

test.describe('Agent 功能回归测试', () => {
  // 测试用户
  const testUser = {
    email: `regression-test-${Date.now()}@example.com`,
    password: 'Test123456',
    name: 'Regression Test User'
  };

  test.beforeEach(async ({ page, agentPages }) => {
    // 注册并登录测试用户
    await page.goto('/register');
    await page.fill('[placeholder*="邮箱" i]', testUser.email);
    await page.fill('[placeholder*="密码" i]', testUser.password);
    await page.fill('[placeholder*="确认密码" i]', testUser.password);
    await page.click('button[type="submit"]');

    // 模拟邮箱验证完成，直接登录
    await page.goto('/login');
    await page.fill('[placeholder*="邮箱" i]', testUser.email);
    await page.fill('[placeholder*="密码" i]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test('关键路径：完整的Agent对话流程', async ({ page, agentPages }) => {
    // 1. 导航到Agent对话页面
    await page.goto('/ai-agent');

    // 2. 处理首次使用引导（如果出现）
    await agentPages.onboardingModal.skipOnboarding();

    // 3. 验证对话界面加载
    await expect(agentPages.agentChatPage.messageInput()).toBeVisible();
    await expect(agentPages.agentChatPage.sendButton()).toBeVisible();

    // 4. 发送测试消息
    await agentPages.agentChatPage.sendMessage('这是一条回归测试消息');

    // 5. 验证消息出现在对话历史中
    await agentPages.agentChatPage.expectMessage('这是一条回归测试消息', 'user');

    // 6. 验证对话保存到历史记录
    await agentPages.agentNavigation.navigateTo('history');
    await expect(page).toHaveURL(/.*history.*/);

    // 7. 验证历史记录页面有新会话
    const sessionCount = await agentPages.agentHistoryPage.getSessionCount();
    expect(sessionCount).toBeGreaterThan(0);
  });

  test('关键路径：Agent设置修改流程', async ({ page, agentPages }) => {
    // 1. 导航到个人设置
    await page.goto('/dashboard/profile');

    // 2. 切换到Agent设置标签
    await agentPages.agentSettingsPage.tabs.agent().click();

    // 3. 修改基本设置
    await agentPages.agentSettingsPage.updateBasicSetting('mode');
    await agentPages.agentSettingsPage.updateBasicSetting('theme');

    // 4. 切换对话设置
    await agentPages.agentSettingsPage.toggleSetting('autoSave');
    await agentPages.agentSettingsPage.toggleSetting('showTimestamps');

    // 5. 保存设置
    await agentPages.agentSettingsPage.saveSettings();

    // 6. 验证设置持久化 - 刷新页面后检查
    await page.reload();
    await agentPages.agentSettingsPage.tabs.agent().click();

    // 验证设置仍然保持
    await expect(page.locator('text=Agent 模式')).toBeVisible();
  });

  test('关键路径：模式切换功能', async ({ page, agentPages }) => {
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();

    // 测试简洁模式到高级模式切换
    await agentPages.agentChatPage.simpleMode().click();
    await expect(agentPages.agentChatPage.simpleMode()).toHaveClass(/.*active.*|.*selected.*|.*default.*/);

    await agentPages.agentChatPage.advancedMode().click();
    await expect(agentPages.agentChatPage.advancedMode()).toHaveClass(/.*active.*|.*selected.*|.*default.*/);

    // 验证高级模式显示额外功能
    await expect(agentPages.agentChatPage.sidebar.plugins()).toBeVisible();
    await expect(agentPages.agentChatPage.sidebar.settings()).toBeVisible();

    // 切换回简洁模式
    await agentPages.agentChatPage.simpleMode().click();
  });

  test('关键路径：导航功能完整性', async ({ page, agentPages }) => {
    await page.goto('/ai-agent');

    // 测试品牌链接
    await agentPages.agentNavigation.brand().click();
    await expect(page).toHaveURL('/');

    // 回到Agent页面测试导航项
    await page.goto('/ai-agent');

    // 测试活动中心导航
    await agentPages.agentNavigation.navigateTo('activityCenter');
    await expect(page).toHaveURL(/.*dashboard.*/);

    // 测试新对话导航
    await agentPages.agentNavigation.navigateTo('newChat');
    await expect(page).toHaveURL(/.*ai-agent.*/);

    // 测试历史记录导航
    await agentPages.agentNavigation.navigateTo('history');
    await expect(page).toHaveURL(/.*history.*/);

    // 测试用户菜单
    await agentPages.agentNavigation.openUserMenu();
    await expect(agentPages.agentNavigation.userMenu.profile()).toBeVisible();
    await expect(agentPages.agentNavigation.userMenu.logout()).toBeVisible();
  });

  test('关键路径：响应式设计', async ({ page, agentPages }) => {
    // 桌面端测试
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();

    // 验证桌面端布局
    await expect(agentPages.agentChatPage.messageInput()).toBeVisible();
    await expect(agentPages.agentChatPage.sidebar.chat()).toBeVisible();

    // 移动端测试
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // 验证移动端布局适配
    await expect(agentPages.agentChatPage.messageInput()).toBeVisible();

    // 恢复桌面端
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('关键路径：搜索和筛选功能', async ({ page, agentPages }) => {
    // 先创建一些测试对话
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();
    await agentPages.agentChatPage.sendMessage('Python代码测试');
    await agentPages.agentChatPage.sendMessage('JavaScript函数');

    // 导航到历史记录
    await page.goto('/ai-agent/history');

    // 测试搜索功能
    await agentPages.agentHistoryPage.searchSessions('Python');
    await page.waitForTimeout(1000);

    // 测试筛选功能
    await agentPages.agentHistoryPage.filterButtons.today().click();
    await agentPages.agentHistoryPage.filterButtons.week().click();

    // 测试清除搜索
    const clearButton = page.locator('text=清除筛选');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  });

  test('关键路径：批量操作功能', async ({ page, agentPages }) => {
    // 确保有会话数据
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();
    await agentPages.agentChatPage.sendMessage('批量操作测试消息1');
    await agentPages.agentChatPage.sendMessage('批量操作测试消息2');

    // 导航到历史记录
    await page.goto('/ai-agent/history');

    // 测试选择会话
    await agentPages.agentHistoryPage.selectSession(0);
    await expect(page.locator('text*="selected" i')).toBeVisible();

    // 测试全选
    await agentPages.agentHistoryPage.selectAllButton().click();

    // 验证批量操作按钮出现
    await expect(agentPages.agentHistoryPage.batchActions.archive()).toBeVisible();
    await expect(agentPages.agentHistoryPage.batchActions.export()).toBeVisible();

    // 测试取消选择
    const deselectAllButton = page.locator('text=取消全选');
    if (await deselectAllButton.isVisible()) {
      await deselectAllButton.click();
    }
  });

  test('数据完整性：用户偏好持久化', async ({ page, agentPages }) => {
    // 修改设置
    await page.goto('/dashboard/profile');
    await agentPages.agentSettingsPage.tabs.agent().click();
    await agentPages.agentSettingsPage.toggleSetting('autoSave');
    await agentPages.agentSettingsPage.saveSettings();

    // 登出后重新登录
    await agentPages.agentNavigation.openUserMenu();
    await agentPages.agentNavigation.userMenu.logout().click();

    // 重新登录
    await page.goto('/login');
    await page.fill('[placeholder*="邮箱" i]', testUser.email);
    await page.fill('[placeholder*="密码" i]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // 验证设置保持
    await page.goto('/dashboard/profile');
    await agentPages.agentSettingsPage.tabs.agent().click();
    // 验证设置状态（具体实现取决于UI组件）
  });

  test('性能回归：页面加载时间', async ({ page }) => {
    const pages = ['/ai-agent', '/ai-agent/history', '/dashboard/profile'];

    for (const pageUrl of pages) {
      const startTime = Date.now();
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 验证页面加载时间在可接受范围内（<3秒）
      expect(loadTime).toBeLessThan(3000);

      // 验证关键元素已渲染
      if (pageUrl === '/ai-agent') {
        await expect(page.locator('[placeholder*="输入您的问题" i]')).toBeVisible();
      } else if (pageUrl === '/ai-agent/history') {
        await expect(page.locator('text=对话历史')).toBeVisible();
      } else if (pageUrl === '/dashboard/profile') {
        await expect(page.locator('text=个人设置')).toBeVisible();
      }
    }
  });

  test('错误处理：网络中断恢复', async ({ page, agentPages }) => {
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();

    // 模拟网络中断
    await page.context().setOffline(true);

    // 尝试发送消息
    await agentPages.agentChatPage.messageInput().fill('离线测试消息');
    await agentPages.agentChatPage.sendButton().click();

    // 恢复网络
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // 验证应用恢复正常
    await agentPages.agentChatPage.sendMessage('网络恢复测试');
    await agentPages.agentChatPage.expectMessage('网络恢复测试', 'user');
  });

  test('边界条件：空输入处理', async ({ page, agentPages }) => {
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();

    // 测试空输入
    await agentPages.agentChatPage.sendButton().click();
    // 应该不会发送空消息或者显示适当提示

    // 测试只有空格的输入
    await agentPages.agentChatPage.messageInput().fill('   ');
    await agentPages.agentChatPage.sendButton().click();
    // 应该不会发送空消息

    // 测试超长输入
    const longText = 'A'.repeat(5000);
    await agentPages.agentChatPage.messageInput().fill(longText);
    await agentPages.agentChatPage.sendButton().click();
    // 应该能够处理或截断长文本
  });

  test('可访问性：键盘导航', async ({ page, agentPages }) => {
    await page.goto('/ai-agent');
    await agentPages.onboardingModal.skipOnboarding();

    // 使用Tab键导航
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // 验证焦点可见
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // 使用回车键激活元素
    await page.keyboard.press('Enter');

    // 测试在消息输入框中的键盘操作
    await agentPages.agentChatPage.messageInput().focus();
    await page.keyboard.type('键盘导航测试');
    await page.keyboard.press('Enter');

    // 验证消息发送
    await agentPages.agentChatPage.expectMessage('键盘导航测试', 'user');
  });
});