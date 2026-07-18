# Product Contract - Ánh Trăng Khuya

## Purpose

Ánh Trăng Khuya is a private nightly reflection app. It helps one person answer structured questions, keep contextual notes, revisit earlier thinking and observe progress without turning reflection into a diagnosis or a competition.

## Intended Outcomes

- Work in modern browsers on phones, tablets and desktop; remain useful offline after first hosted load.
- Let the user create, read, update and delete questions, nested follow-ups, emotion definitions and project imagery prompts.
- Save one editable reflection per date with the exact question wording and evaluation rule used that night.
- Show completion, positive signals and items needing improvement across history.
- Export a complete backup and restore it deliberately with rollback.
- Export/import a versioned definition-only share package that another copy of the app can use safely.

## Non-goals For The First Release

- No account, server database, automatic cross-device sync, social feed, AI analysis or behavioral tracking.
- No medical, psychological or moral diagnosis.
- No public sharing of private nightly answers.
- No dependency-heavy framework or paid service required to run the core app.

## Invariants

1. Personal runtime data never leaves the device unless the user explicitly exports a file.
2. Editing a definition never changes the wording or scoring snapshot stored in older entries.
3. Import is validated before mutation; full restore first downloads a rollback backup.
4. A share package excludes reflections, notes and desired outcomes.
5. Every user-visible score remains traceable to an answer and its saved evaluation rule.
6. The app remains usable without network access after its assets have been cached.

## Acceptance Gates

- Default content includes every owner-supplied reflection question and both positive/improvement evaluation directions.
- Model tests cover scoring, immutable snapshots, backup validation and safe share merging.
- Static app gate verifies the manifest, offline worker, privacy boundary and required screens.
- Existing foundation smoke gates and all new app gates pass on the same worktree.

## Backup And Rollback

- Code rollback point before product work: Git commit `215c1d1`.
- Runtime rollback: export a full `.atk-backup.json` file before a restore; the app performs this export automatically before replacing its database.
- Code rollback: return to the baseline commit or revert the product commit; never delete the user's exported data files.
