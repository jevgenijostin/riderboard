# RiderBoard

**One connected model keeps your stage plot and your paperwork consistent.**

A local-first browser app for gigging bands. Build a top-down SVG stage plot, explicitly assign each signal leg, and produce an input list, monitor matrix, equipment counts, planning checks and a printable tech rider.

[Open RiderBoard](https://jevgenijostin.github.io/riderboard/)

## Explicit routing

Coordinates describe placement, never routing. Moving a performer or wedge does not change channels, DI assignments, phantom requirements, stands or monitor mixes. Each sent leg (`mic`, `line`, `di`) consumes exactly one console input. A DI box is equipment, not another input. Stereo sends have separate L/R legs, channels and DI choices.

Presets create visible **unconfirmed** sources. Review each source in the inspector and click **Confirm**. Phantom starts **unknown (?)** and is never inferred. The four-piece rock example uses synthetic names and explicitly stored suggested monitor assignments; review those too.

## Use

1. Click or drag a palette preset onto the stage. Drag to move. Focus a stage item and press Enter to select; arrows move 0.1 m, Shift+arrows 0.5 m, Delete opens a cascade summary.
2. Edit sources in the inspector. Selecting a DI box explicitly sets DI routing; choose each stereo leg separately. Channels are manual unless you click **Auto-number channels**.
3. Add monitor mixes, assign wedges/performers in the inspector, and check source × mix cells. Multiple wedges can share a mix. IEM requires no wedge.
4. Review warnings. Click an item/source warning to select it; mix warnings open monitor editing. Global checks summarize the whole document.
5. Export JSON for backup. Import validates the entire file before replacing a band; importing over an existing band asks before replacement. All changes save locally when a field is committed (blur or selection change).
6. Click **Print rider**. Use A4 landscape in Chromium. Page 1 is the plot; tables follow with repeating headers and a disclaimer on every page. Large riders flow onto more pages. Disable the browser's optional headers/footers if you do not want its URL/date alongside the app's footer.

Audience is at the bottom. Stage left is on the screen right, from the performer's viewpoint. Positions are metres from the screen's back-left corner, snapped to 0.05 m and clamped inside the stage.

## Development

Use Node.js 24 LTS or newer (the key generator uses Node's built-in TypeScript stripping).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite with `/riderboard/`. No backend, external fonts, external data, analytics or API calls. Production precaches its own static files for offline reload after the first successful load; development does not register a service worker. Band data stays in localStorage, separate from the static cache.

```sh
npm run typecheck
npm run lint
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run preview
```

Playwright builds and serves the production app on port 4173; leave that port free. Tests use Chromium only and assert behavior, DOM geometry and generated PDF text, not OS-dependent visual snapshots. PDFs and screenshots are written under `test-results/` and uploaded by CI on both OSes. `pdfjs-dist` is a test-only PDF reader; the app uses browser print and has no PDF generation library.

Vite defaults to `/riderboard/`; set `VITE_BASE` at build time for another mount point. The CI workflow checks Ubuntu and Windows before the Pages job deploys a push to `main`.

## Demo licensing

```sh
npm run gen-key
```

Paste the resulting `RB-AAAA-BBBB-CCCC` key into **Upgrade**. The checksum is the first four uppercase hexadecimal characters of FNV-1a 32-bit over `riderboard:` + AAAA + BBBB. Input ignores surrounding whitespace and letter case.

- **Free:** one band, all planning tools, JSON import/export, watermarked print.
- **Pro demo:** unlimited saved bands and an unwatermarked print. Deactivation retains saved bands but hides the switcher until reactivation; the currently active band remains editable.
- Custom libraries, venue mode and stage variants are a nonfunctional **Coming soon** list.

**Demo licensing: not secure.** No payment integration or real license enforcement.

## Data and limits

- Version 1 JSON; deterministic incrementing entity IDs within each document.
- Maximum **60 items, 48 sources, 64 legs, 12 mixes**; operations refuse additions atomically if any cap is exceeded.
- Stage width **3–20 m**, depth **2–12 m**; default **8 × 5 m**.
- Console count **1–128**, default **24**.
- Names/mic descriptions up to 160 characters; notes up to 20,000; import files up to 2 MB.
- Schema implementation: `src/model/schema.ts`; the build also publishes `riderboard.schema.json`. JSON Schema covers structure; semantic reference checks are in `checkIntegrity()`.
- Imports drop unknown fields, round/clamp positions with notices, and reject wrong versions, malformed values, duplicate/dangling IDs and cap violations. Planning mistakes such as duplicate integer channel assignments remain editable and appear in warnings.
- Storage: `riderboard:v1` holds `{ bands, activeId }`; `riderboard:license` holds the demo key. Corrupt or unavailable storage shows a notice. **localStorage is not a backup; export JSON to back up.** Clear all local data removes both keys, leaving the offline app shell available.

## Known limitations

Presets are assumptions. This is a planning aid, not certification. There is no power-distance analysis, venue inventory comparison, electrical analysis or IEM frequency coordination. One stage per band; no stage variants, risers or levels. Browser print only; large riders print across multiple pages. Repeating page-margin footers are verified in Chromium; other browsers' print behavior is not tested. Deliberately overlapping items remain overlapped: arrange the plot before printing. Long plot labels are abbreviated, with full source names in the tables and full item names in the inspector/tooltips. No undo, multi-selection, copy/paste, zoom/pan, custom gear libraries, uploaded artwork, backend, accounts, cloud sync or payments. Demo licensing is not secure. Only the single four-piece template is included; monitor cells are boolean.

## Disclaimer

Planning aid only. Presets are generic assumptions; confirm with your sound engineer. Not an electrical or venue-compatibility certification.
