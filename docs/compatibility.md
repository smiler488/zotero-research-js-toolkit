# Compatibility / 兼容性说明

[README (EN)](../README.md) · [README（中文）](../README.zh-CN.md) · [Test record / 测试记录](test-record.md)

**Target / 目标版本:** Zotero 10.0.x (latest at review time: 10.0.6, 2026-10-07; Firefox 140 ESR platform)
**Reviewed / 审查日期:** 2026-10-21

## 1. Version matrix / 版本矩阵

| Zotero | Status / 状态 | Notes / 说明 |
|---|---|---|
| 10.0.x | **Target** / 目标 | API reviewed against the *Zotero 10 for Developers* notes; logic verified with the mock test suite. / 已对照官方 Zotero 10 开发者说明审查，并通过模拟测试。 |
| 9.x | Expected to work / 预期可用 | Same Firefox 140 ESR base; no Zotero 10-only API is used. / 平台相同，未使用 Zotero 10 独有接口。 |
| 7.x – 8.x | Expected to work / 预期可用 | `isPDFAttachment()`, `isEPUBAttachment()` and `getCreatorsJSON()` exist since 7; feature checks fall back where possible. / 关键方法自 Zotero 7 起可用，部分有降级处理。 |
| ≤ 6 | Not supported / 不支持 | Different reader/annotation model and older JS engine. / 批注模型与 JS 引擎不同。 |

## 2. Zotero 10 changes that matter for these scripts / 与本工具集相关的 Zotero 10 变化

| Zotero 10 change / 变化 | Impact / 影响 | What the toolkit does / 处理方式 |
|---|---|---|
| Multi-collection selection; `getCollectionTreeRow()`, `getSelectedLibraryID()`, `getSelectedCollection()` and `ItemTree#collectionTreeRow` now throw / 多分类选择，单选取值方法会抛出异常 | Any script that inspected the current collection or library would fail / 依赖当前分类或文献库的脚本会失败 | No script uses them. `getSelectedItems()` is documented as unchanged and is the only selection API used. The tests fail if a removed getter appears. / 不使用这些方法，仅使用官方说明行为不变的 `getSelectedItems()`；测试会拦截被移除的方法。 |
| `ZoteroPane.canEdit()` relies on the (single) selected tree row / 依赖单一选中行 | Original script 05 used it as a global edit check / 原脚本 05 用其判断编辑权限 | Replaced with a per-item check: `Zotero.Libraries.get(item.libraryID).editable`. Items in read-only libraries are skipped and counted. / 改为逐条判断文献库是否可编辑，只读库条目跳过并计数。 |
| Library header/spacer rows can appear in the items list / 条目列表可能出现分组标题行 | Code walking `itemsView` rows could pick up non-items / 遍历行时可能取到非条目 | Scripts never walk rows; they filter `getSelectedItems()` with `isRegularItem()` and `!deleted`. / 不遍历行，只对选中条目过滤。 |
| Full-text index moved to SQLite FTS5; several `Zotero.FullText` methods removed / 全文索引改为 FTS5，部分方法移除 | Direct `Zotero.FullText` calls may break / 直接调用可能失效 | Script 12 uses only the `attachment.attachmentText` getter, with per-PDF `try/catch` and a count of read failures. **Verify in a live Zotero 10 install** (see test record). / 仅使用 `attachmentText`，逐个 PDF 捕获异常；需在实机中复核。 |
| Undo/redo; `saveTx()` accepts `undoAction` / 支持撤销重做 | Script writes are not guaranteed to be undoable / 脚本写入不一定可撤销 | Scripts do not depend on undo: rollback log + single transaction (`Zotero.DB.executeTransaction`) instead. / 不依赖撤销，改用回滚记录与单事务保存。 |
| Setters for `attachmentPath`, item-type conversion now throw in some cases / 部分附件与类型转换 setter 会抛出 | Only relevant to scripts that edit attachments / 仅影响修改附件的脚本 | No script edits attachments or item types. / 不修改附件和条目类型。 |

## 3. Per-script API review / 逐脚本 API 审查

Legend / 图例: **R** = read-only / 只读 · **W** = writes after confirmation / 确认后写入

