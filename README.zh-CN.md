# Zotero 科研 JavaScript 工具集

[English](README.md) | **简体中文**

14 个可以直接粘贴到 Zotero 自带 **Run JavaScript** 工具里运行的脚本。这些脚本是我在维护自己的大型文献库时陆续写的，用来找出缺 DOI 或缺 PDF 的条目、合并疑似重复的文献、导出 PDF 高亮、生成综述矩阵，以及在读全文之前先用关键词把检索结果初筛一遍。

每个脚本都是单个文件，粘贴进 Zotero 就能运行，不需要装插件，数据也不会离开你的电脑。适用版本为 Zotero 10（10.0.x），详见[兼容性说明](docs/compatibility.md)。

14 个脚本里有 11 个只读，另外 3 个会修改数据，但都做了保护：

- 03（DOI 清洗）和 04（自动打标签）默认只预览；05（DOI 修复）每次写入前都会弹窗确认。
- 确认对话框的默认按钮是"取消"。
- 写入前会先把回滚记录复制到剪贴板。
- 只读的群组文献库会自动跳过。
- 不会删除任何内容。

每个脚本开头都有中英文说明（功能、适用场景、运行方法、注意事项），输出语言可以通过 `LANG = "zh" | "en"` 切换。

## 快速开始

1. 在 Zotero 中选中需要处理的文献（例如点击某个分类后按 Ctrl/Cmd+A）。
2. 打开 **工具 → 开发者 → Run JavaScript**。
3. 将 [`scripts/`](scripts/) 中某个脚本的全部内容粘贴进去，点击 **Run**（Ctrl/Cmd+R）。
4. 在右侧窗格查看结果；多数脚本还会把报告复制到剪贴板。

完整教程：[docs/getting-started.zh-CN.md](docs/getting-started.zh-CN.md)。

## 脚本列表

| 编号 | 脚本 | 模式 | 用途 |
|---|---|---|---|
| **01** | [文献元数据完整性检查](scripts/01-literature-management/01-metadata-completeness-check.js) | 只读 | 检查缺失的标题、作者、日期、摘要、DOI、PDF |
| **02** | [疑似重复文献查找](scripts/01-literature-management/02-duplicate-candidates-finder.js) | 只读 | DOI 规范化后相同，或标题与年份相同 |
| **03** | [DOI 格式清洗（默认预览）](scripts/01-literature-management/03-doi-cleanup-preview.js) | 预览 → 确认后写入 | 去除 `https://doi.org/`、`doi:` 前缀，覆盖全部条目类型 |
| **04** | [基于规则的自动标签](scripts/01-literature-management/04-rule-based-auto-tagging.js) | 预览 → 确认后写入 | 按标题/摘要正则规则添加层级标签（只增不删） |
| **05** | [DOI 批量修复（弹窗确认）](scripts/01-literature-management/05-doi-batch-fix-confirm.js) | 确认后写入 | 与 03 类似，仅限期刊论文，每次必须确认 |
| **06** | [大模型文献综述提示词生成](scripts/02-research-productivity/06-llm-review-prompt-builder.js) | 只读 | 基于最多 10 篇摘要生成带证据约束的提示词 |
| **07** | [PDF 附件体检](scripts/02-research-productivity/07-pdf-attachment-health-check.js) | 只读 | 未关联 PDF 及本地不可用文件 |
| **08** | [参考文献质量检查](scripts/02-research-productivity/08-reference-quality-check.js) | 只读 | 引文所需字段，含期刊名、卷号、页码 |
| **09** | [文献批注汇总导出（Markdown）](scripts/02-research-productivity/09-annotation-export-markdown.js) | 只读 | 按阅读顺序导出 PDF/EPUB/快照的高亮与评论 |
| **10** | [文献综述矩阵（Markdown 表格）](scripts/02-research-productivity/10-review-matrix-markdown.js) | 只读 | 年份、第一作者、标题、期刊、DOI、摘要摘录 |
| **11** | [相似标签检查](scripts/02-research-productivity/11-similar-tags-check.js) | 只读 | 仅大小写、全半角、空格、连字符不同的标签 |
| **12** | [PDF 实验参数关键词上下文检索](scripts/03-research-mining/12-pdf-keyword-context-search.js) | 只读 | 在已索引 PDF 中提取实验参数片段 |
| **13** | [标题摘要初筛并导出 CSV](scripts/03-research-mining/13-title-abstract-screening-csv.js) | 只读 | 两组关键词 + 排除词 → 分流 CSV |
| **14** | [研究主题年度趋势统计（CSV）](scripts/03-research-mining/14-topic-trend-by-year-csv.js) | 只读 | 按年份统计各主题文献数，便于绘图 |

有两组脚本的功能有意重叠：01 是通用的元数据检查，08 专门检查引用所需的字段；03 对所有条目类型先预览 DOI 清洗，05 只处理期刊论文，并且每次写入前都会确认。各分类文件夹下都有中英双语的 README。

## 目录结构

```
zotero-research-js-toolkit/
├── README.md / README.zh-CN.md
├── LICENSE                        MIT 许可证
├── scripts/
│   ├── 01-literature-management/  01–05 文献管理
│   ├── 02-research-productivity/  06–11 科研效率
│   └── 03-research-mining/        12–14 文献挖掘
├── docs/
│   ├── getting-started.md / getting-started.zh-CN.md
│   ├── compatibility.md           Zotero 10 API 逐脚本审查
│   └── test-record.md             测试方法与结果
├── examples/                      示例输出与关键词配置
└── tests/                         Zotero API 模拟与测试套件
```

## 数据安全

- 首次运行任何写入类脚本前，请备份 Zotero 数据目录（参见 [Zotero 数据备份说明](https://www.zotero.org/support/zotero_data#backing_up_your_zotero_data)）。
- 写入类脚本仅修改其头部说明中列出的字段，并在同一数据库事务中保存。
- 请勿依赖 Zotero 10 的“编辑 → 撤销”撤回脚本修改，应使用回滚记录。
- 建议先在少量条目上试运行。

## 测试

```bash
node --test tests/run-tests.mjs   # Node.js ≥ 20，无需安装依赖
```

测试套件基于 Zotero API 模拟对象运行全部脚本（35 项测试），用于验证逻辑与安全保证，但不能替代在 Zotero 中的实际运行。哪些内容已在 Zotero 10 实机中验证、哪些尚未验证，见 [docs/test-record.md](docs/test-record.md)。

## 引用

见 [`CITATION.cff`](CITATION.cff)。

## 参与贡献

欢迎提交 Issue 与 Pull Request。请保持脚本自包含（不使用 import）、沿用中英双语头部格式、写入操作保持“先预览后确认”，并在 `tests/run-tests.mjs` 中补充测试。

## 许可证

[MIT](LICENSE) © 2026 Liangchao Deng
