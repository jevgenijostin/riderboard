import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { maximumDoc } from './fixtures';
import type { Doc } from '../src/model/types';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  page.on('console', (message) => {
    if (message.type() === 'error') throw new Error(message.text());
  });
  page.on('request', (request) => {
    expect(new URL(request.url()).hostname).toBe('127.0.0.1');
  });
});
const state = (page: Page): Promise<Doc> =>
  page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem('riderboard:v1')!);
    return library.bands.find((b: { id: string }) => b.id === library.activeId);
  });
async function selectItem(page: Page, name: string) {
  await page
    .locator('#stage [data-item]')
    .filter({ has: page.locator('title', { hasText: `${name} ·` }) })
    .press('Enter');
}
async function keysSetup(page: Page) {
  await page.goto('./');
  await page.locator('[data-preset="keys"]').click();
  await page.locator('[data-preset="stereoDi"]').click();
  const d = await state(page),
    di = d.items.find((i) => i.kind === 'di')!;
  await selectItem(page, 'Keys stereo');
  await page.locator('[data-leg-field="diId"]').nth(0).selectOption(di.id);
  await page.locator('[data-leg-field="diId"]').nth(1).selectOption(di.id);
  await page.locator('[data-leg-field="channel"]').nth(0).fill('3');
  await page.locator('[data-leg-field="channel"]').nth(0).press('Tab');
  await page.locator('[data-leg-field="channel"]').nth(1).fill('4');
  await page.locator('[data-leg-field="channel"]').nth(1).press('Tab');
}
async function importDoc(page: Page, doc: Doc | string) {
  await page.locator('#import-file').setInputFiles({
    name: 'rider.json',
    mimeType: 'application/json',
    buffer: Buffer.from(typeof doc === 'string' ? doc : JSON.stringify(doc)),
  });
}
test('E1 place, drag and nudge an item', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load example band' }).click();
  const item = page.locator('#stage [data-item]').first();
  const box = (await item.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  const x = Number(await page.getByLabel('X · metres').inputValue());
  expect(x).toBeGreaterThan(4);
  await item.press('ArrowLeft');
  await expect(page.getByLabel('X · metres')).toHaveValue(String(Math.round((x - 0.1) * 20) / 20));
  await item.press('Shift+ArrowLeft');
  await expect(page.getByLabel('X · metres')).toHaveValue(String(Math.round((x - 0.6) * 20) / 20));
});
test('E10 audience bottom, stage left on screen right', async ({ page }) => {
  await page.goto('./');
  const stage = (await page.locator('#stage .stage-surface').boundingBox())!;
  const left = (await page.locator('#stage [data-orientation="left"]').boundingBox())!;
  const right = (await page.locator('#stage [data-orientation="right"]').boundingBox())!;
  const audience = (await page.locator('#stage [data-orientation="audience"]').boundingBox())!;
  expect(left.x).toBeGreaterThan(stage.x + stage.width);
  expect(right.x + right.width).toBeLessThan(stage.x);
  expect(audience.y).toBeGreaterThan(stage.y + stage.height);
});
test('E2 explicit stereo DI routing agrees across tables and badges', async ({ page }) => {
  await keysSetup(page);
  await expect(page.locator('#input-list tbody tr')).toHaveCount(2);
  await expect(page.locator('#input-list')).toContainText('Keys stereo L');
  await expect(page.locator('#input-list')).toContainText('Keys stereo R');
  await expect(page.locator('#input-list tbody tr').first()).toContainText('DI box stereo');
  await page.locator('[data-tab="equipment"]').click();
  await expect(page.locator('[data-count="Console inputs"]')).toHaveText('2');
  await expect(page.locator('[data-count="Stereo DIs"]')).toHaveText('1');
  await expect(page.locator('#stage [data-item]').first().locator('.unconfirmed-badge')).toHaveText(
    'unconfirmed',
  );
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('#stage [data-item]').first().locator('.unconfirmed-badge')).toHaveCount(0);
});
test('E3 duplicate channel warning selects source and clears after fix', async ({ page }) => {
  await keysSetup(page);
  await page.locator('[data-leg-field="channel"]').nth(1).fill('3');
  await page.locator('[data-leg-field="channel"]').nth(1).press('Tab');
  await page.locator('[data-tab="warnings"]').click();
  await expect(page.locator('[data-rule="CH_DUPLICATE"]')).toHaveCount(2);
  await page.locator('[data-rule="CH_DUPLICATE"]').first().click();
  await expect(page.locator('.inspector h2')).toHaveText('Keys stereo');
  await page.locator('[data-leg-field="channel"]').nth(1).fill('4');
  await page.locator('[data-leg-field="channel"]').nth(1).press('Tab');
  await expect(page.locator('[data-rule="CH_DUPLICATE"]')).toHaveCount(0);
  await page.locator('[data-tab="inputs"]').click();
  await expect(page.getByLabel('Channel for Keys stereo R')).toHaveValue('4');
});
test('E4 two wedges share a mix and movement preserves monitor assignments', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load example band' }).click();
  await page.locator('[data-tab="monitors"]').click();
  await page.locator('#monitor-matrix input').first().check();
  const before = await state(page);
  const wedges = before.items.filter((i) => i.kind === 'wedge');
  expect(wedges).toHaveLength(2);
  expect(wedges[0].mixId).toBe(wedges[1].mixId);
  const performer = page.locator(
      `#stage [data-item="${before.items.find((i) => i.name === 'Alex · vocal')!.id}"]`,
    ),
    box = (await performer.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y - 30, { steps: 5 });
  await page.mouse.up();
  const after = await state(page);
  expect(after.mixes).toEqual(before.mixes);
  expect(after.matrix).toEqual(before.matrix);
  expect(after.items.map((i) => [i.id, i.mixId, i.monitorType, i.monitorMixId])).toEqual(
    before.items.map((i) => [i.id, i.mixId, i.monitorType, i.monitorMixId]),
  );
  await expect(page.locator('#monitor-matrix input').first()).toBeChecked();
});
test('E5 export, restore and import preserve plot and derived paperwork', async ({ page }) => {
  await keysSetup(page);
  const expected = await state(page),
    text = await page.locator('#paperwork').textContent();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloadEvent;
  const exported = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(exported)).toEqual(expected);
  await page.reload();
  expect(await state(page)).toEqual(expected);
  expect(await page.locator('#paperwork').textContent()).toBe(text);
  await page.locator('[data-action="clear"]').click();
  await page.getByRole('button', { name: 'Clear all data', exact: true }).click();
  await importDoc(page, exported);
  await expect(page.getByRole('status')).toContainText('JSON imported');
  expect(await state(page)).toEqual(expected);
  expect(await page.locator('#paperwork').textContent()).toBe(text);
});
test('E6 DI cascade confirmation reports re-pointed legs', async ({ page }) => {
  await keysSetup(page);
  await selectItem(page, 'DI box stereo');
  await page.locator('[data-action="delete-item"]').click();
  await expect(page.locator('dialog')).toContainText('2 re-pointed legs');
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await selectItem(page, 'Keys stereo');
  await expect(page.locator('[data-leg-field="connection"]').nth(0)).toHaveValue('unset');
  await expect(page.locator('[data-leg-field="connection"]').nth(1)).toHaveValue('unset');
  await page.locator('[data-tab="warnings"]').click();
  await expect(page.locator('[data-rule="LEG_UNSET"]')).toHaveCount(2);
});
test('E7 invalid JSON leaves current document untouched', async ({ page }) => {
  await keysSetup(page);
  const expected = await state(page);
  await importDoc(page, '{oops');
  await expect(page.getByRole('status')).toContainText('Invalid JSON');
  expect(await state(page)).toEqual(expected);
});
test('E8 free band limit and printed watermark, generated key unlocks Pro', async ({ page }) => {
  await page.goto('./');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.watermark')).toHaveText('Made with RiderBoard (free)');
  await page.emulateMedia({ media: 'screen' });
  await page.locator('[data-action="new-band"]').click();
  await expect(page.locator('dialog')).toContainText('Keep another band with Pro');
  const key = execFileSync(process.execPath, ['scripts/gen-key.mjs'], { encoding: 'utf8' }).trim();
  await page.getByLabel('Demo license key').fill(key);
  await page.getByRole('button', { name: 'Activate key' }).click();
  await page.locator('[data-action="new-band"]').click();
  await expect(page.locator('#band-switcher option')).toHaveCount(2);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.watermark')).toHaveCount(0);
});
test('E9 maximum document prints legibly across pages with repeated footer', async ({ page }, testInfo) => {
  await page.goto('./');
  await importDoc(page, maximumDoc());
  await expect(page.getByRole('status')).toContainText('JSON imported');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#print-inputs tbody tr')).toHaveCount(64);
  await expect(page.locator('#print-matrix tbody tr')).toHaveCount(48);
  await expect(page.locator('#print-stage [data-item]')).toHaveCount(60);
  const geometry = await page.evaluate(() => {
    const plot = document.querySelector('#print-stage')!.getBoundingClientRect(),
      section = document.querySelector('.print-plot')!.getBoundingClientRect();
    return {
      plot: { x: plot.x, y: plot.y, right: plot.right, bottom: plot.bottom },
      section: { x: section.x, y: section.y, right: section.right, bottom: section.bottom },
      clipped: [...document.querySelectorAll('#print-rider td,#print-rider th')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent),
      small: [...document.querySelectorAll('#print-rider td,#print-rider th,.print-footer')]
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 10.66)
        .map((el) => el.textContent),
      rowBreaks: [...document.querySelectorAll('#print-rider tr')].every(
        (el) => getComputedStyle(el).breakInside === 'avoid',
      ),
    };
  });
  expect(geometry.clipped).toEqual([]);
  expect(geometry.small).toEqual([]);
  expect(geometry.rowBreaks).toBe(true);
  expect(geometry.plot.x).toBeGreaterThanOrEqual(geometry.section.x);
  expect(geometry.plot.right).toBeLessThanOrEqual(geometry.section.right + 1);
  expect(geometry.plot.bottom).toBeLessThanOrEqual(geometry.section.bottom + 1);
  const path = testInfo.outputPath('maximum-rider.pdf'),
    bytes = await page.pdf({
      path,
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    });
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  expect(pdf.numPages).toBeGreaterThanOrEqual(2);
  let printedInputRows = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const pdfPage = await pdf.getPage(n),
      content = await pdfPage.getTextContent();
    const items = content.items.filter((i) => 'str' in i);
    const text = items.map((i) => i.str).join(' ');
    expect(text).toContain('Made with RiderBoard (free)');
    expect(text).toContain('Planning aid only.');
    expect(
      items.filter((i) => i.str.trim() && i.height > 0 && i.height < 7.99).map((i) => [i.str, i.height]),
    ).toEqual([]);
    // Every input-page fragment must repeat its headings, and each channel must have its final cell on that same page.
    if (items.some((i) => i.str === 'Confirmed')) {
      expect(items.some((i) => i.str === 'CH')).toBe(true);
      const channels = items.filter((i) => /^\d+$/.test(i.str) && i.transform[4] < 50);
      const ends = items.filter((i) => i.str === 'unconfirmed');
      expect(channels.length).toBe(ends.length);
      printedInputRows += channels.length;
    }
  }
  expect(printedInputRows).toBe(64);
  await page.locator('.print-plot').screenshot({ path: testInfo.outputPath('maximum-plot.png') });
  await page.screenshot({ path: testInfo.outputPath('maximum-rider.png'), fullPage: true });
  await testInfo.attach('Maximum rider PDF', { path, contentType: 'application/pdf' });
});
test('offline reload restores the band and all editing remains local', async ({ page, context }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load example band' }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Band name')).toHaveValue('The Signal Club');
  await page.locator('[data-preset="keys"]').click();
  await expect(page.locator('.inspector h2')).toHaveText('Keys stereo');
  expect((await state(page)).sources).toHaveLength(12);
});
test('palette drop sets coordinates, stage resize clamps, and auto-number is explicit', async ({ page }) => {
  await page.goto('./');
  await page
    .locator('[data-preset="vocal"]')
    .dragTo(page.locator('#stage'), { targetPosition: { x: 150, y: 100 } });
  await expect(page.locator('#stage [data-item]')).toHaveCount(1);
  expect((await state(page)).sources[0].legs[0].channel).toBeNull();
  await page.locator('[data-action="auto-number"]').click();
  expect((await state(page)).sources[0].legs[0].channel).toBe(1);
  await page.getByLabel('X · metres').fill('7');
  await page.getByLabel('X · metres').press('Tab');
  await page.getByLabel('Width · m').fill('3');
  await page.getByLabel('Width · m').press('Tab');
  await expect(page.getByLabel('X · metres')).toHaveValue('3');
});
test('typing then clicking Export commits the field and downloads on the first click', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Band name').fill('First-click band');
  const downloaded = page.waitForEvent('download', { timeout: 5000 });
  await page.locator('[data-action="export"]').click();
  const file = await downloaded;
  expect(JSON.parse(await readFile((await file.path())!, 'utf8')).name).toBe('First-click band');
});
