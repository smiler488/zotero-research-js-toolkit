# Test status and validation

The original scripts are **not yet available**. `manifest.json` intentionally contains `sourcePending: true` and an empty `scripts` list. The toolkit is incomplete: **0/14 original scripts**. No original script has been executed in Zotero by this repository workflow.

| Check | Current result | Meaning |
| --- | --- | --- |
| Validator unit tests | 13 passed locally, 2026-10-21 | Synthetic temporary fixtures exercise validation rules |
| Scaffold integrity | Passed locally, 2026-10-21 | The pending manifest is structurally valid |
| Original-script completeness gate | Failed, expected | Missing all 14 originals in batches 5 + 6 + 3 |
| Original-script syntax/API checks | Not run | Source required |
| Original-script mock behavior tests | Not run | Source required |
| Zotero 10 desktop integration | Not run | Requires recovered scripts and an isolated test library |

An installed Zotero version or a source-code audit is not a desktop execution test. Node parsing also cannot prove that a Zotero method exists or behaves correctly.

## Reproduce the checks

Use Node.js 20 or later. No package installation is required; these tools use Node's built-in modules.

```sh
npm test
npm run verify:scaffold
npm run verify:release
```

`npm test` runs validator tests and validates the scaffold. Its success must not be described as “14 scripts passed.” `verify:release` currently exits with status 1 and prints every missing batch position. This is an intentional completeness failure, not a test to suppress.

GitHub Actions exposes two jobs: **Validator tests and scaffold integrity** and **Original 14-script completeness gate**. The second job remains failed while the source is missing. Both must pass before the repository can claim structural completeness; desktop compatibility still needs separate evidence.

## Manifest contract

Every recovered script must have exactly one stable identity, matching its original position: `b1-01` through `b1-05`, `b2-01` through `b2-06`, and `b3-01` through `b3-03`.

Each entry requires these fields:

| Field | Requirement |
| --- | --- |
| `id` | Stable batch/ordinal identity |
| `original.batch`, `original.ordinal` | Original position, never reassigned to a new scenario |
| `category` | Lowercase hyphenated category slug chosen after source recovery |
| `filename` | Lowercase hyphenated `.js` filename |
| `path` | `scripts/<category>/<filename>`; no absolute paths, traversal, or symlinks |
| `title.en`, `title.zh-CN` | Meaningful names in both languages |
| `sha256` | SHA-256 of the exact UTF-8 script file bytes |
| `operations.library` | `read-only` or `mutating` |
| `operations.network` | Boolean declaring network use |
| `operations.filesystem` | `none`, `read`, or `write` |
| `runtime.status` | `untested`, `mock-tested`, or `desktop-verified` |
| `runtime.version` | Exact Zotero 10 version required for `desktop-verified` |
| `runtime.evidence` | Test record reference required for `mock-tested` or `desktop-verified` |

The validator detects missing/duplicate batch positions, duplicate IDs/paths, missing metadata, incorrect hashes, invalid async syntax, and unlisted `.js` files under `scripts/`. It parses each script as an async function body because Zotero's Run JavaScript mode permits top-level `await` and `return`. It does not execute the scripts. `node --check` alone would reject valid Run JavaScript bodies and is not the appropriate gate.

`sourcePending` can change to `false` only after all originals have been recovered and reconciled. Hashes record the reviewed files; a matching hash is not proof of provenance or safety. Human review must verify the original scenario mapping and the declared side effects.

## Desktop verification record required before a compatibility claim

For each recovered script, record the exact Zotero build, operating system, isolated test-library setup, fixture item types, selection state, expected behavior, actual behavior, and any residual limitation. Include cancellation, empty selection, duplicate selection/parent items, read-only group libraries, multi-selection, and repeat execution where relevant. Verify that failed or cancelled operations do not leave unintended partial changes.

Keep actual research libraries, credentials, private PDFs, and personal test paths out of public evidence. Synthetic fixtures prove only their stated cases. A test record must say when a branch was not exercised.

## 中文说明

当前是待补齐原脚本的仓库框架，已收录 **0/14** 个原脚本。13 项通过的是校验器自身的合成样例测试，不是 14 个 Zotero 脚本实测。完整性检查目前应当失败；只有找回三批原文、逐一修复、补齐清单并验证后，才能改变该状态。桌面实测还需单独记录精确版本、测试材料、预期结果、实际结果和未覆盖范围。
