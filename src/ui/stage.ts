import type { Doc, Item } from '../model/types';
import type { Issue } from '../model/validate';
import { esc } from './html';
export const SYMBOLS: Record<Item['kind'], string> = {
  performer: '<circle cy="-8" r="9"/><path d="M-16 18v-6a16 16 0 0 1 32 0v6Z"/>',
  instrument:
    '<rect x="-22" y="-13" width="44" height="26" rx="4"/><path d="M-14 -10v20M-7 -10v20M0 -10v20M7 -10v20M14 -10v20"/>',
  amp: '<rect x="-20" y="-22" width="40" height="43" rx="4"/><circle r="12" cy="4"/><path d="M-12 -13h24"/>',
  wedge: '<path d="M-23 16l7-33h32l7 33Z"/><path d="M-12 -6h24M-14 2h28M-16 10h32"/>',
  di: '<rect x="-19" y="-13" width="38" height="26" rx="4"/><circle cx="-10" r="3"/><circle cx="10" r="3"/>',
  power: '<rect x="-17" y="-20" width="34" height="40" rx="4"/><path d="M3-14L-7 2h8l-4 13L9-3H1Z"/>',
};
export function stageMarkup(d: Doc, issues: Issue[], selected: string | null) {
  const w = d.stage.widthM * 100,
    h = d.stage.depthM * 100;
  return `<svg id="stage" viewBox="-90 -65 ${w + 180} ${h + 145}" role="group" aria-label="Stage plot, audience at bottom" data-width="${w}" data-depth="${h}">
    <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="currentColor" stroke-width="0.65"/></pattern></defs>
    <rect class="stage-surface" x="0" y="0" width="${w}" height="${h}" rx="4"/>
    <rect class="stage-grid" x="0" y="0" width="${w}" height="${h}" fill="url(#grid)"/>
    <text class="orientation back-label" x="${w / 2}" y="-27">UPSTAGE / BACK</text>
    <text class="orientation" data-orientation="right" x="-57" y="${h / 2}" transform="rotate(-90 -57 ${h / 2})">STAGE RIGHT</text>
    <text class="orientation" data-orientation="left" x="${w + 57}" y="${h / 2}" transform="rotate(90 ${w + 57} ${h / 2})">STAGE LEFT</text>
    <text class="orientation audience" data-orientation="audience" x="${w / 2}" y="${h + 43}">↓ AUDIENCE ↓</text>
    <path class="scale-bar" d="M0 ${h + 35}v8m0-4h100m0-4v8"/><text class="scale-text" x="50" y="${h + 63}">1 m</text>
    <text class="scale-text dimensions" x="${w}" y="${h + 63}" text-anchor="end">${d.stage.widthM} × ${d.stage.depthM} m</text>
    ${d.items
      .map((i) => {
        const sources = d.sources.filter((s) => s.itemId === i.id),
          count = issues.filter((issue) => issue.itemId === i.id && issue.severity !== 'info').length;
        return `<g class="stage-item ${i.kind} ${selected === i.id ? 'selected' : ''}" data-item="${esc(i.id)}" transform="translate(${i.x * 100} ${i.y * 100})" tabindex="0" role="button" aria-label="${esc(i.name)}, ${i.kind}, ${i.x}, ${i.y} metres${count ? `, ${count} issues` : ''}">
        <title>${esc(i.name)} · ${i.kind} · ${i.x}, ${i.y} m</title><rect class="hit-area" x="-39" y="-36" width="78" height="79" rx="10"/>
        <g class="symbol" transform="rotate(${i.rot})">${SYMBOLS[i.kind]}</g><text class="item-label" y="36">${esc(i.name.length > 23 ? i.name.slice(0, 22) + '…' : i.name)}</text>
        ${count ? `<g class="issue-badge"><circle cx="28" cy="-25" r="10"/><text x="28" y="-21">${count}</text></g>` : ''}
        ${sources.some((s) => !s.confirmed) ? '<text class="unconfirmed-badge" x="0" y="-40">unconfirmed</text>' : ''}</g>`;
      })
      .join('')}</svg>`;
}
