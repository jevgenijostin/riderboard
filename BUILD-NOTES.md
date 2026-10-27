# RiderBoard build notes

Build started 2026-10-27 at approximately 20:19 UTC. Phase durations and final verification will be recorded here as work completes.

## Decisions

- Used the existing empty `C:\Dev\personal\riderboard` workspace and its existing public GitHub remote, rather than creating a nested project.
- Direct commits to `main` follow the explicit project override. No attribution trailers.
- CI and Pages deployment live in one workflow; deployment depends on both matrix jobs.
- Planning errors remain editable. Import rejects structural corruption and dangling references atomically.

## Progress

- Phase 0: Vite/strict TypeScript scaffold, Vitest, Chromium Playwright, ESLint, Windows/Linux CI and Pages configured. Local scaffold checks passed; initial remote matrix pending.
