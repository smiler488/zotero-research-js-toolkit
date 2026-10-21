# Test record / 测试记录

[README (EN)](../README.md) · [README（中文）](../README.zh-CN.md) · [Compatibility / 兼容性](compatibility.md)

## 1. Method / 测试方法

| Level / 层级 | What / 内容 | Status / 状态 |
|---|---|---|
| A. Automated mock tests / 自动化模拟测试 | `tests/zotero-mock.mjs` reproduces the Zotero API surface used here (items, attachments, annotations, libraries, prompt service, clipboard, transactions). `tests/run-tests.mjs` runs all 14 scripts end-to-end in Node exactly as Zotero's async runner does (code wrapped in an async function). / 模拟本工具集用到的 Zotero 接口，在 Node 中按 Zotero 异步运行方式完整执行 14 个脚本。 | **Pass 35/35** |
| B. Static invariants / 静态约束检查 | Exactly 14 scripts (5/6/3); bilingual header fields present; `return await main()` entry point; no deletion APIs; no Zotero 10-removed selection getters; every script that calls `setField`/`addTag` also calls `confirmWrite`. / 脚本数量、双语头部、入口形式、无删除接口、无 Zotero 10 已移除接口、写入必有确认。 | **Pass** (included in A / 包含在 A 中) |
| C. API review against official docs / 对照官方文档审查 | See [compatibility.md](compatibility.md). / 见兼容性说明。 | **Done** 2026-10-21 |
| D. Live Zotero 10 run / Zotero 10 实机运行 | Checklist in §4. / 见第 4 节清单。 | **Pending** / 待完成 |

Mock tests verify each script's logic and safety guarantees (preview never writes; Cancel/Esc never writes; read-only libraries skipped; writes refused if the rollback log cannot be copied; one transaction per run). They cannot prove that every Zotero internal behaves as mocked, which is why level D exists.

模拟测试验证脚本逻辑与安全保证（预览不写入、取消/Esc 不写入、跳过只读库、回滚记录复制失败则拒绝写入、单事务保存），但无法证明 Zotero 内部行为与模拟完全一致，因此需要 D 级实机测试。

## 2. Run / 运行

```bash
node --test tests/run-tests.mjs     # all tests / 全部测试
node tests/make-examples.mjs        # regenerate examples/sample-outputs.md / 重新生成示例输出
```

CI: GitHub Actions runs the suite on Node 20, 22 and 24 for every push and pull request (`.github/workflows/test.yml`).

## 3. Results / 结果

**Run 2026-10-21 · Node v22.22.0 · Linux x64 · commit: initial release v1.0.0**

```text
✔ 01 metadata check flags missing fields and accepts DOI in Extra
✔ 01 handles empty selection and English output
✔ 02 groups DOIs that differ only by prefix/case, and same title+year
✔ 03 preview mode never writes
✔ 03 write mode + Cancel (default/Esc) writes nothing
✔ 03 write mode + Apply saves in one transaction, skips read-only
✔ 03 refuses to write when rollback log cannot be copied
✔ 04 preview proposes tags without writing; apply adds only new tags
✔ 04 rejects regex rules with the g flag
✔ 05 only journal articles; Cancel writes nothing; Apply writes
✔ 05 all-read-only selection reports and does not prompt
✔ 06 builds prompt, caps item count, copies to clipboard
✔ 07 counts available, missing, unavailable and failing PDFs
✔ 08 checks journal-specific fields only for journal articles
✔ 09 exports text annotations in reading order, skips ink/image
✔ 10 builds a valid Markdown table with escaped pipes and first author
✔ 11 groups tags differing by case, width, whitespace and hyphen
✔ 12 finds keyword context, counts empty text and read failures
✔ 13 classifies records and guards CSV formula injection
✔ 14 counts topics per year with whole-word matching
✔ repository contains exactly 14 scripts (5 + 6 + 3)
✔ 01-metadata-completeness-check.js: bilingual header, async entry point, no destructive API
✔ 02-duplicate-candidates-finder.js: bilingual header, async entry point, no destructive API
✔ 03-doi-cleanup-preview.js: bilingual header, async entry point, no destructive API
✔ 04-rule-based-auto-tagging.js: bilingual header, async entry point, no destructive API
✔ 05-doi-batch-fix-confirm.js: bilingual header, async entry point, no destructive API
✔ 06-llm-review-prompt-builder.js: bilingual header, async entry point, no destructive API
✔ 07-pdf-attachment-health-check.js: bilingual header, async entry point, no destructive API
✔ 08-reference-quality-check.js: bilingual header, async entry point, no destructive API
✔ 09-annotation-export-markdown.js: bilingual header, async entry point, no destructive API
✔ 10-review-matrix-markdown.js: bilingual header, async entry point, no destructive API
✔ 11-similar-tags-check.js: bilingual header, async entry point, no destructive API
✔ 12-pdf-keyword-context-search.js: bilingual header, async entry point, no destructive API
✔ 13-title-abstract-screening-csv.js: bilingual header, async entry point, no destructive API
✔ 14-topic-trend-by-year-csv.js: bilingual header, async entry point, no destructive API
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

## 4. Live Zotero 10 checklist / Zotero 10 实机检查清单

Fill in after running in Zotero (Help → About Zotero for the version). Use a test library or a backup. / 在 Zotero 中运行后填写（版本号见 帮助 → 关于 Zotero），请使用测试库或已备份的库。

| # | Check / 检查项 | Zotero version | OS | Result | Date |
|---|---|---|---|---|---|
| 01 | Report lists missing fields; Extra-DOI accepted / 报告缺失字段，Extra 中 DOI 被认可 | | | ☐ | |
| 02 | Groups prefix-variant DOIs / 不同前缀 DOI 归为一组 | | | ☐ | |
| 03 | Preview writes nothing; write mode: Esc cancels; Apply writes; rollback log on clipboard / 预览不写入；Esc 取消；应用后写入；剪贴板有回滚记录 | | | ☐ | |
| 04 | Same as 03 for tags; existing tags untouched / 标签同上，已有标签不变 | | | ☐ | |
| 05 | Apply button delayed; Cancel default; group library without edit rights skipped / 应用按钮延时；默认取消；无权限群组跳过 | | | ☐ | |
| 06 | Prompt on clipboard / 提示词已复制 | | | ☐ | |
| 07 | Stored, linked and not-downloaded PDFs reported correctly / 存储、链接、未下载 PDF 报告正确 | | | ☐ | |
| 08 | Journal-specific checks / 期刊字段检查 | | | ☐ | |
| 09 | PDF and EPUB annotations in reading order / PDF 与 EPUB 批注按阅读顺序 | | | ☐ | |
| 10 | Table renders in a Markdown editor / 表格在 Markdown 编辑器中正常显示 | | | ☐ | |
| 11 | Similar tags grouped / 相似标签分组 | | | ☐ | |
| 12 | `attachmentText` returns indexed text under the FTS5 index / FTS5 索引下 `attachmentText` 正常返回 | | | ☐ | |
| 13 | CSV opens in a spreadsheet with UTF-8 / CSV 以 UTF-8 正常打开 | | | ☐ | |
| 14 | Year/topic counts / 年份与主题计数 | | | ☐ | |
| all | Works with multiple collections selected (Zotero 10) / 同时选择多个分类时正常 | | | ☐ | |

Highest-priority items to verify live / 实机最优先验证：**12** (Zotero 10 rewrote full-text internals), **03/04/05 dialogs** (prompt service in the Run JavaScript window), and the **clipboard** call on Linux.
