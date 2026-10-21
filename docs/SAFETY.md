# Precautions / 注意事项

Zotero's Run JavaScript editor executes privileged code. Depending on the code, it can read or change the local library and files, use the clipboard, and contact external services. Review each utility before running it. This repository currently contains no imported original utility scripts.

Zotero 的 JavaScript 编辑器执行具有较高权限的代码。具体代码可以读取或修改本地文献库和文件、使用剪贴板，以及访问外部服务。运行前应逐个核对工具行为。本仓库目前尚未导入原始工具脚本。

| Topic / 事项 | Required practice / 处理方式 |
| --- | --- |
| Backup / 备份 | Keep a separate backup before data changes. Sync propagates changes and is not a backup. 修改前保留独立备份；同步会传播修改，不能代替备份。 |
| Scope / 范围 | Document selected items, collections, libraries, and children precisely. Never interpret an empty selection as permission to process everything. 明确条目、分类、库及子条目范围；空选择不能自动解释为处理全部数据。 |
| Groups / 群组 | Check library editability before writes. Shared changes may affect other members. 写入前检查文献库是否可编辑；共享库中的修改可能影响其他成员。 |
| Existing data / 已有数据 | Explain overwrite, append, rename, and deletion behavior. Preview affected records when practical. 明确覆盖、追加、重命名和删除行为；可行时先预览受影响记录。 |
| Transactions / 事务 | Keep related database writes together. Files and network effects are outside database rollback. 相关数据库写入应使用适当事务；文件与网络效果不受数据库回滚保护。 |
| Repeated runs / 重复运行 | State whether reruns duplicate notes, tags, files, or exports. Check partial results after a failure. 说明重跑是否重复生成笔记、标签、文件或导出内容；失败后先检查部分结果。 |
| External requests / 外部请求 | Identify destinations and exactly what information leaves the computer. Keep API keys out of shared scripts and logs. 明确请求目的地和发送的数据；共享脚本及日志中不得包含 API 密钥。 |
| Exports / 导出 | Review notes, annotations, paths, identifiers, and spreadsheet formulas before sharing output. 分享前检查笔记、批注、路径、标识符，以及可能被表格软件解释为公式的内容。 |
| Test evidence / 测试依据 | Distinguish syntax checks, synthetic tests, API review, and real Zotero runs. 区分语法检查、合成测试、API 核对和 Zotero 实机运行。 |

## If a run fails / 运行失败时

Stop and record the error, Zotero version, selected scope, and any completed changes. Do not assume the library is unchanged or that rerunning is harmless. Restore from a backup only after understanding which operations completed and whether synchronization has propagated them.

停止操作，记录错误、Zotero 版本、选中范围和已完成的修改。不要默认文献库完全未变，也不要默认重跑没有影响。恢复备份前，先确定哪些操作已完成、修改是否已通过同步传播。

For setup, see the [English](RUNNING.md) or [Chinese](RUNNING.zh-CN.md) running guide. For evidence, see [testing status](TESTING.md).
