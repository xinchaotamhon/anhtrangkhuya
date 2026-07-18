---
last_verified: 2026-07-18
verified_by: Codex + project gates
status: active
---

# Next AI Handoff

Read local `START_HERE.md` and follow its full read order first. Routine continuation must not require chat history or Vault availability. Then state the evidence-backed baseline before editing.

## Verified Baseline

- Local-first dependency-free PWA is implemented with 18 questions, conditional follow-ups, CRUD definitions/libraries, IndexedDB history/progress and versioned backup/share formats.
- Baseline rollback before product work is Git commit `215c1d1`.
- Read `40-State/CURRENT_STATE.md` and `50-Evidence/EVIDENCE_INDEX.md` for current test/evidence owners; do not infer success from this handoff alone.
- The global `npm` launcher is broken on the current machine. Use direct Node commands recorded in `README.md` and `gates/gates.json`.

## Allowed Next Work

1. Run the owner nightly pilot or perform an explicitly authorized static deployment from `docs/DEPLOYMENT.md`.
2. Fix one observed usability/content issue at a time with a focused regression gate and cumulative smoke.
3. Use the bounded optional prompts in `80-Handoffs/LOW_COST_AI_PROMPTS.md` only for their stated low-risk scopes.

## Boundaries

- Do not mutate raw inputs.
- Do not expose secrets.
- Do not expand scope without a decision record.
- Do not claim success without repeatable evidence.
- Do not add accounts, backend sync, analytics or transmit reflection data without a new owner-approved ADR and privacy/security gates.
- Do not let definition CRUD mutate snapshots in existing nightly entries.
- Do not put `.atk-backup.json` or `.atk-share.json` runtime files in Git or static deployment artifacts.
- Consult the pinned Vault only to find/adopt a new capability, propose a reusable candidate or review a standard upgrade.

## Definition Of Done

- Relevant tests pass.
- Evidence is stored and indexed.
- Current state and next actions are updated.
- Rollback remains available.
- All applicable older required gates and the new focused gate pass on the same worktree.
