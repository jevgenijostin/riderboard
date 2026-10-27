import { validateKey } from './license-key';
export { validateKey } from './license-key';
export type Tier = 'free' | 'pro';
export function getTier(): Tier {
  try {
    return validateKey(localStorage.getItem('riderboard:license') ?? '') ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}
export function activate(key: string): boolean {
  if (!validateKey(key)) return false;
  try {
    localStorage.setItem('riderboard:license', key.trim().toUpperCase());
    return true;
  } catch {
    return false;
  }
}
export function deactivate(): boolean {
  try {
    localStorage.removeItem('riderboard:license');
    return true;
  } catch {
    return false;
  }
}
export const canAddBand = (tier: Tier, currentCount: number) => tier === 'pro' || currentCount < 1;
