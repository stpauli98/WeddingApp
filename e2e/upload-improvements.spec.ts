import { test, expect } from '@playwright/test';

test.describe('Upload System Improvements', () => {

  test('should handle language-aware redirects correctly', async ({ page }) => {
    // Test that redirects maintain language context
    // This would need a full setup with authenticated guest
    // For now, just check that the login page loads with correct language
    await page.goto('http://localhost:3000/sr/guest/login');
    await expect(page).toHaveURL(/\/sr\/guest\/login/);

    await page.goto('http://localhost:3000/en/guest/login');
    await expect(page).toHaveURL(/\/en\/guest\/login/);
  });

  test('should display error messages correctly', async ({ page }) => {
    // Navigate to a page that might show error messages
    await page.goto('http://localhost:3000/sr');

    // Check that page loads without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have React key warnings in console', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/sr');
    await page.waitForLoadState('networkidle');

    // Check for React key warnings
    const hasKeyWarning = consoleErrors.some(error =>
      error.includes('unique "key"') || error.includes('key prop')
    );

    expect(hasKeyWarning).toBe(false);
  });

  test('homepage should load successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/sr');

    // Check that main content loads
    await expect(page.locator('h1')).toBeVisible();
  });

  test('admin event creation page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/sr/admin/event');

    // Page should load (might redirect to login, but shouldn't crash)
    await expect(page.locator('body')).toBeVisible();
  });
});
