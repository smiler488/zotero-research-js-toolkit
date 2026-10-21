# Getting started

**English** | [简体中文](getting-started.zh-CN.md) · [Back to README](../README.md)

## 1. Requirements

- Zotero 10 (10.0.x) desktop on Windows, macOS or Linux. Most scripts also work on Zotero 7–9; see [compatibility.md](compatibility.md).
- No plugin and no internet connection are needed.

## 2. Back up first (for write scripts)

Scripts 03, 04 and 05 can modify item fields or add tags. Before using them for the first time:

1. Close Zotero.
2. Copy your Zotero data directory (find it under **Settings → Advanced → Files and Folders → Data Directory Location**) to a safe place.
3. Reopen Zotero.

Read-only scripts (01, 02, 06–14) do not need a backup.

## 3. Run a script

1. **Select items.** Click a collection, saved search or library, then select items in the middle pane. Ctrl/Cmd+A selects everything in the current view. Scripts process *regular items* (journal articles, books, ...); standalone notes and attachments are ignored, and items in the trash are skipped. Zotero 10 allows several collections to be selected at once; the scripts work on whatever items are selected in the item list.
2. **Open the runner.** **Tools → Developer → Run JavaScript**.
3. **Paste.** Open the `.js` file from this repository (on GitHub: click the file → *Raw* → select all → copy) and paste the *entire* file, including the header comment.
4. **Run.** Click **Run** or press Ctrl/Cmd+R. Every script ends with `return await main();`, which makes Zotero run it as an async function. If your Zotero shows a **Run as async function** checkbox, keep it checked.
5. **Read the output** in the right-hand pane. Long reports are truncated in the pane but copied in full to the clipboard.

## 4. Configure

Settings live at the top of each script in a block marked `Config / 配置`:

| Setting | Scripts | Meaning |
|---|---|---|
| `LANG` | all | `"zh"` (default) or `"en"` output |
| `PREVIEW_ONLY` | 03, 04 | `true` = report only; `false` = ask, then write |
| `RULES` | 04 | Regex → tag rules (do not use the `g` flag) |
| `MAX_ITEMS`, `MAX_ABSTRACT_CHARS` | 06 | Prompt size limits |
| `KEYWORDS`, `CONTEXT`, `MAX_HITS` | 12 | Keyword-in-context search |
| `GROUP_A`, `GROUP_B`, `EXCLUDE_TITLE`, `WHOLE_WORD` | 13 | Screening rules |
| `TOPICS`, `WHOLE_WORD` | 14 | Topic → keyword lists |
| `LOOSE` | 11 | Treat `-`/`_` as spaces when comparing tags |

Ready-made keyword sets for crop science / remote sensing / phenotyping are in [`examples/`](../examples/).

## 5. How writes are protected

For 03 (with `PREVIEW_ONLY = false`), 04 (with `PREVIEW_ONLY = false`) and 05:

1. The script computes all changes and skips items in read-only libraries (feeds, groups without edit rights).
2. A tab-separated **rollback log** (library ID, item key, field, old value, new value) is copied to the clipboard. If copying fails, the script stops without writing.
3. A dialog shows the first changes. **Cancel is the default button**; pressing Esc or closing the dialog also cancels. The Apply button is enabled after a short delay.
4. Only after you click Apply are the changes saved, all in one database transaction.

Paste the rollback log into a text file before clicking Apply. To revert a DOI change, search the item by key and paste the old value; to revert tags, delete the tag in the tag selector.

## 6. Typical workflows

- **Thesis or manuscript bibliography:** 01 or 08 → fix fields → 03 (preview, then write) → 02 → merge in *Duplicate Items*.
- **Systematic review triage:** import search results into a collection → 13 → screen in a spreadsheet → 04 to tag decisions (edit `RULES`) → 14 for a year/topic figure.
- **Parameter extraction for modelling:** 07 (make sure PDFs are local) → 12 with your parameter keywords (e.g. `Vcmax`, `LAI`, `leaf angle`, `nitrogen rate`) → verify numbers in the PDFs.
- **Reading notes:** annotate in the Zotero reader → 09 → paste into Markdown/Obsidian; 10 for the overview table; 06 for an LLM-assisted gap analysis.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `SyntaxError: return not in function` | The script was run in sync mode. Make sure you pasted the whole file (it contains `await`), or tick *Run as async function*. |
| "Please select items first" | Click in the item list and select regular items, not only attachments. |
| Script 12 reports "PDFs without text" | The PDF is a scan or not indexed: right-click the PDF → *Reindex Item*; check **Settings → Search**. |
| Script 07 reports files "not available locally" | Open the attachment once to trigger download, or relink moved files. |
| Nothing pasted from the clipboard | Some Linux desktops need a clipboard manager; copy the text from the result pane instead. |
| Errors you cannot explain | Open **Tools → Developer → Error Console** and include its output in a GitHub issue together with your Zotero version (Help → About Zotero). |
