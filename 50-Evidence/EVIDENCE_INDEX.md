# Evidence Index

Add dated links to reproducible logs, benchmarks, screenshots, hashes, and test output. Do not copy conclusions without their artifact.

## 2026-07-18

- Foundation baseline: `events.jsonl` run `20260718T070357Z-0c97a8ad`; 4/4 required foundation gates passed before product work.
- Machine-readable gate logs: `gate-logs/` (each run records expected/observed exit status and command).
- Browser functional smoke: `browser-smoke-20260718.json`; isolated profile verified ready state, conditional follow-up, IndexedDB entry/history, question CRUD, library CRUD and share privacy boundary.
- Desktop loaded UI: `ui-home-final.png` at 1440×1600.
- Reproduced mobile overlap before fix: `ui-mobile-final.png` at 390×844.
- Verified mobile layout after fix: `ui-mobile-verified.png` at 390×844.
- Early browser-orchestration attempts (`ui-home.png`, `ui-home-success.png`, `ui-home-verified.png`, `ui-home-loaded.png`) are retained as failed raw evidence and are not product-pass screenshots.
