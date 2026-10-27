import { type Doc, sent } from './types';
export const RULES = [
  'DI_OVER_CAPACITY',
  'CH_DUPLICATE',
  'CH_OUT_OF_RANGE',
  'INPUTS_OVER_CONSOLE',
  'LEG_DI_MISSING',
  'CH_UNASSIGNED',
  'LEG_UNSET',
  'STEREO_ONE_LEG',
  'STEREO_PAIR_SPLIT',
  'MIC_NO_STAND',
  'WEDGE_NO_MIX',
  'MIX_NO_OUTPUT',
  'MONITOR_MISMATCH',
  'NO_POWER_DROP',
  'DI_UNUSED',
  'SOURCE_UNCONFIRMED',
  'PHANTOM_UNKNOWN',
] as const;
export type RuleId = (typeof RULES)[number];
export interface Issue {
  id: RuleId;
  severity: 'error' | 'warning' | 'info';
  message: string;
  itemId?: string;
  sourceId?: string;
  legId?: string;
  mixId?: string;
}
export function validate(d: Doc): Issue[] {
  const issues: Issue[] = [];
  const add = (id: RuleId, message: string, refs: Partial<Omit<Issue, 'id' | 'severity' | 'message'>> = {}) =>
    issues.push({
      id,
      severity: RULES.indexOf(id) < 5 ? 'error' : RULES.indexOf(id) < 14 ? 'warning' : 'info',
      message,
      ...refs,
    });
  const legs = d.sources.flatMap((s) => s.legs.map((l) => ({ l, s })));
  for (const i of d.items.filter((i) => i.kind === 'di')) {
    const used = legs.filter(({ l }) => l.diId === i.id).length;
    if (used > (i.diCapacity ?? 1))
      add('DI_OVER_CAPACITY', `${i.name}: ${used} legs use a ${i.diCapacity}-channel DI.`, { itemId: i.id });
    if (used === 0) add('DI_UNUSED', `${i.name} has no assigned legs.`, { itemId: i.id });
  }
  for (const { l, s } of legs) {
    const refs = { itemId: s.itemId, sourceId: s.id, legId: l.id };
    if (l.channel !== null && legs.filter(({ l: other }) => other.channel === l.channel).length > 1)
      add('CH_DUPLICATE', `${s.name}: channel ${l.channel} is used more than once.`, refs);
    if (
      l.channel !== null &&
      (!Number.isInteger(l.channel) || l.channel < 1 || l.channel > d.consoleChannels)
    )
      add('CH_OUT_OF_RANGE', `${s.name}: channel ${l.channel} is outside 1–${d.consoleChannels}.`, refs);
    if (l.connection === 'di' && !d.items.some((i) => i.kind === 'di' && i.id === l.diId))
      add('LEG_DI_MISSING', `${s.name}: select a DI box.`, refs);
    if (sent(l) && l.channel === null) add('CH_UNASSIGNED', `${s.name}: sent leg needs a channel.`, refs);
    if (l.connection === 'unset') add('LEG_UNSET', `${s.name}: choose a connection or mark not sent.`, refs);
  }
  const total = legs.filter(({ l }) => sent(l)).length;
  if (total > d.consoleChannels)
    add('INPUTS_OVER_CONSOLE', `${total} inputs exceed the ${d.consoleChannels}-channel console.`);
  for (const s of d.sources) {
    const refs = { itemId: s.itemId, sourceId: s.id };
    if (s.outputs === 2 && s.legs.filter(sent).length === 1)
      add('STEREO_ONE_LEG', `${s.name}: only one stereo leg is sent.`, refs);
    if (
      s.outputs === 2 &&
      s.legs.every((l) => l.channel !== null) &&
      Math.abs(s.legs[0].channel! - s.legs[1].channel!) !== 1
    )
      add('STEREO_PAIR_SPLIT', `${s.name}: stereo channels are not adjacent.`, refs);
    if (s.legs.some((l) => l.connection === 'mic') && s.stand === 'unset')
      add('MIC_NO_STAND', `${s.name}: confirm the stand requirement.`, refs);
    if (!s.confirmed) add('SOURCE_UNCONFIRMED', `${s.name}: preset assumptions are unconfirmed.`, refs);
  }
  for (const i of d.items) {
    if (i.kind === 'wedge' && !i.mixId)
      add('WEDGE_NO_MIX', `${i.name}: choose a monitor mix.`, { itemId: i.id });
    if (
      i.kind === 'performer' &&
      i.monitorType === 'wedge' &&
      !d.items.some((w) => w.kind === 'wedge' && w.mixId != null && w.mixId === i.monitorMixId)
    )
      add('MONITOR_MISMATCH', `${i.name}: their monitor mix has no wedge.`, {
        itemId: i.id,
        mixId: i.monitorMixId ?? undefined,
      });
    if (i.needsPower && !d.items.some((p) => p.kind === 'power'))
      add('NO_POWER_DROP', `${i.name}: power requested but no power drop is listed.`, { itemId: i.id });
  }
  for (const m of d.mixes)
    if (
      !d.items.some(
        (i) =>
          (i.kind === 'wedge' && i.mixId === m.id) ||
          (i.kind === 'performer' && i.monitorType === 'iem' && i.monitorMixId === m.id),
      )
    )
      add('MIX_NO_OUTPUT', `${m.name}: no wedge or IEM performer assigned.`, { mixId: m.id });
  const unknowns = legs.filter(
    ({ l }) => (l.connection === 'mic' || l.connection === 'di') && l.phantom === 'unknown',
  );
  if (unknowns.length)
    add('PHANTOM_UNKNOWN', `${unknowns.length} mic/DI legs have unknown phantom requirements (?).`);
  return issues.sort((a, b) => RULES.indexOf(a.id) - RULES.indexOf(b.id));
}
