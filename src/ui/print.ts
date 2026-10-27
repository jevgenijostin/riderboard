import type { Doc } from '../model/types';
import { inputList, equipmentCounts, monitorMatrix } from '../model/derive';
import { validate } from '../model/validate';
import { stageMarkup } from './stage';
import { esc } from './html';
export const DISCLAIMER =
  'Planning aid only. Presets are generic assumptions; confirm with your sound engineer. Not an electrical or venue-compatibility certification.';
export function printMarkup(d: Doc, pro: boolean) {
  const issues = validate(d),
    inputs = inputList(d),
    counts = equipmentCounts(d),
    matrix = monitorMatrix(d);
  // Text uses stage units in SVG; compensate for the physical print scale to retain >= 8pt.
  const scale = Math.min(
    (277 * 96) / 25.4 / (d.stage.widthM * 100 + 180),
    (145 * 96) / 25.4 / (d.stage.depthM * 100 + 145),
  );
  const plot = stageMarkup(d, issues, null)
    .replace('id="stage"', 'id="print-stage"')
    .replaceAll('id="grid"', 'id="print-grid"')
    .replaceAll('url(#grid)', 'url(#print-grid)')
    .replaceAll('tabindex="0"', 'tabindex="-1"');
  const table = (id: string, heads: string[], rows: string[][]) =>
    `<table id="${id}"><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  return `<article id="print-rider" aria-label="Printable tech rider"><style>@page { @bottom-center { content: "${DISCLAIMER}${pro ? '' : '\\A Made with RiderBoard (free)'}"; font: 8pt Arial, sans-serif; white-space: pre-wrap; color: #36503f; } }</style><footer class="print-footer">${DISCLAIMER}${pro ? '' : '<strong class="watermark">Made with RiderBoard (free)</strong>'}</footer>
    <section class="print-plot"><header><div><h1 ${d.name.length > 70 ? 'style="font-size:14pt"' : ''}>${esc(d.name)}</h1><p>TECH RIDER · Stage ${d.stage.widthM} × ${d.stage.depthM} m · Console ${d.consoleChannels} inputs</p></div><span>RIDERBOARD<br>STAGE & SIGNAL</span></header><div style="--plot-font:${10.8 / scale}px">${plot}</div></section>
    <section class="print-section"><h2>Input list</h2><p>${inputs.length} sent legs · ${counts.inputsAssigned} assigned · ${counts.phantomUnknown} phantom requirements unknown (?)</p>${table(
      'print-inputs',
      ['CH', 'Source', 'Connection', 'DI box', 'Mic model', 'Stand', 'Phantom', 'Confirmed'],
      inputs.map((r) => [
        String(r.channel ?? '—'),
        r.label,
        r.connection,
        r.diName ?? '—',
        r.micModel || '—',
        r.stand,
        r.phantom === 'unknown' ? '? unknown' : r.phantom,
        r.confirmed ? 'yes' : 'unconfirmed',
      ]),
    )}</section>
    <section class="print-section"><h2>Monitor matrix</h2>${table(
      'print-matrix',
      ['Source', ...matrix.columns.map((m) => m.name)],
      matrix.rows.map((s, n) => [s.name, ...matrix.cells[n].map((c) => (c ? 'Yes' : '—'))]),
    )}<h3>Mix outputs</h3>${table(
      'print-outputs',
      ['Mix', 'Kind', 'Outputs'],
      matrix.columns.map((m, n) => [m.name, m.kind, matrix.outputs[n].names.join(', ') || 'Unassigned']),
    )}<h3>Performer monitoring</h3>${table(
      'print-performers',
      ['Performer', 'Monitor type', 'Mix'],
      d.items
        .filter((i) => i.kind === 'performer')
        .map((i) => [
          i.name,
          i.monitorType ?? 'unset',
          d.mixes.find((m) => m.id === i.monitorMixId)?.name ?? 'Unassigned',
        ]),
    )}</section>
    <section class="print-section"><h2>Equipment counts</h2>${table(
      'print-equipment',
      ['Equipment', 'Count'],
      Object.entries({
        'Inputs total': counts.inputsTotal,
        'Inputs assigned': counts.inputsAssigned,
        'Mic legs': counts.mics,
        'Mono DIs': counts.diMono,
        'Stereo DIs': counts.diStereo,
        'Stands to carry': counts.standsToCarry,
        ...Object.fromEntries(Object.entries(counts.stands).map(([k, v]) => [`Stand requirement: ${k}`, v])),
        Wedges: counts.wedges,
        'IEM mixes': counts.iemMixes,
        'Power drops': counts.powerDrops,
        Amps: counts.amps,
        Performers: counts.performers,
      }).map(([k, v]) => [k, String(v)]),
    )}<p>Stands counted per source with a mic leg. Handheld and none are not stands to carry. Unset requirements need confirmation.</p></section>
    <section class="print-section"><h2>Warnings & assumptions</h2><p>Advance-planning checks, not certification. ${issues.length} outstanding checks.</p>${table(
      'print-warnings',
      ['Severity', 'Rule', 'Message'],
      issues.map((i) => [i.severity, i.id, i.message]),
    )}<h2>Notes</h2><p class="print-notes">${esc(d.notes) || 'No additional notes.'}</p></section></article>`;
}
