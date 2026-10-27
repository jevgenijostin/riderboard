import type { Item, Leg, Stand } from './types';
export interface Preset {
  name: string;
  kind: Item['kind'];
  stand?: Stand;
  connection?: Leg['connection'];
  outputs?: 1 | 2;
  sources?: string[];
  di?: boolean;
  diCapacity?: 1 | 2;
  needsPower?: boolean;
}
export const PRESETS = {
  vocal: { name: 'Vocal (handheld)', kind: 'performer', stand: 'handheld', connection: 'mic' },
  vocalStand: { name: 'Vocal on stand', kind: 'performer', stand: 'tall', connection: 'mic' },
  guitar: { name: 'Guitar amp', kind: 'amp', stand: 'short', connection: 'mic', needsPower: true },
  bass: { name: 'Bass amp+DI', kind: 'amp', stand: 'none', connection: 'di', di: true, needsPower: true },
  acoustic: { name: 'Acoustic guitar', kind: 'instrument', stand: 'none', connection: 'di', di: true },
  keys: {
    name: 'Keys stereo',
    kind: 'instrument',
    stand: 'none',
    connection: 'unset',
    outputs: 2,
    needsPower: true,
  },
  drums: {
    name: 'Drum kit',
    kind: 'instrument',
    stand: 'unset',
    connection: 'mic',
    sources: ['Kick', 'Snare', 'Hat', 'Tom 1', 'Tom 2', 'Floor Tom', 'OH L', 'OH R'],
  },
  wedge: { name: 'Wedge', kind: 'wedge' },
  performer: { name: 'Performer', kind: 'performer' },
  di: { name: 'DI box', kind: 'di', diCapacity: 1 },
  stereoDi: { name: 'DI box stereo', kind: 'di', diCapacity: 2 },
  power: { name: 'Power drop', kind: 'power' },
} satisfies Record<string, Preset>;
export type PresetId = keyof typeof PRESETS;
