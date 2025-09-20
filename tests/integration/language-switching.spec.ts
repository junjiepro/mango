import { test, expect } from '@playwright/test'

/**
 * 端到端语言切换测试
 * 测试完整的用户语言切换体验，包括持久化和页面重新渲染
 */

test.describe('语言切换功能', () => {
  test.beforeEach(async ({ page }) => {
    // 清除所有 cookies 以确保测试开始时没有语言偏好
    await page.context().clearCookies()
  })

  test('应该显示默认语言（中文）', async ({ page }) => {
    await page.goto('/')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 检查页面是否显示中文内容
    await expect(page.locator('text=登录')).toBeVisible()

    // 检查语言切换器是否存在
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await expect(languageSwitcher).toBeVisible()
  })

  test('应该能够切换到英文', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 找到语言切换器并点击
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()

    // 选择英文选项
    await page.locator('[data-value="en"]').click()

    // 等待页面重新加载
    await page.waitForLoadState('networkidle')

    // 检查页面是否显示英文内容
    await expect(page.locator('text=Login')).toBeVisible()
    await expect(page.locator('text=登录')).not.toBeVisible()
  })

  test('应该能够从英文切换回中文', async ({ page }) => {
    // 首先设置为英文
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // 验证当前是英文
    await expect(page.locator('text=Login')).toBeVisible()

    // 切换到中文
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()
    await page.locator('[data-value="zh"]').click()

    // 等待页面重新加载
    await page.waitForLoadState('networkidle')

    // 检查页面是否显示中文内容
    await expect(page.locator('text=登录')).toBeVisible()
    await expect(page.locator('text=Login')).not.toBeVisible()
  })

  test('语言偏好应该在页面重新加载后保持', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 切换到英文
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()
    await page.locator('[data-value="en"]').click()
    await page.waitForLoadState('networkidle')

    // 验证英文内容
    await expect(page.locator('text=Login')).toBeVisible()

    // 重新加载页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 验证语言偏好是否保持
    await expect(page.locator('text=Login')).toBeVisible()
    await expect(page.locator('text=登录')).not.toBeVisible()
  })

  test('语言偏好应该在新标签页中保持', async ({ context }) => {
    const page1 = await context.newPage()
    await page1.goto('/')
    await page1.waitForLoadState('networkidle')

    // 在第一个标签页切换到英文
    const languageSwitcher = page1.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()
    await page1.locator('[data-value="en"]').click()
    await page1.waitForLoadState('networkidle')

    // 验证英文内容
    await expect(page1.locator('text=Login')).toBeVisible()

    // 打开新标签页
    const page2 = await context.newPage()
    await page2.goto('/')
    await page2.waitForLoadState('networkidle')

    // 验证新标签页也是英文
    await expect(page2.locator('text=Login')).toBeVisible()
    await expect(page2.locator('text=登录')).not.toBeVisible()

    await page1.close()
    await page2.close()
  })

  test('URL 路径应该反映当前语言', async ({ page }) => {
    // 访问中文页面
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 切换到英文
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()
    await page.locator('[data-value="en"]').click()
    await page.waitForLoadState('networkidle')

    // 检查 URL 是否包含 /en 前缀
    expect(page.url()).toContain('/en')

    // 切换回中文
    await languageSwitcher.click()
    await page.locator('[data-value="zh"]').click()
    await page.waitForLoadState('networkidle')

    // 检查 URL 是否不包含语言前缀（默认语言）
    expect(page.url()).not.toContain('/en')
    expect(page.url()).not.toContain('/zh')
  })

  test('应该在认证表单中正确显示翻译文本', async ({ page }) => {
    // 测试登录页面
    await page.goto('/zh/login')
    await page.waitForLoadState('networkidle')

    // 检查中文标签
    await expect(page.locator('label[for="email"]')).toContainText('邮箱')
    await expect(page.locator('label[for="password"]')).toContainText('密码')
    await expect(page.locator('button[type="submit"]')).toContainText('登录')

    // 切换到英文
    await page.goto('/en/login')
    await page.waitForLoadState('networkidle')

    // 检查英文标签
    await expect(page.locator('label[for="email"]')).toContainText('Email')
    await expect(page.locator('label[for="password"]')).toContainText('Password')
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In')
  })

  test('应该在注册页面中正确显示翻译文本', async ({ page }) => {
    // 测试注册页面中文
    await page.goto('/zh/register')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('label[for="email"]')).toContainText('邮箱')
    await expect(page.locator('label[for="password"]')).toContainText('密码')
    await expect(page.locator('button[type="submit"]')).toContainText('注册')

    // 测试注册页面英文
    await page.goto('/en/register')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('label[for="email"]')).toContainText('Email')
    await expect(page.locator('label[for="password"]')).toContainText('Password')
    await expect(page.locator('button[type="submit"]')).toContainText('Sign Up')
  })

  test('导航栏应该在语言切换后显示正确的文本', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查中文导航
    const navbar = page.locator('nav')
    await expect(navbar).toContainText('登录')
    await expect(navbar).toContainText('注册')

    // 切换到英文
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await languageSwitcher.click()
    await page.locator('[data-value="en"]').click()
    await page.waitForLoadState('networkidle')

    // 检查英文导航
    await expect(navbar).toContainText('Login')
    await expect(navbar).toContainText('Register')
    await expect(navbar).not.toContainText('登录')
    await expect(navbar).not.toContainText('注册')
  })

  test('语言切换器应该显示当前选中的语言', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 检查默认选中中文
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await expect(languageSwitcher).toContainText('中文')

    // 切换到英文
    await languageSwitcher.click()
    await page.locator('[data-value="en"]').click()
    await page.waitForLoadState('networkidle')

    // 检查当前选中英文
    await expect(languageSwitcher).toContainText('English')
    await expect(languageSwitcher).not.toContainText('中文')
  })

  test('应该处理无效的语言路径', async ({ page }) => {
    // 访问无效的语言路径
    await page.goto('/invalid-locale')
    await page.waitForLoadState('networkidle')

    // 应该重定向到默认语言（中文）
    expect(page.url()).not.toContain('/invalid-locale')
    await expect(page.locator('text=登录')).toBeVisible()
  })

  test('页面标题应该根据语言正确翻译', async ({ page }) => {
    // 中文页面标题
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const title = await page.title()
    expect(title).toContain('芒果') // 假设应用名称是芒果

    // 英文页面标题
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const englishTitle = await page.title()
    expect(englishTitle).toContain('Mango') // 英文应用名称
  })
})

test.describe('错误场景测试', () => {
  test('网络错误时语言切换应该有适当的回退', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 模拟网络错误
    await page.route('**/*', route => route.abort())

    const languageSwitcher = page.locator('[data-testid="language-switcher"]')

    // 尝试切换语言，应该不会导致应用崩溃
    await expect(async () => {
      await languageSwitcher.click()
    }).not.toThrow()
  })

  test('JavaScript 禁用时语言切换应该降级', async ({ browser }) => {
    // 创建禁用 JavaScript 的上下文
    const context = await browser.newContext({
      javaScriptEnabled: false
    })

    const page = await context.newPage()
    await page.goto('/')

    // 语言切换器应该仍然可见（即使可能不完全功能）
    const languageSwitcher = page.locator('[data-testid="language-switcher"]')
    await expect(languageSwitcher).toBeVisible()

    await context.close()
  })
})