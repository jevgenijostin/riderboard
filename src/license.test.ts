import { expect, test, vi, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { validateKey, activate, deactivate, getTier, canAddBand } from './license';
import { checksum, generateKey } from './license-key';
afterEach(() => vi.unstubAllGlobals());
test('FNV-1a known vector and generator CLI', () => {
  expect(checksum('hello')).toBe('4F9F');
  const key = execFileSync(process.execPath, ['scripts/gen-key.mjs'], { encoding: 'utf8' }).trim();
  expect(validateKey(key)).toBe(true);
});
test('key format, altered key, whitespace and case', () => {
  const key = generateKey('ABCD', '1234');
  expect(validateKey(key)).toBe(true);
  expect(validateKey(`  ${key.toLowerCase()}\n`)).toBe(true);
  expect(validateKey(`${key.slice(0, -1)}${key.endsWith('0') ? '1' : '0'}`)).toBe(false);
  expect(validateKey('RB-ZZZZ-1234-ABCD')).toBe(false);
  expect(validateKey('')).toBe(false);
});
test('storage activation/deactivation and band gating', () => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
  expect(getTier()).toBe('free');
  expect(canAddBand(getTier(), 1)).toBe(false);
  expect(activate('wrong')).toBe(false);
  expect(activate(generateKey('AAAA', 'BBBB'))).toBe(true);
  expect(getTier()).toBe('pro');
  expect(canAddBand(getTier(), 20)).toBe(true);
  deactivate();
  expect(getTier()).toBe('free');
});
test('unavailable storage degrades to free', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
    removeItem: () => {
      throw Error();
    },
  });
  expect(getTier()).toBe('free');
  expect(activate(generateKey('AAAA', 'BBBB'))).toBe(false);
  expect(deactivate()).toBe(false);
});
