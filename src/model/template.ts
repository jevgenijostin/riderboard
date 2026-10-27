import * as op from './operations';
import type { PresetId } from './presets';
export function exampleBand(id = 'band1') {
  let d = op.createDoc('The Signal Club', id);
  const layout: [PresetId, number, number, string][] = [ ['drums', 4, 1.2, 'Kit'], ['vocalStand', 4, 3.5, 'Alex · vocal'], ['guitar', 1.4, 2, 'River · guitar'], ['bass', 6.5, 2, 'Morgan · bass'], ['performer', 4, 1.8, 'Casey · drums'], ['wedge', 3, 4.3, 'Front wedge'], ['wedge', 5, 4.3, 'Side wedge'], ['power', 1, 0.6, 'Stage power'] ];
  for (const [preset, x, y, name] of layout) { const before = d.items.length; d = op.addItem(d, preset, x, y).doc; d = op.renameItem(d, d.items[before].id, name).doc; }
  d = op.addMix(d, 'Front mix').doc;
  // This template explicitly stores suggested assignments. Source assumptions stay unconfirmed.
  for (const w of d.items.filter(i => i.kind === 'wedge')) d = op.setWedgeMix(d, w.id, d.mixes[0].id).doc;
  d = op.setPerformerMonitor(d, d.items.find(i => i.name === 'Alex · vocal')!.id, 'wedge', d.mixes[0].id).doc;
  d.notes = 'Example assumptions only. Confirm every source, stand, phantom requirement and monitor assignment with your sound engineer.';
  return d;
}
