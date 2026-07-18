# ADR-0001: Local-first dependency-free PWA

- Status: accepted
- Date: 2026-07-18

## Context

The app holds sensitive personal reflections, is initially used by one person, should work across platforms and should cost little or nothing. It also needs easy sharing of reusable question blocks without exposing nightly answers.

## Decision

Build a static progressive web app with no backend in the first release. Store runtime data in IndexedDB, cache application assets with a service worker and provide two separate versioned JSON formats:

- `.atk-backup.json` for complete user-controlled backup/restore;
- `.atk-share.json` for reusable question, emotion and imagery definitions only.

Use browser-native APIs and system fonts so the app can be hosted as static files and opened as a portable folder where browser capabilities permit. Keep the data contract independent of any future sync provider.

## Alternatives

- Cloud database from day one: enables sync but adds authentication, privacy policy, service dependency and operating cost before the single-user workflow is proven.
- Native mobile/desktop apps: stronger platform integration but multiply packaging and distribution work.
- Spreadsheet or form: inexpensive but weak for conditional nested questions, immutable snapshots, offline UX and reusable block sharing.

## Consequences

- Static hosting can be free and the app remains private by default.
- Data does not automatically follow the user to another device; backup/import is the first-release transfer path.
- Browser storage can be cleared, so the UI must clearly request persistent storage and teach regular exports.
- A later optional sync adapter may be added behind the same data contracts only after an explicit privacy/security decision.

## Verification And Rollback

- Verify with model/file-format tests, static PWA checks and cumulative smoke gates.
- Roll back code to Git commit `215c1d1`; restore user data from the latest exported backup.
