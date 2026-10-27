# RiderBoard build notes

Build started 2026-10-27 at approximately 20:19 UTC. Phase durations and final verification will be recorded here as work completes.

## Decisions

- Used the existing empty `C:\Dev\personal\riderboard` workspace and its existing public GitHub remote, rather than creating a nested project.
- Direct commits to `main` follow the explicit project override. No attribution trailers.
- CI and Pages deployment live in one workflow; deployment depends on both matrix jobs.
- Planning errors remain editable. Import rejects structural corruption and dangling references atomically.

## Progress

- Phase 0 (20:19–20:24 UTC, approximately 5 min): Vite/strict TypeScript scaffold, Vitest, Chromium Playwright, ESLint, Windows/Linux CI and Pages configured. Local checks and both remote matrix jobs passed before model implementation. Initial Pages deployment succeeded. Run: https://github.com/jevgenijostin/riderboard/actions/runs/40577078829
- Phase 1 (20:24–20:28, approximately 4 min): immutable model API, all 17 validation rules, derivations, Zod-backed sanitizer/JSON Schema, cascades, caps, storage and template. Checkpoint A passed with 48 model tests, lint and typecheck. Model commit also passed both remote jobs.
- Phase 2 (20:28–20:33, approximately 5 min): responsive SVG editor, original basic symbols, palette click/drop, mouse movement, keyboard nudge, selection, inspector and cascade dialogs. Browser movement/orientation tests passed.
- Phase 3 (20:33–20:35, approximately 2 min): input list, boolean monitor matrix, mix/output editing, equipment counts, warning selection, notes, JSON backup/restore and clear action. Checkpoint B reached. Both OSes passed the intermediate editor and paperwork commits.
- Phase 4 (20:35–20:37, approximately 2 min): A4 landscape print view with explicit routing/output information, disclaimer, watermark, key generation/checking, one-band free gate and Pro switcher. License unit tests passed.
- Phase 5 (20:37-20:54): acceptance suite, maximum-size PDF analysis, visual review, offline precache, regression fixes, readability formatting, documentation. Codex's workspace ran out of ChatGPT Team credits at 20:54:20Z mid-Phase-5 (task_complete error: "Your workspace is out of credits") - the same quota-exhaustion pattern documented on the Portcullis 2026-10-16 night. All substantive engineering (model, editor, paperwork, print, license, acceptance tests, bug fixes) had already landed and been committed/pushed before the cutoff; only this file's final summary and a missing LICENSE were left. Ada finished both directly (plain technical writing/standard MIT boilerplate on already-built, already-understood code, no Codex needed) rather than let a retry fail instantly against the same exhausted quota.

## Final verification (Ada, independent, 2026-10-27 ~21:55 UTC)

- Unit suite: 53/53 passing (re-ran herself, matches Codex's own count).
- E2E suite: 13/13 Playwright tests passing (re-ran herself, matches Codex's own count).
- `tsc --noEmit`: clean. `eslint .`: clean.
- CI: 6/6 runs green on real GitHub Actions infra (ubuntu+windows matrix) across all 6 commits, including the final one.
- Live Pages deploy confirmed via curl: HTTP 200 at https://jevgenijostin.github.io/riderboard/.
- Grepped `src/` for fetch/XMLHttpRequest/WebSocket/axios: zero matches outside tests.
- LICENSE (MIT) added - was missing, same convention as every precedent repo.

## Scope decisions and cuts

- Exactly one four-piece rock template. No additional templates.
- Boolean monitor cells; no cell notes.
- Delete has an explicit cascade summary and confirmation, no undo.
- Single-item keyboard nudge; no multi-selection or other out-of-scope features.
- License activation and band switching have a simple functional UI; no payments or security claims.
- These choices follow the brief's minimal scope/cut list; model rules, tests, JSON round trips, print basics and CI were not cut.

## Ambiguities resolved

- New empty sources also start unconfirmed. Confirming is an explicit user action, not proof of correctness; planning rules still run after confirmation.
- Choosing a DI requires choosing an existing DI box; the inspector's DI selection sets the connection explicitly. No proximity or type-based routing is inferred.
- Unsent legs and legs disconnected by DI deletion have their channel cleared, so numbering cannot leave stale assignments behind. Phantom is preserved; it is never inferred.
- Fractional stage dimensions are allowed. Positions snap to the nearest 0.05 m point that remains inside the stage, including fractional edges.
- Unknown kind-specific fields are stripped during import/operations. Extra text/import bounds (160-character names, 20,000-character notes, 2 MB files) keep local import/rendering bounded.
- Import replaces the active band after confirmation if it has content; it does not bypass the free one-band limit. Colliding IDs with another saved band are refused. Pro deactivation retains all saved data but exposes only the active band until reactivation.
- Print uses a separate DOM view of the same model and Chromium page-margin footer boxes. A fixed footer failed the PDF test by being clipped and was replaced. Browser-added URL/date headers are optional browser settings.
- Offline support caches only the app's own static assets, not band data. Service-worker activation is tested before disconnecting. Asset-cache lookup ignores `Vary` because these are identical static assets; this fixes preview server Origin-header differences for module scripts.
- Maximum-size test uses all caps simultaneously: 60 items, 48 sources, 64 sent legs and 12 mixes. PDF.js reads the test PDF; only Chromium generates it.

## Verification record

- Current unit suite: 53 tests (49 model + 4 license), none intentionally skipped.
- Current browser suite: 13 tests: E1–E10 plus offline reload/editing, palette drop/stage resize/explicit numbering, and typing then immediately clicking Export, with no console errors or external requests permitted.
- PDF tests verify all input and matrix rows, plot containment, no clipped table cells, at least 8pt actual PDF text, repeating input headers, complete input rows on each page, and disclaimer/watermark on every page. PDF and screenshots are CI artifacts.
- Visual inspection performed on the desktop example and maximum-size print plot. Found/fixed example DI-label overlap and overlapping positions in the test fixture.
- Found/fixed fractional edge rounding and incomplete offline precache through targeted tests.
- Found/fixed an input-blur rerender that swallowed the first button click after editing a field. Model updates remain immediate; rerender waits until the pointer action can be dispatched. Added a regression test.
- Final local/remote results and completion time will be added after the last verification run.
