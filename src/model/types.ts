export const STANDS = ['unset', 'handheld', 'short', 'tall', 'straight', 'clamp', 'none'] as const;
export const CONNECTIONS = ['unset', 'mic', 'line', 'di', 'notSent'] as const;
export type Stand = typeof STANDS[number];
export interface Leg { id: string; connection: typeof CONNECTIONS[number]; diId: string | null; phantom: 'unknown' | 'yes' | 'no'; channel: number | null }
export interface Source { id: string; itemId: string; name: string; outputs: 1 | 2; legs: Leg[]; stand: Stand; micModel: string; confirmed: boolean }
export interface Item {
  id: string; kind: 'performer' | 'instrument' | 'amp' | 'wedge' | 'di' | 'power'; name: string;
  x: number; y: number; rot: 0 | 90 | 180 | 270;
  monitorType?: 'unset' | 'none' | 'wedge' | 'iem'; monitorMixId?: string | null;
  mixId?: string | null; diCapacity?: 1 | 2; needsPower?: boolean;
}
export interface Mix { id: string; name: string; kind: 'wedge' | 'iem' | 'fixed' }
export interface Doc { version: 1; id: string; name: string; seq: number; stage: { widthM: number; depthM: number }; consoleChannels: number; items: Item[]; sources: Source[]; mixes: Mix[]; matrix: Record<string, true>; notes: string }
export interface Result { doc: Doc; error?: string }
export const CAPS = { items: 60, sources: 48, legs: 64, mixes: 12 } as const;
export const sent = (leg: Leg) => ['mic', 'line', 'di'].includes(leg.connection);
export const position = (n: number, max: number) => Math.round(Math.min(max, Math.max(0, n)) * 20) / 20;
