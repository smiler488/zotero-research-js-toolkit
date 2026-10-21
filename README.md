# Zotero Research JavaScript Toolkit

[中文说明](README.zh-CN.md)

Independent JavaScript utilities for research workflows in the Zotero desktop application. The intended collection contains 14 scripts from three original batches: 5 + 6 + 3.

> **Preparation status — incomplete.** The original script bodies have not yet been recovered. **0 of 14 original scripts are imported.** This repository currently provides documentation, an API compatibility review, and validation infrastructure. It must not be presented as a working collection of 14 scripts or as fully tested on Zotero 10.

## Script inventory

The [manifest](manifest.json) tracks the expected original batches, imported files, and their validation status. The original scenarios will be retained when the source is available; no replacement scenarios have been invented to fill the count.

| Original batch | Expected scripts | Imported scripts |
| --- | ---: | ---: |
| First batch | 5 | 0 |
| Second batch | 6 | 0 |
| Third batch | 3 | 0 |
| **Total** | **14** | **0** |

Each imported utility will be stored as a separate `.js` file under `scripts/`, grouped by its actual purpose. There are currently no original utility scripts to run.

## Running scripts

These utilities target **Tools → Developer → Run JavaScript** in Zotero desktop. They are not browser-console snippets or standalone Node.js programs, and they do not use the Zotero Web API.

Read the [running guide](docs/RUNNING.md) and [precautions](docs/SAFETY.md) before executing any script. A script that changes a library requires a separate backup and a small test in a disposable Zotero profile. Synchronization is not a backup.

## Compatibility and test status

The compatibility target is **Zotero 10**. Official migration documentation and the available Zotero 10.0.6 application source are the basis for API review. Source inspection does not establish that an individual utility works.

- [API compatibility review](docs/API-COMPATIBILITY.md): reviewed APIs, version changes, and evidence.
- [Testing status](docs/TESTING.md): checks actually run, their limits, and remaining runtime checks.
- [Manifest](manifest.json): inventory and per-script status when originals are imported.

No claim of original-script runtime success is made at this stage.

## Contributing

Keep each utility independently runnable and document its selection scope, inputs, outputs, library changes, and external requests. Include representative synthetic fixtures and edge cases. Do not submit personal libraries, exported notes, credentials, private file paths, or copyrighted PDFs as test data. Preserve an explicit record of any behavioral change from the original script.

The [extraction handoff prompt](prompts/extract-original-scripts.md) separates mechanical source extraction from API review. It requires complete originals and does not generate replacements for missing scripts.

## License

[MIT](LICENSE). Zotero is a separate project; this toolkit is not an official Zotero product.
