---
last_verified: 2026-07-18
verified_by: Codex
status: active
---

# Next Actions

Each action must have one outcome, one gate, and one rollback point.

1. **Owner nightly pilot:** use the app on the intended phone for 3-7 nights and record only actionable wording/flow issues in project state. Gate: every saved day can be exported, deleted in a test profile and restored from backup. Rollback: retain the current Git checkpoint and latest `.atk-backup.json` outside the browser.
2. **Static deployment when owner chooses:** prefer Cloudflare Pages Direct Upload for a public HTTPS link without a public source repository, following `docs/DEPLOYMENT.md`. Gate: HTTPS load, install prompt/add-to-home-screen, one offline reload, conditional follow-up, test backup export and restore. Rollback: keep the last known-good deployment and unpublish the new deployment if any gate fails.
3. **Cloud sync only if the pilot proves a real need:** write a new ADR covering authentication, authorization, encryption, deletion, server backup, provider limits and migration before code. Gate: two-device isolated-user contract plus export/restore remains working. Rollback: sync adapter can be disabled without changing local IndexedDB data.
