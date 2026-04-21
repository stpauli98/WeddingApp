import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders hero heading on the Serbian homepage', async ({ page }) => {
    await page.goto('/sr');
    await expect(page.locator('h1#hero-heading')).toBeVisible();
  });

  test('renders hero heading on the English homepage', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('h1#hero-heading')).toBeVisible();
  });
});
