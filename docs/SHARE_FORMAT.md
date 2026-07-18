# Ánh Trăng Khuya File Formats

## Full backup

Suffix: `.atk-backup.json`

`fileType` is `anh-trang-khuya.backup` and `schemaVersion` is `1`. The `data` object owns question definitions, suggestion-library items, nightly entries and settings. This file is private personal data. Restore validates the envelope, downloads the current database as a rollback file, then replaces all stores in one IndexedDB transaction.

## Definition share package

Suffix: `.atk-share.json`

`fileType` is `anh-trang-khuya.share-package` and `schemaVersion` is `1`. The `modules` object may contain `questions`, `emotions` and `imagery`. It must not contain entries, notes, desired outcomes or settings.

Import uses safe merge by default:

- a new ID is added;
- an identical ID and identical content is skipped;
- an identical ID with different content is cloned under a new ID and marked as a shared copy;
- existing local content is never overwritten by a share package.

Unknown schema versions are rejected rather than guessed.
