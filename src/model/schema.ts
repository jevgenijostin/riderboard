import { z } from 'zod';
import { CAPS, CONNECTIONS, STANDS, type Doc } from './types.ts';
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/, 'Invalid ID');
const name = z.string().max(160);
const ref = id.nullable();
const leg = z.object({
  id,
  connection: z.enum(CONNECTIONS),
  diId: ref,
  phantom: z.enum(['unknown', 'yes', 'no']),
  channel: z.number().int().nullable(),
});
const common = {
  id,
  name,
  x: z.number().finite(),
  y: z.number().finite(),
  rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
};
const item = z.discriminatedUnion('kind', [
  z.object({
    ...common,
    kind: z.literal('performer'),
    monitorType: z.enum(['unset', 'none', 'wedge', 'iem']),
    monitorMixId: ref,
  }),
  z.object({ ...common, kind: z.literal('instrument'), needsPower: z.boolean() }),
  z.object({ ...common, kind: z.literal('amp'), needsPower: z.boolean() }),
  z.object({ ...common, kind: z.literal('wedge'), mixId: ref }),
  z.object({ ...common, kind: z.literal('di'), diCapacity: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ ...common, kind: z.literal('power') }),
]);
export const docSchema = z.object({
  version: z.literal(1),
  id,
  name,
  seq: z
    .number()
    .int()
    .min(1)
    .max(Number.MAX_SAFE_INTEGER - 1000),
  stage: z.object({ widthM: z.number().min(3).max(20), depthM: z.number().min(2).max(12) }),
  consoleChannels: z.number().int().min(1).max(128),
  items: z.array(item).max(CAPS.items),
  sources: z
    .array(
      z.object({
        id,
        itemId: id,
        name,
        outputs: z.union([z.literal(1), z.literal(2)]),
        legs: z.array(leg).min(1).max(2),
        stand: z.enum(STANDS),
        micModel: name,
        confirmed: z.boolean(),
      }),
    )
    .max(CAPS.sources),
  mixes: z.array(z.object({ id, name, kind: z.enum(['wedge', 'iem', 'fixed']) })).max(CAPS.mixes),
  matrix: z.record(z.string(), z.literal(true)),
  notes: z.string().max(20000),
});
export const jsonSchema = z.toJSONSchema(docSchema);

/** Structural checks only: planning mistakes belong to validate(), not here. */
export function checkIntegrity(d: Doc): string[] {
  const errors: string[] = [];
  const legs = d.sources.flatMap((s) => s.legs);
  const ids = [
    d.id,
    ...d.items.map((i) => i.id),
    ...d.sources.map((s) => s.id),
    ...legs.map((l) => l.id),
    ...d.mixes.map((m) => m.id),
  ];
  if (new Set(ids).size !== ids.length) errors.push('Duplicate IDs are not allowed.');
  for (const [key, n] of Object.entries({
    items: d.items.length,
    sources: d.sources.length,
    legs: legs.length,
    mixes: d.mixes.length,
  }))
    if (n > CAPS[key as keyof typeof CAPS])
      errors.push(`${key} cap exceeded (${CAPS[key as keyof typeof CAPS]}).`);
  const items = new Map(d.items.map((i) => [i.id, i]));
  const mixes = new Set(d.mixes.map((m) => m.id));
  for (const s of d.sources) {
    if (!items.has(s.itemId)) errors.push(`${s.name}: missing item ${s.itemId}.`);
    if (s.legs.length !== s.outputs) errors.push(`${s.name}: legs.length must equal outputs.`);
    for (const l of s.legs) {
      if (l.connection === 'di' && (!l.diId || items.get(l.diId)?.kind !== 'di'))
        errors.push(`${s.name}: DI leg requires an existing DI box.`);
      if (l.connection !== 'di' && l.diId !== null)
        errors.push(`${s.name}: only DI legs may reference a DI box.`);
      if (l.channel !== null && !Number.isInteger(l.channel))
        errors.push(`${s.name}: channel must be an integer.`);
    }
  }
  for (const i of d.items)
    for (const ref of [i.mixId, i.monitorMixId])
      if (ref != null && !mixes.has(ref)) errors.push(`${i.name}: missing mix ${ref}.`);
  const sources = new Set(d.sources.map((s) => s.id));
  for (const key of Object.keys(d.matrix)) {
    const [s, m, extra] = key.split('|');
    if (extra !== undefined || !sources.has(s) || !mixes.has(m))
      errors.push(`Invalid matrix reference: ${key}.`);
  }
  return errors;
}
