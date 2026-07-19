# Production Boundary and Editor Cancellation Remediation — 2026-07-19

## Public deployment boundary incident

Read-only inspection of `https://anhtrangkhuya.xinchao-tamhon.workers.dev/` returned HTTP 200 not only for runtime assets, but also for:

- `/START_HERE.md`
- `/README.md`
- `/package.json`
- `/tests/model.test.js`
- `/50-Evidence/EVIDENCE_INDEX.md`

This proves the repository root had been uploaded instead of a public-only release folder. No runtime nightly reflections are stored in Git, but internal project memory, tests and existing evidence were unnecessarily public.

Local remediation:

- `tools/build_deploy.mjs` recreates `dist/` from an exact 10-file allowlist.
- `wrangler.jsonc` targets existing Worker `anhtrangkhuya` and sets `assets.directory` to `./dist`.
- Required gate `app.deploy-bundle-contract` rebuilds the bundle, checks the exact file list and byte-compares every public asset with its reviewed source.
- `_headers` now declares the manifest MIME type explicitly.
- Deployment guidance no longer instructs anyone to upload the repository root.

Pre-fix gate run `20260719T095656Z-f1621d31` recorded both the font and deployment-boundary gates failing. Final run `20260719T100935Z-5f66d979` passed all 9/9 required gates after evidence/state updates. Production still requires a new deployment before the public internal paths become 404.

## Required-field cancellation incident

The editor's × and Hủy controls were submit buttons inside a form with required fields. Browser constraint validation happened before the submit listener, so an empty editor could not be abandoned.

Local remediation:

- Both controls are now `type="button"` with `data-editor-cancel`.
- The click handler closes the dialog directly; the dialog close event clears editor state.
- Required gate `app.editor-cancel-contract` prevents cancel controls from becoming form submitters again.
- Pre-fix run `20260719T100223Z-9f2a3731` recorded the cancel contract failing while the other eight gates passed.
- `browser-smoke-20260719.json` verifies Hủy, × and Escape close invalid empty editors, then verifies question/library CRUD and the share privacy boundary. All observed checks passed.

## Rollback and production verification

Source rollback is a focused revert of the font stack, dialog controls and deployment files. Production rollback is available from the Cloudflare Worker deployment history. After the new version is deployed, verify runtime assets return 200 and `/START_HERE.md`, `/README.md`, `/tests/model.test.js` and `/50-Evidence/EVIDENCE_INDEX.md` return 404.
