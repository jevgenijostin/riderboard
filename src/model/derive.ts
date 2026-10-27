import { type Doc, type Stand, sent, STANDS } from './types';
export function inputList(d: Doc) {
  return d.sources
    .flatMap((s) =>
      s.legs.flatMap((l, index) =>
        sent(l)
          ? [
              {
                channel: l.channel,
                legId: l.id,
                sourceId: s.id,
                label: s.name + (s.outputs === 2 ? (index === 0 ? ' L' : ' R') : ''),
                connection: l.connection,
                diName: d.items.find((i) => i.id === l.diId)?.name ?? null,
                micModel: s.micModel,
                phantom: l.phantom,
                stand: s.stand,
                performerName: d.items.find((i) => i.id === s.itemId && i.kind === 'performer')?.name ?? null,
                confirmed: s.confirmed,
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => (a.channel ?? Infinity) - (b.channel ?? Infinity));
}
export function equipmentCounts(d: Doc) {
  const rows = inputList(d),
    count = (kind: string) => d.items.filter((i) => i.kind === kind).length;
  const stands = Object.fromEntries(STANDS.map((s) => [s, 0])) as Record<Stand, number>;
  for (const s of d.sources) if (s.legs.some((l) => l.connection === 'mic')) stands[s.stand]++;
  return {
    inputsTotal: rows.length,
    inputsAssigned: rows.filter((r) => r.channel !== null).length,
    mics: rows.filter((r) => r.connection === 'mic').length,
    diMono: d.items.filter((i) => i.kind === 'di' && i.diCapacity === 1).length,
    diStereo: d.items.filter((i) => i.kind === 'di' && i.diCapacity === 2).length,
    stands,
    standsToCarry: stands.short + stands.tall + stands.straight + stands.clamp,
    wedges: count('wedge'),
    iemMixes: d.mixes.filter(
      (m) => m.kind === 'iem' || d.items.some((i) => i.monitorType === 'iem' && i.monitorMixId === m.id),
    ).length,
    powerDrops: count('power'),
    amps: count('amp'),
    performers: count('performer'),
    phantomUnknown: rows.filter((r) => r.phantom === 'unknown').length,
  };
}
export function monitorMatrix(d: Doc) {
  return {
    columns: d.mixes,
    rows: d.sources,
    cells: d.sources.map((s) => d.mixes.map((m) => !!d.matrix[`${s.id}|${m.id}`])),
    outputs: d.mixes.map((m) => ({
      mixId: m.id,
      names: d.items
        .filter(
          (i) =>
            (i.kind === 'wedge' && i.mixId === m.id) ||
            (i.kind === 'performer' && i.monitorType === 'iem' && i.monitorMixId === m.id),
        )
        .map((i) => i.name),
    })),
  };
}
