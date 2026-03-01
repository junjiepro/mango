import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Mango');
    await expect(page.locator('p')).toContainText('智能Agent对话平台');
  });
});
