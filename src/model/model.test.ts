import { describe, expect, test } from 'vitest';
import { type Doc, type Leg, type Source, type Stand, CAPS } from './types';
import * as op from './operations';
import { equipmentCounts, inputList, monitorMatrix } from './derive';
import { validate, RULES } from './validate';
import { checkIntegrity } from './schema';
import { fromJSON, toJSON, loadLibrary, saveLibrary } from './persist';
import { exampleBand } from './template';
import { PRESETS, type PresetId } from './presets';

// Fixtures spell out expected signal structure independently of presets/derivations.
const leg = (
  id: string,
  connection: Leg['connection'] = 'mic',
  diId: string | null = null,
  channel: number | null = null,
): Leg => ({ id, connection, diId, channel, phantom: 'unknown' });
const source = (legs: Leg[], stand: Stand = 'tall'): Source => ({
  id: 's1',
  itemId: 'i1',
  name: 'Keys',
  outputs: legs.length as 1 | 2,
  legs,
  stand,
  micModel: '',
  confirmed: false,
});
function fixture(legs = [leg('l1')]): Doc {
  return {
    version: 1,
    id: 'band1',
    name: 'Test',
    seq: 100,
    stage: { widthM: 8, depthM: 5 },
    consoleChannels: 24,
    items: [
      { id: 'i1', kind: 'instrument', name: 'Keys', x: 2, y: 3, rot: 0, needsPower: false },
      { id: 'di1', kind: 'di', name: 'DI A', x: 3, y: 3, rot: 0, diCapacity: 1 },
      { id: 'di2', kind: 'di', name: 'DI B', x: 4, y: 3, rot: 0, diCapacity: 2 },
    ],
    sources: [source(legs)],
    mixes: [],
    matrix: {},
    notes: '',
  };
}
const rules = (d: Doc) => validate(d).map((i) => i.id);
function maxDoc() {
  const d = op.createDoc();
  d.seq = 500;
  d.items = Array.from({ length: 60 }, (_, n) => ({
    id: `i${n}`,
    kind: 'instrument' as const,
    name: `Instrument ${n + 1}`,
    x: n % 8,
    y: n % 5,
    rot: 0 as const,
    needsPower: false,
  }));
  d.sources = Array.from({ length: 48 }, (_, n) => ({
    ...source([leg(`l${n}`, 'mic', null, n + 1)]),
    id: `s${n}`,
    itemId: `i${n}`,
    name: `Source ${n + 1}`,
  }));
  d.consoleChannels = 64;
  return d;
}
describe('channel accounting', () => {
  test.each([
    [[leg('l1')], 1, ['Keys']],
    [[leg('l1'), leg('l2')], 2, ['Keys L', 'Keys R']],
    [[leg('l1', 'di', 'di1')], 1, ['Keys']],
    [[leg('l1', 'di', 'di2'), leg('l2', 'di', 'di2')], 2, ['Keys L', 'Keys R']],
    [[leg('l1', 'di', 'di1'), leg('l2', 'di', 'di2')], 2, ['Keys L', 'Keys R']],
    [[leg('l1', 'notSent'), leg('l2', 'unset')], 0, []],
  ])('%j produces %i inputs', (legs, count, labels) => {
    const d = fixture(legs as Leg[]);
    expect(inputList(d).map((r) => r.label)).toEqual(labels);
    expect(equipmentCounts(d).inputsTotal).toBe(count);
  });
  test('two distinct mono DIs carry stereo without double counting', () => {
    const d = fixture([leg('l1', 'di', 'di1'), leg('l2', 'di', 'di2')]);
    d.items[2].diCapacity = 1;
    expect(equipmentCounts(d).inputsTotal).toBe(2);
    expect(rules(d)).not.toContain('DI_OVER_CAPACITY');
  });
  test('drum preset contains eight inputs', () => {
    const d = op.addItem(op.createDoc(), 'drums').doc;
    expect(d.items).toHaveLength(1);
    expect(d.sources).toHaveLength(8);
    expect(inputList(d)).toHaveLength(8);
    expect(d.sources.every((s) => !s.confirmed && s.legs[0].phantom === 'unknown')).toBe(true);
  });
  test('stable channel sort with unassigned last', () => {
    const d = fixture([leg('l1', 'mic', null, 9), leg('l2', 'mic', null, 3)]);
    expect(inputList(d).map((r) => r.legId)).toEqual(['l2', 'l1']);
    d.sources[0].legs[1].channel = null;
    expect(inputList(d).map((r) => r.legId)).toEqual(['l1', 'l2']);
  });
});
describe('validation and numbering', () => {
  test('DI capacity is per leg; changing capacity resolves issue', () => {
    const d = fixture([leg('l1', 'di', 'di1'), leg('l2', 'di', 'di1')]);
    expect(rules(d)).toContain('DI_OVER_CAPACITY');
    expect(rules(op.updateItem(d, 'di1', { diCapacity: 2 }).doc)).not.toContain('DI_OVER_CAPACITY');
    expect(validate(d).find((i) => i.id === 'DI_UNUSED')?.itemId).toBe('di2');
  });
  test('duplicate flags both legs', () => {
    expect(
      validate(fixture([leg('l1', 'mic', null, 3), leg('l2', 'line', null, 3)]))
        .filter((i) => i.id === 'CH_DUPLICATE')
        .map((i) => i.legId),
    ).toEqual(['l1', 'l2']);
  });
  test.each([0, -1, 2.5, 25])('invalid channel %s', (channel) =>
    expect(rules(fixture([leg('l1', 'mic', null, channel)]))).toContain('CH_OUT_OF_RANGE'),
  );
  test('sent/unset, console overflow and missing DI rules', () => {
    const d = fixture([leg('l1'), leg('l2')]);
    d.consoleChannels = 1;
    expect(rules(d)).toContain('INPUTS_OVER_CONSOLE');
    expect(rules(d)).toContain('CH_UNASSIGNED');
    expect(rules(fixture([leg('l1', 'unset')]))).toContain('LEG_UNSET');
    expect(rules(fixture([leg('l1', 'di')]))).toContain('LEG_DI_MISSING');
  });
  test('explicit numbering skips unsent, is deterministic and atomic on overflow', () => {
    const d = fixture([leg('l1'), leg('l2', 'notSent')]);
    d.sources.push({ ...source([leg('l3', 'unset'), leg('l4', 'line')]), id: 's2' });
    const numbered = op.autoNumberChannels(d);
    expect(numbered.error).toBeUndefined();
    expect(numbered.doc.sources.flatMap((s) => s.legs.map((l) => l.channel))).toEqual([1, null, null, 2]);
    expect(op.autoNumberChannels(d)).toEqual(numbered);
    expect(d.sources[0].legs[0].channel).toBeNull();
    d.consoleChannels = 1;
    const rejected = op.autoNumberChannels(d);
    expect(rejected.error).toBeTruthy();
    expect(rejected.doc).toBe(d);
  });
  test('stereo adjacent and split pairs', () => {
    const d = fixture([leg('l1', 'mic', null, 3), leg('l2', 'mic', null, 4)]);
    expect(rules(d)).not.toContain('STEREO_PAIR_SPLIT');
    d.sources[0].legs[1].channel = 9;
    expect(rules(d)).toContain('STEREO_PAIR_SPLIT');
    d.sources[0].legs[1] = leg('l2', 'notSent');
    expect(rules(d)).toContain('STEREO_ONE_LEG');
  });
  test.each(['handheld', 'none', 'clamp', 'tall', 'unset'] as Stand[])('stand %s', (stand) => {
    const d = fixture();
    d.sources[0].stand = stand;
    expect(rules(d).includes('MIC_NO_STAND')).toBe(stand === 'unset');
  });
  test('counts stands per source; unknown phantom stays unknown', () => {
    const d = fixture([leg('l1'), leg('l2')]);
    expect(equipmentCounts(d)).toMatchObject({
      mics: 2,
      stands: { tall: 1 },
      standsToCarry: 1,
      phantomUnknown: 2,
    });
    expect(inputList(d).map((r) => r.phantom)).toEqual(['unknown', 'unknown']);
    expect(validate(d).filter((i) => i.id === 'PHANTOM_UNKNOWN')).toHaveLength(1);
    expect(op.updateLeg(d, 'l1', { connection: 'line' }).doc.sources[0].legs[0].phantom).toBe('unknown');
  });
  test('rules sorted in specified priority, deterministic', () => {
    const d = exampleBand();
    const ids = rules(d).map((id) => RULES.indexOf(id));
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(validate(d)).toEqual(validate(d));
  });
  test('confirmation and power checks', () => {
    let d = op.addItem(op.createDoc(), 'guitar').doc;
    expect(rules(d)).toContain('NO_POWER_DROP');
    d = op.addItem(d, 'power').doc;
    expect(rules(d)).not.toContain('NO_POWER_DROP');
    d = op.confirmSource(d, d.sources[0].id).doc;
    expect(rules(d)).not.toContain('SOURCE_UNCONFIRMED');
  });
});
describe('monitors and immutable operations', () => {
  function monitors() {
    let d = op.addMix(op.createDoc(), 'Front').doc;
    d = op.addItem(d, 'vocal').doc;
    d = op.addItem(d, 'wedge').doc;
    return op.addItem(d, 'wedge').doc;
  }
  test('two wedges one mix, IEM without wedge, mismatch', () => {
    let d = monitors();
    expect(rules(d)).toContain('WEDGE_NO_MIX');
    expect(rules(d)).toContain('MIX_NO_OUTPUT');
    const m = d.mixes[0].id,
      p = d.items[0].id;
    d = op.setPerformerMonitor(d, p, 'iem', m).doc;
    expect(rules(d)).not.toContain('MIX_NO_OUTPUT');
    expect(rules(d)).not.toContain('MONITOR_MISMATCH');
    d = op.setPerformerMonitor(d, p, 'wedge', m).doc;
    expect(rules(d)).toContain('MONITOR_MISMATCH');
    for (const w of d.items.filter((i) => i.kind === 'wedge')) d = op.setWedgeMix(d, w.id, m).doc;
    expect(rules(d)).not.toContain('MONITOR_MISMATCH');
    expect(rules(d)).not.toContain('WEDGE_NO_MIX');
    expect(monitorMatrix(d).outputs[0].names).toEqual(['Wedge', 'Wedge']);
  });
  test('move ONLY changes x/y, not routing or numbering', () => {
    let d = monitors();
    const m = d.mixes[0].id;
    d = op.setPerformerMonitor(d, d.items[0].id, 'wedge', m).doc;
    d = op.setWedgeMix(d, d.items[1].id, m).doc;
    for (const i of d.items.slice(0, 2)) {
      const moved = op.moveItem(d, i.id, 1.15, 2.2).doc;
      const expected = structuredClone(d);
      Object.assign(
        expected.items.find((j) => j.id === i.id)!,
        { x: 1.15, y: 2.2 },
      );
      expect(moved).toEqual(expected);
      expect(moved.mixes).toEqual(d.mixes);
      expect(moved.matrix).toEqual(d.matrix);
    }
  });
  test('matrix toggles round trip', () => {
    const d = monitors(),
      s = d.sources[0].id,
      m = d.mixes[0].id;
    const changed = op.toggleMatrixCell(d, s, m).doc;
    expect(monitorMatrix(changed).cells).toEqual([[true]]);
    expect(monitorMatrix(changed).columns).toEqual(d.mixes);
    expect(monitorMatrix(changed).rows).toEqual(d.sources);
    expect(op.toggleMatrixCell(changed, s, m).doc).toEqual(d);
  });
  test('deletion clears all dependent references with accurate summary', () => {
    let d = fixture([leg('l1', 'di', 'di1')]);
    d = op.addMix(d).doc;
    d = op.toggleMatrixCell(d, 's1', d.mixes[0].id).doc;
    const removed = op.deleteItem(d, 'i1');
    expect(removed.removed).toEqual({ items: 1, sources: 1, legs: 1, matrixCells: 1, refsCleared: 0 });
    expect(removed.doc.sources).toEqual([]);
    expect(removed.doc.matrix).toEqual({});
    const di = op.deleteItem(d, 'di1');
    expect(di.removed.refsCleared).toBe(1);
    expect(di.doc.sources[0].legs[0]).toMatchObject({ connection: 'unset', diId: null, channel: null });
    expect(checkIntegrity(di.doc)).toEqual([]);
    expect(op.deleteSource(d, 's1').doc.matrix).toEqual({});
  });
  test('delete mix clears wedge, performer and matrix refs', () => {
    let d = monitors();
    const m = d.mixes[0].id;
    d = op.setWedgeMix(d, d.items[1].id, m).doc;
    d = op.setPerformerMonitor(d, d.items[0].id, 'iem', m).doc;
    d = op.toggleMatrixCell(d, d.sources[0].id, m).doc;
    const result = op.deleteMix(d, m).doc;
    expect(result.items[0].monitorMixId).toBeNull();
    expect(result.items[1].mixId).toBeNull();
    expect(result.matrix).toEqual({});
    expect(checkIntegrity(result)).toEqual([]);
  });
});
describe('sanitization, caps and integrity', () => {
  test.each([exampleBand(), maxDoc()])('exact round trip', (d) => {
    const result = fromJSON(toJSON(d));
    expect('doc' in result && result.doc).toEqual(d);
  });
  test('unknown fields dropped, coordinates clamped and reported', () => {
    const d = fixture();
    d.items[0].x = 99;
    d.items[0].y = -1;
    const result = fromJSON(JSON.stringify({ ...d, unknown: 12 }));
    expect('doc' in result && result.doc.items[0]).toMatchObject({ x: 8, y: 0 });
    expect('notices' in result && result.notices).toHaveLength(1);
    expect('doc' in result && 'unknown' in result.doc).toBe(false);
  });
  test.each([
    (d: Doc) => ({ ...d, version: 2 }),
    (d: Doc) => {
      d.sources[0].legs[0] = leg('l1', 'di', 'missing');
      return d;
    },
    (d: Doc) => {
      d.items[1].id = 'i1';
      return d;
    },
    (d: Doc) => {
      d.sources[0].outputs = 2;
      return d;
    },
    (d: Doc) => {
      d.sources[0].legs[0].channel = 1.5;
      return d;
    },
    (d: Doc) => {
      d.sources[0].itemId = 'absent';
      return d;
    },
    (d: Doc) => {
      d.matrix['s1|absent'] = true;
      return d;
    },
    (d: Doc) => {
      d.items = Array.from({ length: 61 }, (_, n) => ({ ...d.items[0], id: `i${n}` }));
      return d;
    },
  ])('invalid import is rejected atomically', (mutate) =>
    expect(fromJSON(JSON.stringify(mutate(fixture())))).toHaveProperty('errors'),
  );
  test('garbage text and corrupt/unavailable storage do not throw', () => {
    expect(fromJSON('{oops')).toHaveProperty('errors');
    const storage = {
      getItem: () => '{oops',
      setItem: () => {
        throw Error('full');
      },
      removeItem: () => {},
    };
    expect(loadLibrary(storage).notice).toBeTruthy();
    expect(saveLibrary(storage, { bands: [fixture()], activeId: 'band1' })).toBeTruthy();
  });
  test('local library validates active and duplicate band references', () => {
    for (const value of [
      { bands: [fixture()], activeId: 'absent' },
      { bands: [fixture(), fixture()], activeId: 'band1' },
    ])
      expect(
        loadLibrary({ getItem: () => JSON.stringify(value), setItem: () => {}, removeItem: () => {} }).notice,
      ).toBeTruthy();
  });
  test('stage resize clamps; rounding and bounds', () => {
    const d = fixture();
    const result = op.setStage(d, 3, 2).doc;
    expect(result.items[0]).toMatchObject({ x: 2, y: 2 });
    expect(op.moveItem(d, 'i1', 8.6, -1).doc.items[0]).toMatchObject({ x: 8, y: 0 });
    expect(op.moveItem(d, 'i1', 1.123, 2.678).doc.items[0]).toMatchObject({ x: 1.1, y: 2.7 });
    expect(op.setStage(d, 1, 1).doc).toBe(d);
  });
  test('fractional stage edge cannot round a position beyond the rectangle', () => {
    const d = op.setStage(fixture(), 3.03, 2.03).doc;
    expect(op.moveItem(d, 'i1', 8, 8).doc.items[0]).toMatchObject({ x: 3, y: 2 });
  });
  test('caps refuse atomically including compound presets and stereo growth', () => {
    let d = maxDoc();
    expect(op.addItem(d, 'performer').error).toBeTruthy();
    expect(op.addItem(d, 'performer').doc).toBe(d);
    expect(op.addSource(d, 'i0').error).toBeTruthy();
    d.items.pop();
    expect(op.addItem(d, 'bass').doc).toBe(d);
    for (let n = 0; n < 12; n++) d = op.addMix(d).doc;
    expect(op.addMix(d).error).toBeTruthy();
    expect(op.addMix(d).doc).toBe(d);
    for (let n = 0; n < 16; n++) d = op.updateSource(d, `s${n}`, { outputs: 2 }).doc;
    expect(d.sources.flatMap((s) => s.legs)).toHaveLength(CAPS.legs);
    expect(op.updateSource(d, 's16', { outputs: 2 }).doc).toBe(d);
  });
  test('all presets are structurally sound and all assumptions unconfirmed', () => {
    for (const key of Object.keys(PRESETS) as PresetId[]) {
      const result = op.addItem(op.createDoc(), key);
      expect(result.error).toBeUndefined();
      expect(checkIntegrity(result.doc)).toEqual([]);
      expect(
        result.doc.sources.every((s) => !s.confirmed && s.legs.every((l) => l.phantom === 'unknown')),
      ).toBe(true);
    }
  });
  test('200 seeded mixed operations preserve integrity and immutability', () => {
    let seed = 8147,
      d = op.createDoc();
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    };
    for (let n = 0; n < 200; n++) {
      const before = structuredClone(d),
        i = d.items[random() % Math.max(1, d.items.length)],
        s = d.sources[random() % Math.max(1, d.sources.length)],
        m = d.mixes[random() % Math.max(1, d.mixes.length)];
      let result;
      switch (n % 10) {
        case 0:
        case 1:
          result = op.addItem(d, (Object.keys(PRESETS) as PresetId[])[random() % 13]);
          break;
        case 2:
          result = op.addMix(d);
          break;
        case 3:
          result = i ? op.addSource(d, i.id) : { doc: d };
          break;
        case 4:
          result = s ? op.updateSource(d, s.id, { outputs: 2 }) : { doc: d };
          break;
        case 5:
          result = s && m ? op.toggleMatrixCell(d, s.id, m.id) : { doc: d };
          break;
        case 6:
          result = i ? op.moveItem(d, i.id, random() % 22, random() % 14) : { doc: d };
          break;
        case 7:
          result = i ? op.deleteItem(d, i.id) : { doc: d };
          break;
        case 8:
          result = m ? op.deleteMix(d, m.id) : { doc: d };
          break;
        default:
          result = op.autoNumberChannels(d);
      }
      expect(d).toEqual(before);
      d = result.doc;
      expect(checkIntegrity(d)).toEqual([]);
      expect(fromJSON(toJSON(d))).toHaveProperty('doc');
    }
  });
});
