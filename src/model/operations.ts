import { type Doc, type Item, type Source, type Leg, type Mix, type Result, position, sent } from './types';
import { PRESETS, type PresetId, type Preset } from './presets';
import { checkIntegrity, docSchema } from './schema';

export function createDoc(name = 'Untitled band', id = 'band1'): Doc { return { version: 1, id, name, seq: 1, stage: { widthM: 8, depthM: 5 }, consoleChannels: 24, items: [], sources: [], mixes: [], matrix: {}, notes: '' }; }
function next(d: Doc, prefix: string): string {
  const ids = new Set([d.id, ...d.items.map(i => i.id), ...d.sources.flatMap(s => [s.id, ...s.legs.map(l => l.id)]), ...d.mixes.map(m => m.id)]);
  let id: string; do { id = `${prefix}${d.seq++}`; } while (ids.has(id)); return id;
}
function edit(doc: Doc, change: (d: Doc) => string | void): Result {
  const d = structuredClone(doc), error = change(d);
  if (error) return { doc, error };
  const parsed = docSchema.safeParse(d);
  if (!parsed.success) return { doc, error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') };
  const errors = checkIntegrity(d);
  return errors.length ? { doc, error: errors.join(' ') } : { doc: d };
}
function newLeg(d: Doc): Leg { return { id: next(d, 'leg'), connection: 'unset', diId: null, phantom: 'unknown', channel: null }; }
function newSource(d: Doc, itemId: string, name: string, outputs: 1 | 2): Source {
  return { id: next(d, 'source'), itemId, name, outputs, legs: Array.from({ length: outputs }, () => newLeg(d)), stand: 'unset', micModel: '', confirmed: false };
}
export function addItem(doc: Doc, presetId: PresetId, x = doc.stage.widthM / 2, y = doc.stage.depthM / 2): Result {
  return edit(doc, d => {
    const p: Preset = PRESETS[presetId]; if (!p) return 'Unknown preset.';
    const item: Item = { id: next(d, 'item'), kind: p.kind, name: p.name, x: position(x, d.stage.widthM), y: position(y, d.stage.depthM), rot: 0 };
    if (p.kind === 'performer') { item.monitorType = 'unset'; item.monitorMixId = null; }
    if (p.kind === 'wedge') item.mixId = null;
    if (p.kind === 'di') item.diCapacity = p.diCapacity ?? 1;
    if (p.kind === 'amp' || p.kind === 'instrument') item.needsPower = p.needsPower ?? false;
    d.items.push(item);
    let diId: string | null = null;
    if (p.di) { diId = next(d, 'item'); d.items.push({ id: diId, kind: 'di', name: `${p.name} DI`, x: position(x + 0.5, d.stage.widthM), y: position(y, d.stage.depthM), rot: 0, diCapacity: 1 }); }
    if (p.connection) for (const name of p.sources ?? [p.name]) {
      const s = newSource(d, item.id, name, p.outputs ?? 1); s.stand = p.stand ?? 'unset';
      for (const l of s.legs) { l.connection = p.connection; l.diId = diId; }
      d.sources.push(s);
    }
  });
}
export const moveItem = (doc: Doc, id: string, x: number, y: number) => edit(doc, d => { const i = d.items.find(i => i.id === id); if (!i) return 'Item not found.'; i.x = position(x, d.stage.widthM); i.y = position(y, d.stage.depthM); });
export const updateItem = (doc: Doc, id: string, patch: Partial<Pick<Item, 'name' | 'rot' | 'diCapacity' | 'needsPower'>>) => edit(doc, d => { const i = d.items.find(i => i.id === id); if (!i) return 'Item not found.'; Object.assign(i, patch); });
export const renameItem = (doc: Doc, id: string, name: string) => updateItem(doc, id, { name });
export const rotateItem = (doc: Doc, id: string) => updateItem(doc, id, { rot: (((doc.items.find(i => i.id === id)?.rot ?? 0) + 90) % 360) as Item['rot'] });
export const addSource = (doc: Doc, itemId: string, name = 'New source', outputs: 1 | 2 = 1) => edit(doc, d => { d.sources.push(newSource(d, itemId, name, outputs)); });
export const updateSource = (doc: Doc, id: string, patch: Partial<Pick<Source, 'name' | 'outputs' | 'stand' | 'micModel' | 'confirmed'>>) => edit(doc, d => {
  const s = d.sources.find(s => s.id === id); if (!s) return 'Source not found.'; Object.assign(s, patch);
  if (s.outputs === 1) s.legs = s.legs.slice(0, 1); else if (s.legs.length === 1) s.legs.push(newLeg(d));
});
export const confirmSource = (doc: Doc, id: string) => updateSource(doc, id, { confirmed: true });
export const updateLeg = (doc: Doc, id: string, patch: Partial<Omit<Leg, 'id'>>) => edit(doc, d => { const l = d.sources.flatMap(s => s.legs).find(l => l.id === id); if (!l) return 'Leg not found.'; Object.assign(l, patch); if (l.connection !== 'di') l.diId = null; if (!sent(l)) l.channel = null; });
export const setLegChannel = (doc: Doc, id: string, channel: number | null) => updateLeg(doc, id, { channel });
export const autoNumberChannels = (doc: Doc) => edit(doc, d => { const legs = d.sources.flatMap(s => s.legs); if (legs.filter(sent).length > d.consoleChannels) return 'Too many sent legs for the declared console. No channels changed.'; let n = 1; for (const l of legs) l.channel = sent(l) ? n++ : null; });
export const addMix = (doc: Doc, name = `Mix ${doc.mixes.length + 1}`, kind: Mix['kind'] = 'wedge') => edit(doc, d => { d.mixes.push({ id: next(d, 'mix'), name, kind }); });
export const renameMix = (doc: Doc, id: string, name: string) => edit(doc, d => { const m = d.mixes.find(m => m.id === id); if (!m) return 'Mix not found.'; m.name = name; });
export const setWedgeMix = (doc: Doc, id: string, mixId: string | null) => edit(doc, d => { const i = d.items.find(i => i.id === id && i.kind === 'wedge'); if (!i) return 'Wedge not found.'; i.mixId = mixId; });
export const setPerformerMonitor = (doc: Doc, id: string, monitorType: Item['monitorType'], monitorMixId: string | null) => edit(doc, d => { const i = d.items.find(i => i.id === id && i.kind === 'performer'); if (!i) return 'Performer not found.'; i.monitorType = monitorType; i.monitorMixId = monitorType === 'iem' || monitorType === 'wedge' ? monitorMixId : null; });
export const toggleMatrixCell = (doc: Doc, sourceId: string, mixId: string) => edit(doc, d => { const key = `${sourceId}|${mixId}`; if (d.matrix[key]) delete d.matrix[key]; else d.matrix[key] = true; });
export interface Removed { items: number; sources: number; legs: number; matrixCells: number; refsCleared: number }
function removeSources(d: Doc, ids: Set<string>) { d.sources = d.sources.filter(s => !ids.has(s.id)); for (const key of Object.keys(d.matrix)) if (ids.has(key.split('|')[0])) delete d.matrix[key]; }
export function deleteItem(doc: Doc, id: string): Result & { removed: Removed } {
  const sourceIds = new Set(doc.sources.filter(s => s.itemId === id).map(s => s.id));
  const removed = { items: doc.items.filter(i => i.id === id).length, sources: sourceIds.size, legs: doc.sources.filter(s => sourceIds.has(s.id)).flatMap(s => s.legs).length, matrixCells: Object.keys(doc.matrix).filter(k => sourceIds.has(k.split('|')[0])).length, refsCleared: doc.sources.filter(s => !sourceIds.has(s.id)).flatMap(s => s.legs).filter(l => l.diId === id).length };
  return { ...edit(doc, d => { d.items = d.items.filter(i => i.id !== id); removeSources(d, sourceIds); for (const l of d.sources.flatMap(s => s.legs)) if (l.diId === id) { l.connection = 'unset'; l.diId = null; l.channel = null; } }), removed };
}
export const deleteSource = (doc: Doc, id: string) => edit(doc, d => { removeSources(d, new Set([id])); });
export const deleteMix = (doc: Doc, id: string) => edit(doc, d => { d.mixes = d.mixes.filter(m => m.id !== id); for (const i of d.items) { if (i.mixId === id) i.mixId = null; if (i.monitorMixId === id) i.monitorMixId = null; } for (const key of Object.keys(d.matrix)) if (key.split('|')[1] === id) delete d.matrix[key]; });
export const setStage = (doc: Doc, widthM: number, depthM: number) => edit(doc, d => { d.stage = { widthM, depthM }; for (const i of d.items) { i.x = position(i.x, widthM); i.y = position(i.y, depthM); } });
export const setConsoleChannels = (doc: Doc, n: number) => edit(doc, d => { d.consoleChannels = n; });
export const updateDocument = (doc: Doc, patch: Partial<Pick<Doc, 'name' | 'notes'>>) => edit(doc, d => { Object.assign(d, patch); });
