import { test, expect, type Page } from '@playwright/test'

// Test configuration
const TEST_EMAIL = 'test-user@example.com'
const TEST_PASSWORD = 'TestPassword123'
const WEAK_PASSWORD = 'weak'
const INVALID_EMAIL = 'invalid-email'

// Helper functions for form filling
async function fillRegistrationForm(page: Page, email: string, password: string) {
  await page.fill('[placeholder="请输入邮箱地址"]', email)
  await page.fill('[placeholder="请输入密码"]', password)
  await page.fill('[placeholder="请再次输入密码"]', password)
}

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('[placeholder="请输入邮箱地址"]', email)
  await page.fill('[placeholder="请输入密码"]', password)
}

test.describe('Authentication Flow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the home page
    await page.goto('/')
  })

  test.describe('User Registration', () => {
    test('should navigate to registration and show form', async ({ page }) => {
      // Navigate to registration page
      await page.goto('/register')

      // Verify we're on the registration page
      await expect(page).toHaveTitle(/.*/)
      await expect(page.locator('h2')).toContainText('创建新账户')

      // Fill the registration form
      await fillRegistrationForm(page, TEST_EMAIL, TEST_PASSWORD)

      // Verify form can be filled
      await expect(page.locator('[placeholder="请输入邮箱地址"]')).toHaveValue(TEST_EMAIL)
      await expect(page.locator('[placeholder="请输入密码"]')).toHaveValue(TEST_PASSWORD)
    })

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/register')

      // Fill form with invalid email
      await fillRegistrationForm(page, INVALID_EMAIL, TEST_PASSWORD)

      // Submit the form
      await page.click('text=注册')

      // Should show email validation error
      await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible()
    })

    test('should show validation errors for weak password', async ({ page }) => {
      await page.goto('/register')

      // Fill form with weak password
      await fillRegistrationForm(page, TEST_EMAIL, WEAK_PASSWORD)

      // Submit the form
      await page.click('text=注册')

      // Should show password validation error
      await expect(page.locator('text=密码至少需要8个字符')).toBeVisible()
    })

    test('should show error when passwords do not match', async ({ page }) => {
      await page.goto('/register')

      // Fill form with mismatched passwords
      await page.fill('[placeholder="请输入邮箱地址"]', TEST_EMAIL)
      await page.fill('[placeholder="请输入密码"]', TEST_PASSWORD)
      await page.fill('[placeholder="请再次输入密码"]', 'DifferentPassword123')

      // Submit the form
      await page.click('text=注册')

      // Should show password mismatch error
      await expect(page.locator('text=确认密码不匹配')).toBeVisible()
    })
  })

  test.describe('User Login', () => {
    test('should navigate to login and show form', async ({ page }) => {
      await page.goto('/login')

      // Verify we're on the login page
      await expect(page.locator('h2')).toContainText('登录您的账户')

      // Fill the login form
      await fillLoginForm(page, TEST_EMAIL, TEST_PASSWORD)

      // Verify form can be filled
      await expect(page.locator('[placeholder="请输入邮箱地址"]')).toHaveValue(TEST_EMAIL)
      await expect(page.locator('[placeholder="请输入密码"]')).toHaveValue(TEST_PASSWORD)
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login')

      // Submit form without filling fields
      await page.click('text=登录')

      // Should show validation errors
      await expect(page.locator('text=邮箱不能为空')).toBeVisible()
      await expect(page.locator('text=密码不能为空')).toBeVisible()
    })

    test('should navigate to registration page from login', async ({ page }) => {
      await page.goto('/login')

      // Click on registration link
      await page.click('text=立即注册')

      // Should navigate to registration page
      await expect(page).toHaveURL('/register')
    })

    test('should navigate to forgot password page from login', async ({ page }) => {
      await page.goto('/login')

      // Click on forgot password link
      await page.click('text=忘记密码')

      // Should navigate to forgot password page
      await expect(page).toHaveURL('/forgot-password')
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should display forgot password page correctly', async ({ page }) => {
      await page.goto('/forgot-password')

      // Verify we're on the forgot password page
      await expect(page.locator('h2')).toContainText('忘记密码')

      // Fill email field
      await page.fill('[placeholder="请输入邮箱地址"]', TEST_EMAIL)

      // Verify form can be filled
      await expect(page.locator('[placeholder="请输入邮箱地址"]')).toHaveValue(TEST_EMAIL)
    })

    test('should show error for invalid email in password reset', async ({ page }) => {
      await page.goto('/forgot-password')

      // Fill with invalid email
      await page.fill('[placeholder="请输入邮箱地址"]', INVALID_EMAIL)

      // Submit the form
      await page.click('text=发送重置链接')

      // Should show validation error
      await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible()
    })
  })

  test.describe('Protected Route Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected dashboard without login
      await page.goto('/dashboard')

      // Should redirect to login page
      await expect(page).toHaveURL('/login')
    })

    test('should redirect unauthenticated users from profile page', async ({ page }) => {
      // Try to access profile without login
      await page.goto('/dashboard/profile')

      // Should redirect to login page
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Navigation and UI', () => {
    test('should have working navigation links', async ({ page }) => {
      // Start from home page
      await page.goto('/')

      // Should have login and register buttons
      await expect(page.locator('text=登录')).toBeVisible()
      await expect(page.locator('text=注册')).toBeVisible()

      // Test navigation to login
      await page.click('text=登录')
      await expect(page).toHaveURL('/login')

      // Navigate back to home
      await page.goto('/')

      // Test navigation to register
      await page.click('text=注册')
      await expect(page).toHaveURL('/register')
    })

    test('should be responsive on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/login')

      // Should still be usable on mobile
      await expect(page.locator('h2')).toContainText('登录您的账户')
      await expect(page.locator('[placeholder="请输入邮箱地址"]')).toBeVisible()
      await expect(page.locator('[placeholder="请输入密码"]')).toBeVisible()
      await expect(page.locator('text=登录')).toBeVisible()
    })
  })
})