# 在 Zotero 10 中运行脚本

[English guide](RUNNING.md) · [仓库首页](../README.zh-CN.md)

原始 14 个工具脚本尚未导入。本指南说明运行环境，以及取得已核对工具后需要执行的检查。

## 首次运行前

1. 在**帮助 → 关于 Zotero**中查看版本；macOS 通常在 Zotero 应用菜单中。查看具体工具的实测版本记录。“面向 Zotero 10”不等于已通过运行测试。
2. 通读脚本与说明，明确它是否读取元数据、写入条目或笔记、修改文件、使用剪贴板或发送网络请求。
3. 对会修改数据的脚本，先关闭 Zotero 并独立备份数据目录，参照[官方备份说明](https://www.zotero.org/support/zotero_data#backing_up_your_zotero_data)。首次测试使用少量、可丢弃的数据或配置，并在该测试环境中关闭同步。
4. 按脚本要求准备库、分类或条目选择。选中的附件与其所属文献条目不一定是相同输入；当前分类中的全部内容与当前选中的条目也不一定相同。

## 打开编辑器

1. 保持 Zotero 主文献库窗口打开。
2. 进入**工具 → 开发者 → Run JavaScript（运行 JavaScript）**。菜单名称可能随界面语言变化。
3. 将一个已核对 `.js` 文件的完整内容粘贴到 **Code（代码）**区域。
4. 勾选 **Run as async function（作为异步函数运行）**。Zotero 会把代码包裹在 `async` 函数中，等待异步操作，并用 `return` 返回右侧显示的结果。代码包含顶层 `return` 或 `await` 时不要关闭此选项。
5. 点击 **Run（运行）**，或按 **Cmd-R / Ctrl-R**。先检查返回报告，再进行后续操作。

编辑器行为见[官方 JavaScript API 文档](https://www.zotero.org/support/dev/client_coding/javascript_api#running_ad_hoc_javascript_in_zotero)。文件扩展名为 `.js` 并不意味着它能直接在 Node.js 或浏览器控制台中运行。

## 只读环境检查

下面的诊断代码只读取版本号和文献库列表中选中的条目数量。保持勾选 **Run as async function**。它不读取或修改条目内容，**不计入原始 14 个工具**：

```javascript
return {
  zoteroVersion: Zotero.version,
  selectedItemCount: Zotero.getActiveZoteroPane()?.getSelectedItems(false, {libraryTabOnly: true}).length ?? 0
};
```

## 检查结果

- 确认报告中的作用范围与预期一致，特别注意子附件、笔记、重复选择和多个分类同时选中的处理。
- 对写入操作，抽查受影响记录，并确认不应受影响的记录保持原样。出现完成提示本身不能证明结果正确。
- 出错时保留错误文本和运行背景；同一开发者菜单中的 **Error Console（错误控制台）**可提供详情。不要盲目重跑可能已部分完成的写入操作。
- 部分修改会同步到其他设备或群组成员。对只读群组库，工具应在保存前明确拒绝操作或跳过相关条目。

## 修改脚本时

使用 Zotero 数据对象操作文献库。按操作场景选择事务方式：在 `Zotero.DB.executeTransaction(...)` 内调用 `save()`，或在已有事务之外调用 `saveTx()`。数据库事务不能撤销文件系统操作或外部网络请求产生的效果。

Zotero 10 的分类栏支持多选。按 [API 兼容性核对](API-COMPATIBILITY.md)使用复数选择接口，并分别处理零选、单选和多选。处理选中条目的工具不应悄悄扩大到整个文献库。

其他要求及实际验证记录见[注意事项](SAFETY.md)和[测试状态](TESTING.md)。
