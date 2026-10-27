import { type Doc, CONNECTIONS, STANDS } from '../model/types';
import { esc, field, options, empty } from './html';
export function inspectorMarkup(d: Doc, selected: string | null, sourceId: string | null) {
  const i = d.items.find((i) => i.id === selected);
  if (!i)
    return `<div class="panel-heading"><span class="eyebrow">03 / INSPECTOR</span><h2>Make it explicit.</h2></div>${empty('Select an item on the stage to edit its position, signals and monitor assignments.')}<div class="inspector-tip"><strong>Position ≠ routing</strong><p>Moving gear never changes channels, DI assignments or monitor mixes.</p></div>`;
  const mixes = [{ value: '', label: 'Unassigned' }, ...d.mixes.map((m) => ({ value: m.id, label: m.name }))];
  return `<div class="panel-heading"><span class="eyebrow">03 / INSPECTOR</span><h2>${esc(i.name)}</h2><span class="kind-label">${esc(i.kind)}</span></div>
    ${field('Item name', `<input data-item-field="name" value="${esc(i.name)}" maxlength="160">`)}
    <div class="field-pair">${field('X · metres', `<input data-item-field="x" type="number" step="0.05" min="0" max="${d.stage.widthM}" value="${i.x}">`)}${field('Y · metres', `<input data-item-field="y" type="number" step="0.05" min="0" max="${d.stage.depthM}" value="${i.y}">`)}</div>
    <button data-action="rotate" class="quiet full">Rotate 90° <span>↻</span></button>
    ${
      i.kind === 'di'
        ? field(
            'DI capacity',
            `<select data-item-field="diCapacity">${options(
              [
                { value: '1', label: '1 channel · mono' },
                { value: '2', label: '2 channels · stereo' },
              ],
              i.diCapacity,
            )}</select>`,
          )
        : ''
    }
    ${i.kind === 'wedge' ? field('Wedge carries', `<select data-item-field="mixId">${options(mixes, i.mixId)}</select>`) : ''}
    ${i.kind === 'performer' ? field('Monitor type', `<select data-item-field="monitorType">${options(['unset', 'none', 'wedge', 'iem'], i.monitorType)}</select>`) + (['wedge', 'iem'].includes(i.monitorType ?? '') ? field('Performer listens to', `<select data-item-field="monitorMixId">${options(mixes, i.monitorMixId)}</select>`) : '') : ''}
    ${['amp', 'instrument'].includes(i.kind) ? `<label class="check-field"><input type="checkbox" data-item-field="needsPower" ${i.needsPower ? 'checked' : ''}> Needs power</label>` : ''}
    <div class="section-title"><h3>Signal sources</h3><button data-action="add-source" class="text-button">+ Add</button></div>
    ${
      d.sources
        .filter((s) => s.itemId === i.id)
        .map(
          (
            s,
          ) => `<section class="source-editor ${s.id === sourceId ? 'active-source' : ''}" data-source="${esc(s.id)}">
      <div class="source-heading"><span class="pill ${s.confirmed ? 'confirmed' : ''}">${s.confirmed ? 'confirmed' : 'unconfirmed'}</span><button class="text-button" data-confirm="${esc(s.id)}">${s.confirmed ? 'Reopen' : 'Confirm'}</button></div>
      ${field('Source name', `<input data-source-field="name" value="${esc(s.name)}" maxlength="160">`)}
      ${field(
        'Outputs',
        `<select data-source-field="outputs">${options(
          [
            { value: '1', label: 'Mono · 1 leg' },
            { value: '2', label: 'Stereo · L + R' },
          ],
          s.outputs,
        )}</select>`,
      )}
      ${field('Stand', `<select data-source-field="stand">${options(STANDS, s.stand)}</select>`)}
      ${field('Mic / pickup model', `<input data-source-field="micModel" value="${esc(s.micModel)}" maxlength="160" placeholder="Confirm with engineer">`)}
      ${s.legs
        .map(
          (
            l,
            n,
          ) => `<fieldset data-leg="${esc(l.id)}"><legend>${s.outputs === 2 ? (n === 0 ? 'Left leg' : 'Right leg') : 'Signal leg'}</legend>
        ${field(
          'Connection',
          `<select data-leg-field="connection">${options(
            CONNECTIONS.map((c) => ({ value: c, label: c === 'notSent' ? 'not sent' : c })),
            l.connection,
          )}</select>`,
        )}
        ${field('DI box', `<select data-leg-field="diId">${options([{ value: '', label: 'Choose a DI (sets DI routing)' }, ...d.items.filter((i) => i.kind === 'di').map((i) => ({ value: i.id, label: `${i.name} · ${i.diCapacity}ch` }))], l.diId)}</select>`)}
        <div class="field-pair">${field('Channel', `<input type="number" step="1" data-leg-field="channel" value="${l.channel ?? ''}" placeholder="—" ${['unset', 'notSent'].includes(l.connection) ? 'disabled' : ''}>`)}${field(
          'Phantom',
          `<select data-leg-field="phantom">${options(
            [
              { value: 'unknown', label: '? unknown' },
              { value: 'yes', label: 'yes' },
              { value: 'no', label: 'no' },
            ],
            l.phantom,
          )}</select>`,
        )}</div></fieldset>`,
        )
        .join('')}
      <button data-delete-source="${esc(s.id)}" class="text-button danger">Remove source</button></section>`,
        )
        .join('') || empty('No sources. Add one only if this item sends a signal.')
    }
    <button data-action="delete-item" class="danger-button full">Delete item…</button>`;
}
