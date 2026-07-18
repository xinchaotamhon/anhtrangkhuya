---
last_verified: YYYY-MM-DD
verified_by: NAME_OR_COMMAND
status: active
---

# Known Failures

For every retained failure, record:

- stable ID and date;
- symptom and impact;
- minimal reproduction and raw evidence;
- root cause or `unknown`;
- failed approaches;
- disposition;
- regression gate ID or reason a deterministic gate is not feasible.

Do not remove an entry after fixing it. Mark it fixed and link the gate that prevents recurrence.

## ATK-20260718-001 - Broken global npm launcher

- Date: 2026-07-18
- Symptom/impact: `npm test` and `npm run check:static` exit before running because the global launcher references a missing `C:/Users/vhiep/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js`.
- Minimal reproduction: run `npm test` in the repository on the current machine.
- Root cause: machine-level npm installation/launcher is incomplete; Node.js `v24.12.0` itself works.
- Failed approach: invoking project scripts through npm.
- Disposition: accepted environment limitation; project smoke gates invoke dependency-free Node commands directly.
- Prevention: `app.model-contract` and `app.static-pwa-contract` never route through npm.

## ATK-20260718-002 - Mobile save bar covered the first question

- Date: 2026-07-18
- Symptom/impact: at a 390×844 viewport, the sticky save bar covered the first question before the user had scrolled through the form.
- Minimal reproduction: load the initial MVP at 390×844 and capture the top viewport; see `50-Evidence/ui-mobile-final.png`.
- Root cause: the desktop sticky save behavior was inherited by the narrow-screen media rule.
- Failed approach: initial responsive rule changed flex direction but retained sticky positioning.
- Disposition: fixed by making the save bar static at widths up to 720px; verified in `50-Evidence/ui-mobile-verified.png`.
- Regression gate: `app.static-pwa-contract` asserts the narrow-screen non-overlay rule.
