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
- Vietnamese copy refresh and default-library expansion: `content-refresh-20260718.md`; cumulative smoke run `20260718T093612Z-ac961cb9` passed all 6 required gates with 18 questions and 32 suggestions.

## 2026-07-19

- Vietnamese serif rendering incident, six immutable raw screenshots, root-cause record and verified post-fix capture: `font-rendering-20260719/REPORT.md`.
- Production root exposure, public-only `dist/` remediation and required-field editor cancellation fix: `production-remediation-20260719.md`.
- Browser functional smoke: `browser-smoke-20260719.json`; isolated Chrome verified Hủy, × and Escape on invalid editors plus existing save/history, CRUD and privacy behavior.
- Pre-fix gate evidence: `20260719T095610Z-02e87d89` (font), `20260719T095656Z-f1621d31` (font + deployment boundary) and `20260719T100223Z-9f2a3731` (editor cancel).
- Final cumulative smoke run `20260719T100935Z-5f66d979` passed all 9/9 required gates after evidence/state updates.
