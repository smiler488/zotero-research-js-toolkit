/**
 * 05 · DOI Batch Fix with Confirmation / DOI 批量修复（弹窗确认）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: WRITE after an explicit confirmation
 *         dialog every time. / 每次运行都必须在对话框中确认后才写入。
 *
 * [EN]
 * What it does : For selected JOURNAL ARTICLES only, removes "doi:" and
 *                "https://doi.org/" style prefixes from the DOI field. It always
 *                shows the first changes in a dialog; nothing is written unless
 *                you click "Apply". Cancel is the default button, and the Apply
 *                button is enabled after a short delay to prevent accidental clicks.
 * When to use  : A quick one-step fix for journal articles when you do not want
 *                to edit a PREVIEW_ONLY flag (compare script 03, which covers
 *                all item types and previews by default).
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste
 *                -> Run -> review the dialog -> Apply or Cancel.
 * Notes        : Read-only libraries are skipped per item (Zotero 10 supports
 *                multi-collection selection, so the old ZoteroPane.canEdit()
 *                check is no longer used). A rollback log is copied to the
 *                clipboard before saving; changes are saved in one transaction.
 *
 * [中文]
 * 功能说明     ：仅针对所选“期刊论文”，去除 DOI 字段中 “doi:”“https://doi.org/”
 *                等前缀。运行时总会在对话框中展示部分修改内容，只有点击“应用”
 *                才会写入；默认按钮为“取消”，“应用”按钮延时启用以防误点。
 * 适用场景     ：不想修改 PREVIEW_ONLY 开关、需要一步完成期刊论文 DOI 修复时
 *                （脚本 03 覆盖全部条目类型，且默认仅预览）。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行 ->
 *                查看对话框 -> 点击“应用”或“取消”。
 * 注意事项     ：逐条判断并跳过只读文献库（Zotero 10 支持多分类同时选择，
 *                不再使用原先的 ZoteroPane.canEdit() 判断）。保存前回滚记录会复制到
 *                剪贴板；所有修改在同一事务中保存。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh"; // "zh" | "en"

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 条目列表中选择期刊论文。",
    none: "选中的期刊论文中，没有发现需要规范的 DOI 前缀。",
    allRO: n => `有 ${n} 条 DOI 可规范，但均位于只读文献库中，未做修改。`,
    dlgTitle: "Zotero DOI 批量修复",
    dlgText: (n, s, p) => `检测到 ${n} 条 DOI 可以规范格式${s ? `（另有 ${s} 条位于只读库，将跳过）` : ""}。\n回滚记录已复制到剪贴板，请先保存。\n\n${p}\n\n是否保存更改？`,
    ok: "确认修复",
    more: n => `……另有 ${n} 条`,
    cancelled: "已取消，未修改任何文献。",
    done: n => `完成：已规范 ${n} 条 DOI。`,
    logHint: "回滚记录（制表符分隔）已复制到剪贴板：",
    noClip: "警告：回滚记录未能复制到剪贴板，已取消写入。"
  },
  en: {
    noSel: "Please select journal articles in the Zotero item list first.",
    none: "No DOI prefix needs normalizing among the selected journal articles.",
    allRO: n => `${n} DOI(s) could be normalized, but all are in read-only libraries; nothing changed.`,
    dlgTitle: "Zotero DOI batch fix",
    dlgText: (n, s, p) => `${n} DOI(s) can be normalized${s ? ` (${s} in read-only libraries will be skipped)` : ""}.\nA rollback log has been copied to the clipboard; save it first.\n\n${p}\n\nSave changes?`,
    ok: "Apply",
    more: n => `...and ${n} more`,
    cancelled: "Cancelled; no items were changed.",
    done: n => `Done: ${n} DOI(s) normalized.`,
    logHint: "Rollback log (tab-separated) copied to the clipboard:",
    noClip: "Warning: the rollback log could not be copied to the clipboard; nothing was written."
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function isEditable(item) {
  try { return !!Zotero.Libraries.get(item.libraryID).editable; }
  catch (e) { return false; }
}

function copyToClipboard(text) {
  try { Zotero.Utilities.Internal.copyTextToClipboard(text); return true; }
  catch (e) {
    try {
      Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper).copyString(text);
      return true;
    } catch (e2) { Zotero.logError(e2); return false; }
  }
}

function confirmWrite(title, text, okLabel) {
  const win = Zotero.getMainWindow();
  const ps = typeof Services !== "undefined" ? Services.prompt : null;
  if (ps && typeof ps.confirmEx === "function") {
    const flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_CANCEL
      + ps.BUTTON_POS_1_DEFAULT
      + ps.BUTTON_DELAY_ENABLE;
    return ps.confirmEx(win, title, text, flags, okLabel, null, null, null, {}) === 0;
  }
  return !!(win && win.confirm(`${title}\n\n${text}`));
}

/* ===== Main / 主程序 ===== */
async function main() {
  const pane = Zotero.getActiveZoteroPane();
  const items = (pane ? pane.getSelectedItems() : [])
    .filter(i => i.itemType === "journalArticle" && !i.deleted);
  if (!items.length) return T.noSel;

  const changes = [];
  let skipped = 0;
  for (const item of items) {
    const oldDOI = item.getField("DOI") || "";
    const newDOI = oldDOI.trim()
      .replace(/^doi:\s*/i, "")
      .replace(/^https?:\/\/(?:www\.)?(?:dx\.)?doi\.org\//i, "")
      .trim();
    if (oldDOI !== newDOI && /^10\.\d{4,9}\/\S+$/i.test(newDOI)) {
      if (!isEditable(item)) { skipped++; continue; }
      changes.push({ item, oldDOI, newDOI });
    }
  }

  if (!changes.length) return skipped ? T.allRO(skipped) : T.none;

  const log = ["libraryID\titemKey\tfield\told\tnew",
    ...changes.map(c => `${c.item.libraryID}\t${c.item.key}\tDOI\t${c.oldDOI}\t${c.newDOI}`)].join("\n");
  if (!copyToClipboard(log)) return T.noClip;

  const preview = changes.slice(0, 5).map(c => `${c.oldDOI} → ${c.newDOI}`).join("\n")
    + (changes.length > 5 ? `\n${T.more(changes.length - 5)}` : "");
  if (!confirmWrite(T.dlgTitle, T.dlgText(changes.length, skipped, preview), T.ok)) return T.cancelled;

  await Zotero.DB.executeTransaction(async () => {
    for (const { item, newDOI } of changes) {
      item.setField("DOI", newDOI);
      await item.save();
    }
  });

  return `${T.done(changes.length)}\n\n${T.logHint}\n${log}`;
}

return await main();
