import './style.css';
import * as op from './model/operations';
import { type Doc, type Item, type Leg, type Source, type Result } from './model/types';
import { PRESETS, type PresetId } from './model/presets';
import { validate } from './model/validate';
import { loadLibrary, saveLibrary, type Library } from './model/persist';
import { exampleBand } from './model/template';
import { stageMarkup, SYMBOLS } from './ui/stage';
import { inspectorMarkup } from './ui/inspector';
import { esc, field } from './ui/html';

const DISCLAIMER = 'Planning aid only. Presets are generic assumptions; confirm with your sound engineer. Not an electrical or venue-compatibility certification.';
const root = document.querySelector<HTMLDivElement>('#app')!;
let stored: ReturnType<typeof loadLibrary>;
try { stored = loadLibrary(localStorage); } catch { stored = { notice: 'Local storage is unavailable. Export JSON to back up your work.' }; }
const library: Library = stored.library ?? { bands: [op.createDoc()], activeId: 'band1' };
let doc: Doc = library.bands.find(b => b.id === library.activeId)!;
let selected: string | null = null, selectedSource: string | null = null;
let notice = stored.notice ?? '';
function persist() { library.bands = library.bands.map(b => b.id === doc.id ? doc : b); library.activeId = doc.id; try { const error = saveLibrary(localStorage, library); if (error) notice = error; } catch { notice = 'Local storage is unavailable. Export JSON to back up.'; } }
function apply(result: Result) { if (result.error) notice = result.error; else { doc = result.doc; persist(); } render(); }
function select(id: string | null, sourceId: string | null = null) { selected = id; selectedSource = sourceId; render(); }
function render() {
  const issues = validate(doc);
  root.innerHTML = `<header class="app-header"><a class="brand" href="./" aria-label="RiderBoard home"><span class="brand-mark">r<span>↗</span></span><span>rider<span class="brand-light">board</span><small>STAGE & SIGNAL</small></span></a><p>One connected model keeps your stage plot<br>and your paperwork consistent.</p><div class="header-actions"><span class="plan-pill">FREE PLAN</span><button data-action="license" class="quiet">Upgrade ↗</button></div></header>
    <main><section class="project-bar"><div class="band-title"><span class="eyebrow">YOUR TECH RIDER</span><input aria-label="Band name" id="band-name" value="${esc(doc.name)}" maxlength="160"></div><div class="project-settings">${field('Width · m', `<input id="stage-width" type="number" min="3" max="20" step="0.05" value="${doc.stage.widthM}">`)}${field('Depth · m', `<input id="stage-depth" type="number" min="2" max="12" step="0.05" value="${doc.stage.depthM}">`)}${field('Console inputs', `<input id="console" type="number" min="1" max="128" step="1" value="${doc.consoleChannels}">`)}</div><div class="project-actions"><button data-action="export" class="quiet">↓ Export JSON</button><button data-action="import" class="quiet">↑ Import</button><button data-action="print" class="primary">Print rider ↗</button></div></section>
    ${notice ? `<div class="notice" role="status">${esc(notice)}<button data-action="dismiss" aria-label="Dismiss notice">×</button></div>` : ''}
    <div class="workspace"><aside class="palette panel"><div class="panel-heading"><span class="eyebrow">01 / PALETTE</span><h2>Set the stage.</h2><p>Click to add. Drag to place.</p></div><div class="palette-items">${Object.entries(PRESETS).map(([id, p]) => `<button class="palette-item" data-preset="${id}" draggable="true"><svg viewBox="-28 -27 56 54" aria-hidden="true">${SYMBOLS[p.kind]}</svg><span>${esc(p.name)}</span><span class="add-mark">+</span></button>`).join('')}</div><div class="palette-foot">GENERIC PRESETS<br><span>All signal assumptions need confirmation.</span></div></aside>
    <section class="plot-panel panel"><div class="plot-toolbar"><div><span class="eyebrow">02 / STAGE PLOT</span><h2>Everything in its place.</h2></div><span class="item-count">${doc.items.length} / 60 items</span></div><div class="stage-wrap">${stageMarkup(doc, issues, selected)}${!doc.items.length ? '<div class="empty-stage"><span class="empty-cross">＋</span><h3>Your next show starts here.</h3><p>Add gear from the palette, or start with a four-piece band.</p><button class="primary" data-action="example">Load example band</button><small>Generic, unconfirmed assumptions</small></div>' : ''}</div><div class="plot-bottom"><span><i class="status-dot"></i> Metres · 0.05 m grid</span><span>Drag to move · ↑↓←→ nudge · Shift for 0.5 m</span></div></section>
    <aside class="inspector panel">${inspectorMarkup(doc, selected, selectedSource)}</aside></div>
    <div id="paperwork"></div><footer class="app-footer"><p>${DISCLAIMER}</p><span>Local to this browser. localStorage is not a backup; export JSON to back up.</span><button class="text-button" data-action="clear">Clear all local data</button></footer></main><dialog id="modal"></dialog>`;
  bindStage();
}
function modal(html: string, confirm?: () => void) {
  const dialog = document.querySelector<HTMLDialogElement>('#modal')!;
  dialog.innerHTML = html; dialog.showModal();
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-accept]')?.addEventListener('click', () => { dialog.close(); confirm?.(); });
}
function deleteSelected() {
  if (!selected) return; const result = op.deleteItem(doc, selected), r = result.removed;
  modal(`<h2>Delete ${esc(doc.items.find(i => i.id === selected)?.name)}?</h2><p>This removes ${r.items} item, ${r.sources} sources, ${r.legs} legs and ${r.matrixCells} matrix cells.</p><p><strong>${r.refsCleared} re-pointed legs</strong> will become unset. Their channels will be cleared.</p><div class="dialog-actions"><button data-close>Cancel</button><button data-accept class="danger-button">Delete item</button></div>`, () => { selected = null; selectedSource = null; apply(result); });
}
root.addEventListener('click', e => {
  const target = e.target as Element, button = target.closest<HTMLElement>('button'); if (!button) return;
  if (button.dataset.preset) { const result = op.addItem(doc, button.dataset.preset as PresetId); if (!result.error) selected = result.doc.items[doc.items.length].id; apply(result); return; }
  if (button.dataset.confirm) { const s = doc.sources.find(s => s.id === button.dataset.confirm)!; apply(op.updateSource(doc, s.id, { confirmed: !s.confirmed })); return; }
  if (button.dataset.deleteSource) { const id = button.dataset.deleteSource, count = Object.keys(doc.matrix).filter(k => k.startsWith(`${id}|`)).length; modal(`<h2>Remove source?</h2><p>Removes this source, its ${doc.sources.find(s => s.id === id)!.legs.length} legs and ${count} matrix cells.</p><div class="dialog-actions"><button data-close>Cancel</button><button data-accept class="danger-button">Remove source</button></div>`, () => apply(op.deleteSource(doc, id))); return; }
  switch (button.dataset.action) {
    case 'dismiss': notice = ''; render(); break;
    case 'rotate': if (selected) apply(op.rotateItem(doc, selected)); break;
    case 'delete-item': deleteSelected(); break;
    case 'add-source': if (selected) apply(op.addSource(doc, selected)); break;
    case 'example': doc = exampleBand(doc.id); selected = null; persist(); render(); break;
  }
});
root.addEventListener('change', e => {
  const input = e.target as HTMLInputElement | HTMLSelectElement, value = input.value;
  if (input.id === 'band-name') { apply(op.updateDocument(doc, { name: value })); return; }
  if (input.id === 'stage-width' || input.id === 'stage-depth') { apply(op.setStage(doc, Number(document.querySelector<HTMLInputElement>('#stage-width')!.value), Number(document.querySelector<HTMLInputElement>('#stage-depth')!.value))); return; }
  if (input.id === 'console') { apply(op.setConsoleChannels(doc, Number(value))); return; }
  const item = doc.items.find(i => i.id === selected), key = input.dataset.itemField;
  if (item && key) {
    if (key === 'x' || key === 'y') apply(op.moveItem(doc, item.id, key === 'x' ? Number(value) : item.x, key === 'y' ? Number(value) : item.y));
    else if (key === 'mixId') apply(op.setWedgeMix(doc, item.id, value || null));
    else if (key === 'monitorType' || key === 'monitorMixId') apply(op.setPerformerMonitor(doc, item.id, key === 'monitorType' ? value as Item['monitorType'] : item.monitorType, key === 'monitorMixId' ? value || null : item.monitorMixId ?? null));
    else apply(op.updateItem(doc, item.id, { [key]: key === 'diCapacity' ? Number(value) : key === 'needsPower' ? (input as HTMLInputElement).checked : value }));
  }
  const sourceId = input.closest<HTMLElement>('[data-source]')?.dataset.source, sourceKey = input.dataset.sourceField;
  if (sourceId && sourceKey) apply(op.updateSource(doc, sourceId, { [sourceKey]: sourceKey === 'outputs' ? Number(value) : value } as Partial<Source>));
  const legId = input.closest<HTMLElement>('[data-leg]')?.dataset.leg, legKey = input.dataset.legField;
  if (legId && legKey) {
    if (legKey === 'diId') apply(op.updateLeg(doc, legId, { connection: value ? 'di' : 'unset', diId: value || null }));
    else if (legKey === 'connection' && value === 'di' && !doc.sources.flatMap(s => s.legs).find(l => l.id === legId)?.diId) { notice = 'Choose a DI box below to set explicit DI routing.'; render(); }
    else apply(op.updateLeg(doc, legId, { [legKey]: legKey === 'channel' ? value === '' ? null : Number(value) : value } as Partial<Leg>));
  }
});
function bindStage() {
  const svg = document.querySelector<SVGSVGElement>('#stage')!;
  const coords = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!.inverse()); return { x: p.x / 100, y: p.y / 100 }; };
  let drag: { id: string; dx: number; dy: number; x: number; y: number; el: SVGGElement } | null = null;
  svg.addEventListener('pointerdown', e => { const group = (e.target as Element).closest<SVGGElement>('[data-item]'); if (!group) { select(null); return; } const item = doc.items.find(i => i.id === group.dataset.item)!; const p = coords(e.clientX, e.clientY); drag = { id: item.id, dx: item.x - p.x, dy: item.y - p.y, x: item.x, y: item.y, el: group }; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  svg.addEventListener('pointermove', e => { if (!drag) return; const p = coords(e.clientX, e.clientY); const moved = op.moveItem(doc, drag.id, p.x + drag.dx, p.y + drag.dy).doc.items.find(i => i.id === drag!.id)!; drag.x = moved.x; drag.y = moved.y; drag.el.setAttribute('transform', `translate(${moved.x * 100} ${moved.y * 100})`); });
  svg.addEventListener('pointerup', () => { if (!drag) return; selected = drag.id; selectedSource = null; const result = op.moveItem(doc, drag.id, drag.x, drag.y); drag = null; apply(result); document.querySelector<SVGGElement>(`[data-item="${selected}"]`)?.focus(); });
  svg.addEventListener('pointercancel', () => { drag = null; render(); });
  svg.addEventListener('keydown', e => {
    const group = (e.target as Element).closest<SVGGElement>('[data-item]'); if (!group) return;
    const id = group.dataset.item!, item = doc.items.find(i => i.id === id)!; selected = id;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); document.querySelector<SVGGElement>(`[data-item="${id}"]`)?.focus(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const n = e.shiftKey ? 0.5 : 0.1; apply(op.moveItem(doc, id, item.x + (e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0), item.y + (e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0))); document.querySelector<SVGGElement>(`[data-item="${id}"]`)?.focus(); }
  });
  for (const button of document.querySelectorAll<HTMLElement>('[data-preset]')) button.addEventListener('dragstart', e => { e.dataTransfer?.setData('text/riderboard-preset', button.dataset.preset!); });
  svg.addEventListener('dragover', e => { e.preventDefault(); });
  svg.addEventListener('drop', e => { e.preventDefault(); const preset = e.dataTransfer?.getData('text/riderboard-preset'); if (!preset || !(preset in PRESETS)) return; const p = coords(e.clientX, e.clientY), result = op.addItem(doc, preset as PresetId, p.x, p.y); if (!result.error) selected = result.doc.items[doc.items.length].id; apply(result); });
}
render();
