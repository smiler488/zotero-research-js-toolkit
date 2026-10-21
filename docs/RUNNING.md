# Running scripts in Zotero 10

[中文运行指南](RUNNING.zh-CN.md) · [Repository](../README.md)

The original 14 utility scripts have not been imported yet. This guide explains the execution environment and the checks to perform once a reviewed utility is available.

## Before a first run

1. Check **Help → About Zotero** (or the Zotero application menu on macOS) for the version. Read the utility's tested-version record; “targets Zotero 10” is not a runtime test result.
2. Read the whole script and its description. Identify whether it reads metadata, writes items or notes, changes files, uses the clipboard, or makes network requests.
3. For a script that changes data, create a separate backup of the Zotero data directory with Zotero closed. Use the [official backup guidance](https://www.zotero.org/support/zotero_data#backing_up_your_zotero_data). First test with a small disposable library or profile, with synchronization disabled for that test environment.
4. Prepare the exact library, collection, or item selection required by the script. A selected attachment is not necessarily the same input as its parent bibliographic item. Do not assume the current collection and the current item selection have identical scope.

## Open the editor

1. Keep the main Zotero library window open.
2. Choose **Tools → Developer → Run JavaScript**. Menu wording may differ with the interface language.
3. Paste the entire contents of one reviewed `.js` file into the **Code** pane.
4. Enable **Run as async function** for toolkit snippets. Zotero wraps the code in an `async` function and waits for awaited operations; `return` supplies the value shown in the result pane. Do not disable this option for code containing top-level `return` or `await`.
5. Click **Run**, or use **Cmd-R / Ctrl-R**. Inspect the returned report before doing anything else.

The [official JavaScript API documentation](https://www.zotero.org/support/dev/client_coding/javascript_api#running_ad_hoc_javascript_in_zotero) describes this editor. A `.js` extension alone does not make a snippet valid in Node.js or in a browser console.

## Read-only environment check

This small diagnostic reads the version and the number of items selected in the library table. Keep **Run as async function** enabled. It does not inspect or change item contents and is **not one of the 14 original utilities**:

```javascript
return {
  zoteroVersion: Zotero.version,
  selectedItemCount: Zotero.getActiveZoteroPane()?.getSelectedItems(false, {libraryTabOnly: true}).length ?? 0
};
```

## Check the result

- Confirm that the reported scope matches the intended selection, including how child attachments, notes, duplicate selections, and multiple selected collections are handled.
- For a write operation, inspect several affected records and confirm unaffected records remain unchanged. A completed return value is not proof of correct results.
- If the script fails, keep the error text and execution context. The **Error Console**, under the same Developer menu, can provide details. Do not rerun a partially completed write blindly.
- Some writes may synchronize to other devices or group members. A read-only group library must be rejected or skipped by a utility before it attempts to save changes.

## For authors adapting scripts

Use Zotero's supported data objects. Follow the transaction pattern appropriate to the operation: `save()` inside `Zotero.DB.executeTransaction(...)`, or `saveTx()` outside an existing transaction. A database transaction does not undo filesystem operations or external network effects.

Zotero 10 supports multiple selections in the collections pane. Prefer the plural selection methods documented in the [compatibility review](API-COMPATIBILITY.md), and explicitly handle zero, one, and multiple selections. Do not silently broaden a selected-item task to the whole library.

See [precautions](SAFETY.md) and [testing status](TESTING.md) for the remaining requirements and actual verification evidence.
