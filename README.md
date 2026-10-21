# Zotero Research JS Toolkit

**English** | [简体中文](README.zh-CN.md)

A collection of 14 copy-paste JavaScript snippets for Zotero's built-in **Run JavaScript** tool, written for researchers who manage large literature libraries (metadata hygiene, review matrices, annotation export, systematic-review screening and simple bibliometrics).

- **Target version:** Zotero 10 (10.0.x). See [compatibility notes](docs/compatibility.md).
- **Safe by default:** 11 scripts are read-only. Of the 3 scripts that can write, 03 (DOI cleanup) and 04 (auto-tagging) default to preview mode and 05 (DOI fix) always shows a dialog first. Every write path asks for confirmation with *Cancel* as the default button, copies a rollback log to the clipboard first, skips read-only libraries, and never deletes items, attachments, notes or tags.
- **No plugin, no network:** scripts run inside Zotero and send nothing anywhere.
- **Bilingual:** each script has an English/Chinese header (what it does, when to use it, how to run it, caveats) and a `LANG = "zh" | "en"` switch for its output.

## Quick start

1. In Zotero, select the items you want to process (e.g. click a collection, then Ctrl/Cmd+A).
2. Open **Tools → Developer → Run JavaScript**.
3. Paste the entire content of a script from [`scripts/`](scripts/) and click **Run** (Ctrl/Cmd+R).
4. Read the result in the right-hand pane; most scripts also copy their report to the clipboard.

Full walkthrough: [docs/getting-started.md](docs/getting-started.md).

## Scripts

| # | Script | Mode | Purpose |
|---|---|---|---|
| **01** | [Metadata completeness check](scripts/01-literature-management/01-metadata-completeness-check.js) | Read-only | Missing title / creators / date / abstract / DOI / PDF |
| **02** | [Duplicate candidates finder](scripts/01-literature-management/02-duplicate-candidates-finder.js) | Read-only | Same normalized DOI, or same title + year |
| **03** | [DOI cleanup (preview-first)](scripts/01-literature-management/03-doi-cleanup-preview.js) | Preview → confirmed write | Strip `https://doi.org/`, `doi:` prefixes, all item types |
| **04** | [Rule-based auto tagging](scripts/01-literature-management/04-rule-based-auto-tagging.js) | Preview → confirmed write | Regex rules on title/abstract → hierarchical tags (add-only) |
| **05** | [DOI batch fix with confirmation](scripts/01-literature-management/05-doi-batch-fix-confirm.js) | Confirmed write | Same as 03 for journal articles, always asks |
| **06** | [LLM review prompt builder](scripts/02-research-productivity/06-llm-review-prompt-builder.js) | Read-only | Evidence-constrained prompt from up to 10 abstracts |
| **07** | [PDF attachment health check](scripts/02-research-productivity/07-pdf-attachment-health-check.js) | Read-only | Missing PDFs and files not available locally |
| **08** | [Reference quality check](scripts/02-research-productivity/08-reference-quality-check.js) | Read-only | Citation-ready fields incl. journal, volume, pages |
| **09** | [Annotation export (Markdown)](scripts/02-research-productivity/09-annotation-export-markdown.js) | Read-only | Highlights + comments from PDF/EPUB/snapshot, reading order |
| **10** | [Review matrix (Markdown table)](scripts/02-research-productivity/10-review-matrix-markdown.js) | Read-only | Year / first author / title / journal / DOI / abstract |
| **11** | [Similar tags check](scripts/02-research-productivity/11-similar-tags-check.js) | Read-only | Tags differing only by case, width, spaces, hyphens |
| **12** | [PDF keyword-in-context search](scripts/03-research-mining/12-pdf-keyword-context-search.js) | Read-only | Snippets around experimental parameters in indexed PDFs |
| **13** | [Title/abstract screening → CSV](scripts/03-research-mining/13-title-abstract-screening-csv.js) | Read-only | Two keyword groups + exclusions → triage CSV |
| **14** | [Topic trend by year → CSV](scripts/03-research-mining/14-topic-trend-by-year-csv.js) | Read-only | Per-year counts of topics for plotting |

**Intentional overlaps** (all kept): 01 vs 08 (general vs citation-focused metadata checks) and 03 vs 05 (preview-first for all item types vs always-ask for journal articles). Each category folder has its own README with a bilingual summary.

## Repository layout

```
zotero-research-js-toolkit/
├── README.md / README.zh-CN.md
├── LICENSE                        MIT
├── scripts/
│   ├── 01-literature-management/  01–05
│   ├── 02-research-productivity/  06–11
│   └── 03-research-mining/        12–14
├── docs/
│   ├── getting-started.md / getting-started.zh-CN.md
│   ├── compatibility.md           Zotero 10 API review, per-script
│   └── test-record.md             test method and results
├── examples/                      sample outputs and keyword configs
└── tests/                         Node mock of the Zotero API + test suite
```

## Data safety

- Back up your Zotero data directory before running any write script for the first time (see [Zotero: backing up](https://www.zotero.org/support/zotero_data#backing_up_your_zotero_data)).
- Write scripts change only the fields named in their header and are saved in a single database transaction.
- Do not rely on Zotero 10's Edit → Undo for script changes; use the rollback log instead.
- Try a write script on a few items first.

## Testing

```bash
node --test tests/run-tests.mjs   # Node.js ≥ 20, no dependencies
```

The suite runs every script against a mock of the Zotero API (35 tests). It verifies logic and safety guarantees, but it is not a substitute for running in Zotero; see [docs/test-record.md](docs/test-record.md) for what has and has not been verified in a live Zotero 10 installation.

## Contributing

Issues and pull requests are welcome. Please keep scripts self-contained (no imports), keep the bilingual header format, keep writes preview-first with confirmation, and add a test in `tests/run-tests.mjs`.

## License

[MIT](LICENSE) © 2026 Liangchao Deng
