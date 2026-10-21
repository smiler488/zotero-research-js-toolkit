# Zotero API compatibility

Audit date: **2026-10-21**. Baseline: **Zotero 10.0.6**, released on 2026-10-07 according to the [official changelog](https://www.zotero.org/support/changelog).

This document records API contracts checked in the Zotero 10.0.6 distribution and official documentation. **Finding an API in the source does not prove that a toolkit script has executed successfully.** No original toolkit script had been recovered or run when this audit was written. Consult the repository's test status for script-level results.

The [10.0.6 release](https://github.com/zotero/zotero/releases/tag/10.0.6) points to commit [`536244c2771f590abab9c09a3c27e615e0b318ff`](https://github.com/zotero/zotero/commit/536244c2771f590abab9c09a3c27e615e0b318ff). Source links below are pinned to that revision.

## Run JavaScript

Open **Tools → Developer → Run JavaScript** and enable **Run as async function** for snippets using `await` or top-level `return`. The runner evaluates code in Zotero's main window and, in async mode, waits for the wrapped function. A returned string appears in the results pane. The editor normally enables async mode when it detects `await`; checking the option explicitly avoids ambiguity. See the [official JavaScript guide](https://www.zotero.org/support/dev/client_coding/javascript_api) and [runner implementation](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/runJS.js).

These are privileged desktop snippets. They do not run in a browser console or Node.js. Syntax checks outside Zotero must wrap each snippet in an async function; a plain file check can reject valid top-level `return` statements.

## Zotero 10 changes that matter

The [official migration guide](https://www.zotero.org/support/dev/zotero_10_for_developers) describes these compatibility changes:

- The collections pane supports multiple selections. Use plural getters such as `getSelectedLibraryIDs()` and `getSelectedCollections()`. Require exactly one target where an operation needs one; do not silently use the first result.
- `itemsView.collectionTreeRow` was replaced by `collectionTreeRows`. Use `viewMode` for special views and `getSortedItems()` for visible items; list headers are not item records.
- `Search.addCondition()` rejects a truthy legacy `required` argument. Use condition groups. `fulltextWord` was removed; use `fulltextContent`.
- Undo history needs an explicit action label. Creating objects and permanently deleting them are not undoable. A transaction alone is not a general undo facility.
- Zotero uses SQLite WAL. Copying only a running library's main database file is not a reliable backup method.

## Contracts checked

| Area | Verified contract and implementation requirement |
|---|---|
| Selection | `getSelectedItems()` returns Item objects, but an active reader tab changes its meaning. Use `getSelectedItems(false, {libraryTabOnly: true})` when the intended scope is the library-table selection. [Source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/zoteroPane.js) |
| Item types | `isRegularItem()` excludes attachments, notes, and annotations. `getAttachments()` and `getNotes()` return IDs. `getAnnotations()` returns objects by default and requires a file attachment. Do not confuse these return types. [Source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/item.js) |
| Tags and notes | Tag changes require saving. `setTags()` replaces the tag list; preserve retained tags' manual/automatic types. `setNote()` expects note HTML on a note or attachment; escape inserted text and set a new child note's intended library and parent. [Source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/item.js) |
| Retrieval | `Items.getAsync(id)` returns one object or false; an ID array returns an array. Match results by ID when order matters. `Items.getAll(libraryID, onlyTopLevel, includeDeleted, asIDs)` returns objects by default; top-level results can still include standalone notes/attachments. [Retrieval source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/dataObjects.js), [library source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/items.js) |
| Collections | `getChildItems()` returns direct members, not a recursive subcollection union. Membership changes require saving. [Source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/collection.js) |
| Search | Set `libraryID` deliberately. A result level uses `addCondition('resultLevel', 'item')`: the level is the operator. [Search conditions](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/searchConditions.js) |
| Saving | Use `await item.saveTx()` outside a transaction, or `await item.save()` inside `Zotero.DB.executeTransaction(async () => {...})`. Database rollback does not undo clipboard or file operations. [Save implementation](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/data/dataObject.js) |
| Output | `Utilities.Internal.copyTextToClipboard(text)` replaces clipboard contents. `File.putContentsAsync(path, text)` writes UTF-8 by default and can replace an existing target file. Output behavior must be explicit. [Clipboard source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/utilities_internal.js), [file source](https://github.com/zotero/zotero/blob/536244c2771f590abab9c09a3c27e615e0b318ff/chrome/content/zotero/xpcom/file.js) |

## Evidence required before a runtime-tested claim

Record the exact application version, platform, script identifier, input fixture, expected outcome, and observed result. Keep syntax checks, mocked behavior tests, source audits, and actual Zotero execution as separate statuses.

Runtime checks should use synthetic records in a disposable profile with a verified separate data directory. Test empty/mixed selections, multiple selected libraries, non-editable libraries, missing fields, Unicode/HTML, missing local PDFs, repeat runs, and cancellation where relevant. The [profile documentation](https://www.zotero.org/support/kb/multiple_profiles) warns that a new profile can still point to an existing data directory, so verify isolation before writing test records.
