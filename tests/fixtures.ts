import type { Doc } from '../src/model/types';
export function maximumDoc(): Doc {
  return {
    version: 1,
    id: 'maxBand',
    name: 'Maximum-size advance · The Signal Club',
    seq: 1000,
    stage: { widthM: 20, depthM: 12 },
    consoleChannels: 64,
    notes:
      'Confirm all requirements with the sound engineer.\nThis synthetic fixture exercises the supported document caps.',
    items: Array.from({ length: 60 }, (_, n) =>
      n < 48
        ? {
            id: `item${n}`,
            kind: 'instrument',
            name: `Instrument ${String(n + 1).padStart(2, '0')}`,
            x: 1 + (n % 10) * 2,
            y: 1 + Math.floor(n / 10) * 2,
            rot: 0,
            needsPower: false,
          }
        : {
            id: `item${n}`,
            kind: 'wedge',
            name: `Wedge ${n - 47}`,
            x: 1 + (n % 10) * 2,
            y: 1 + Math.floor(n / 10) * 2,
            rot: 0,
            mixId: `mix${n - 48}`,
          },
    ),
    sources: Array.from({ length: 48 }, (_, n) => ({
      id: `source${n}`,
      itemId: `item${n}`,
      name: `Source ${String(n + 1).padStart(2, '0')} · ${n === 0 ? 'A long synthetic source name '.repeat(4) : 'stage signal'}`,
      outputs: n < 16 ? 2 : 1,
      legs: Array.from({ length: n < 16 ? 2 : 1 }, (_, l) => ({
        id: `leg${n}_${l}`,
        connection: 'mic',
        diId: null,
        phantom: 'unknown',
        channel: n < 16 ? n * 2 + l + 1 : n + 17,
      })),
      stand: 'tall',
      micModel:
        n === 0
          ? 'Generic microphone model with a deliberately long description for wrapping'
          : 'Generic mic',
      confirmed: false,
    })),
    mixes: Array.from({ length: 12 }, (_, n) => ({ id: `mix${n}`, name: `Mix ${n + 1}`, kind: 'wedge' })),
    matrix: Object.fromEntries(
      Array.from({ length: 48 }, (_, n) => [`source${n}|mix${n % 12}`, true as const]),
    ),
  };
}