| # | Mode | Zotero APIs used / 使用的接口 | Changes from the original snippet / 相对原始代码的修正 |
|---|---|---|---|
| 01 | R | `getSelectedItems`, `isRegularItem`, `getField`, `getCreators`, `getAttachments`, `Zotero.Items.get(ids)`, `isPDFAttachment` | Async entry point; empty-selection message; skips trashed items; accepts DOI stored in Extra; batch `Items.get`. |
| 02 | R | + `getField("date", true, true)`, `Zotero.Utilities.cleanDOI` | Year from Zotero's multipart date (old regex missed years before 1900 and some formats); DOI normalized with Zotero's own `cleanDOI` and Extra fallback; output includes item keys and points to the built-in merge view. |
| 03 | W | + `Zotero.Libraries.get().editable`, `Services.prompt.confirmEx`, `Zotero.DB.executeTransaction`, `item.save`, `Zotero.Utilities.Internal.copyTextToClipboard` | Added confirmation dialog for write mode (original wrote silently with `PREVIEW_ONLY = false`); rollback log; one transaction instead of per-item `saveTx`; read-only libraries skipped; `www.doi.org` handled. |
| 04 | W | + `getTags`, `addTag` | Added confirmation and rollback log; rejects regexes with `g`/`y` flags (stateful `test()` caused missed matches); read-only libraries skipped. |
| 05 | W | as 03 | **Dialog fix:** the original `Zotero.Prompt.confirm` call put *Confirm* on `button1`; with prompt-service dialogs, pressing Esc or closing the window returns 1, so closing the dialog could have applied the changes. Now *Apply* is button 0, *Cancel* is the default, and only an explicit Apply click returns `true`. `pane.canEdit()` replaced (see §2). |
| 06 | R | as 01 | Prompt now also copied to clipboard; configurable limits; English prompt variant; notice when the selection exceeds `MAX_ITEMS`. |
| 07 | R | + `fileExists()`, `attachmentLinkMode`, `Zotero.Attachments.LINK_MODE_LINKED_FILE` | Distinguishes stored vs linked files; wording clarifies that "not local" may mean "not downloaded yet". |
| 08 | R | as 01 | Accepts DOI in Extra; async entry point. |
| 09 | R | + `isFileAttachment`, `isEPUBAttachment`, `isSnapshotAttachment`, `getAnnotations`, `annotation*` fields | Includes EPUB and snapshot annotations (Zotero 7+ reader), not only PDF; optional colour; sort on a copy of the array. |
| 10 | R | + `getCreatorsJSON` | First author = first creator with role *author* (original took any first creator and read a non-existent `.name` on `getCreators()` output); year via multipart date; fixed a table-breaking edge case where truncation left a dangling `\` before a cell border. |
| 11 | R | `getTags` | Optional hyphen/underscore normalization (`LOOSE`). |
| 12 | R | + `attachmentText` | Case-insensitive regex search on the original text (lower-casing then slicing could misalign offsets for some Unicode characters); separate counters for empty text and read failures. |
| 13 | R | `getField`, `item.key` | Whole-word matching for Latin keywords (substring matching made `uav` match unrelated words); item key column; formula-injection guard kept. |
| 14 | R | as 02 | Whole-word matching (`anova` no longer matches `manova`); year via multipart date; items without a year are reported. |

**Common to all 14 / 全部脚本通用：**

- Every script ends with `return await main();`. Zotero's runner only treats code as an async function (where top-level `return` is legal) when it contains `await`; 6 of the original snippets used `return` without any `await` and would fail with *return not in function* in sync mode. / 原有 6 段代码含 `return` 却没有 `await`，在同步模式下会报错，现统一修复。
- Clipboard: `Zotero.Utilities.Internal.copyTextToClipboard`, falling back to Mozilla's `nsIClipboardHelper`. Write scripts refuse to write if the rollback log cannot be copied. / 剪贴板失败时写入类脚本不会写入。
- No script calls `erase`, `trash`, `removeTag`, `setCreators`, or any deletion API; the test suite enforces this. / 不调用任何删除类接口，由测试强制检查。

## 4. Known limitations / 已知限制

- Scripts process the **selected** items only. To process a whole library, select its root and press Ctrl/Cmd+A. / 仅处理选中条目。
- Script 12 depends on Zotero's full-text index; scanned PDFs need OCR first. / 依赖全文索引，扫描件需先 OCR。
- Script 06 output is meant for human-supervised LLM use; abstracts alone are insufficient evidence. / 摘要不足以作为结论证据。
- Very large selections (> 10 000 items) are untested for speed. / 超大选择规模的性能未测试。

## 5. References / 参考

- Zotero 10 for Developers: <https://www.zotero.org/support/dev/zotero_10_for_developers>
- Zotero 10 changelog: <https://www.zotero.org/support/10.0_changelog>
- Zotero JavaScript API (Run JavaScript): <https://www.zotero.org/support/dev/client_coding/javascript_api>
- Zotero 10 feature-freeze notice (zotero-dev): <https://groups.google.com/g/zotero-dev/c/KqkZGjYHcJs>
