import { test, expect } from '@playwright/test';
test('loads', async ({ page }) => { await page.goto('./'); await expect(page.locator('#app')).toContainText('RiderBoard'); });
