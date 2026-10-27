import { test, expect } from '@playwright/test';
test('E1 place, drag and nudge an item', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load example band' }).click();
  const item = page.locator('[data-item]').first();
  const box = (await item.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 30, { steps: 6 }); await page.mouse.up();
  const x = Number(await page.getByLabel('X · metres').inputValue());
  expect(x).toBeGreaterThan(4);
  await item.press('ArrowLeft');
  await expect(page.getByLabel('X · metres')).toHaveValue(String(Math.round((x - 0.1) * 20) / 20));
  await item.press('Shift+ArrowLeft');
  await expect(page.getByLabel('X · metres')).toHaveValue(String(Math.round((x - 0.6) * 20) / 20));
});
test('E10 audience bottom, stage left on screen right', async ({ page }) => {
  await page.goto('./');
  const stage = (await page.locator('.stage-surface').boundingBox())!;
  const left = (await page.locator('[data-orientation="left"]').boundingBox())!;
  const right = (await page.locator('[data-orientation="right"]').boundingBox())!;
  const audience = (await page.locator('[data-orientation="audience"]').boundingBox())!;
  expect(left.x).toBeGreaterThan(stage.x + stage.width); expect(right.x + right.width).toBeLessThan(stage.x); expect(audience.y).toBeGreaterThan(stage.y + stage.height);
});
