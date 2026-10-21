# 01 · Literature management / 文献管理

[Back to README](../../README.md) · [返回中文 README](../../README.zh-CN.md)

| # | File | Mode / 模式 | EN | 中文 |
|---|---|---|---|---|
| 01 | `01-metadata-completeness-check.js` | Read-only / 只读 | Missing title, creators, date, abstract, DOI (journal articles) and PDF | 检查缺失的标题、作者、日期、摘要、DOI（期刊论文）与 PDF |
| 02 | `02-duplicate-candidates-finder.js` | Read-only / 只读 | Duplicate candidates by normalized DOI or title + year | 按规范化 DOI 或标题+年份查找疑似重复 |
| 03 | `03-doi-cleanup-preview.js` | Preview → confirmed write / 预览 → 确认后写入 | Strip DOI URL/`doi:` prefixes on all item types | 去除全部条目类型的 DOI 网址与 `doi:` 前缀 |
| 04 | `04-rule-based-auto-tagging.js` | Preview → confirmed write / 预览 → 确认后写入 | Add hierarchical tags from regex rules (never removes tags) | 按正则规则添加层级标签（不删除标签） |
| 05 | `05-doi-batch-fix-confirm.js` | Confirmed write / 确认后写入 | DOI prefix fix for journal articles, always asks | 期刊论文 DOI 前缀修复，每次确认 |

Overlap / 功能重叠：03 and 05 both normalize DOIs; 01 overlaps with 02-research-productivity/08. All are kept on purpose. / 03 与 05 均处理 DOI；01 与 08 部分重叠，均有意保留。

Each script's header contains the full bilingual description, use cases, run steps and caveats. / 每个脚本头部均含完整中英文说明、适用场景、运行方法与注意事项。
