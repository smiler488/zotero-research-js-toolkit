/**
 * 03 · DOI Cleanup (preview-first) / DOI 格式清洗（默认仅预览）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: PREVIEW by default; WRITE only after
 *         PREVIEW_ONLY = false AND an explicit confirmation dialog.
 *         默认仅预览；只有设置 PREVIEW_ONLY = false 且在确认对话框中确认后才写入。
 *
 * [EN]
 * What it does : Strips "https://doi.org/", "http://dx.doi.org/" and "doi:"
 *                prefixes from the DOI field of ALL selected regular item types
 *                (journal articles, conference papers, preprints, books, ...).
 *                Only values that become a syntactically valid DOI (10.xxxx/...)
 *                are changed.
 * When to use  : After importing from sources that store DOIs as URLs, which
 *                can break citation styles, duplicate detection and DOI lookups.
 * How to run   : 1) Select items -> Tools -> Developer -> Run JavaScript -> paste
 *                -> Run, and review the preview.
 *                2) To write, set PREVIEW_ONLY = false, run again, and click
 *                "Apply" in the dialog (Cancel is the default button).
 * Notes        : Items in read-only libraries (e.g. groups without edit rights,
 *                feeds) are skipped. Before saving, a rollback log (old -> new
 *                values with item keys) is copied to the clipboard; paste it
 *                somewhere safe. Changes are saved in one transaction.
 *                Overlaps with script 05 (journal articles only, always asks);
 *                both are kept.
 *
 * [中文]
 * 功能说明     ：去除所选全部常规条目类型（期刊论文、会议论文、预印本、图书等）
 *                DOI 字段中的 “https://doi.org/”“http://dx.doi.org/”“doi:” 前缀，
 *                仅当清洗结果符合 DOI 基本语法（10.xxxx/...）时才修改。
 * 适用场景     ：从以 URL 形式存储 DOI 的来源导入后；此类格式会影响引文样式、
 *                查重与 DOI 检索。
 * 运行方法     ：1) 选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行，
 *                查看预览结果；
 *                2) 如需写入，将 PREVIEW_ONLY 改为 false 后再次运行，并在对话框中
 *                点击“应用”（默认按钮为“取消”）。
 * 注意事项     ：只读文献库（如无编辑权限的群组、订阅源）中的条目会被跳过。
 *                保存前会把回滚记录（条目 Key 与修改前后值）复制到剪贴板，
 *                请先粘贴保存。所有修改在同一事务中保存。
 *                与脚本 05（仅限期刊论文、始终弹窗确认）功能重叠，两者均保留。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";          // "zh" | "en"
const PREVIEW_ONLY = true;  // true: preview only / 仅预览; false: ask, then save / 确认后保存

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 条目列表中选择文献。",
    preview: "预览（未修改任何数据）",
    saved: "已保存",
    cancelled: "已取消，未修改任何文献。",
    count: n => `可清洗 DOI：${n} 条`,
    skipped: n => `只读文献库中跳过：${n} 条`,
    none: "没有需要清洗的记录",
    dlgTitle: "DOI 格式清洗",
    dlgText: (n, p) => `将修改 ${n} 条 DOI。回滚记录已复制到剪贴板，请先保存。\n\n${p}\n\n是否应用这些修改？`,
    ok: "应用",
    more: n => `……另有 ${n} 条`,
    logHint: "回滚记录（制表符分隔）已复制到剪贴板：",
    noClip: "警告：回滚记录未能复制到剪贴板，已取消写入。"
  },
  en: {
    noSel: "Please select items in the Zotero item list first.",
    preview: "Preview (nothing was changed)",
    saved: "Saved",
    cancelled: "Cancelled; no items were changed.",
    count: n => `DOIs to clean: ${n}`,
    skipped: n => `Skipped (read-only library): ${n}`,
    none: "No DOI needs cleaning.",
    dlgTitle: "DOI cleanup",
    dlgText: (n, p) => `${n} DOI value(s) will be changed. A rollback log has been copied to the clipboard; save it first.\n\n${p}\n\nApply these changes?`,
    ok: "Apply",
    more: n => `...and ${n} more`,
    logHint: "Rollback log (tab-separated) copied to the clipboard:",
    noClip: "Warning: the rollback log could not be copied to the clipboard; nothing was written."
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
}

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

// Returns true ONLY when the user clicks the confirm button.
// Esc / closing the window / Cancel all return false.
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

function cleanDOI(original) {
  return original
    .replace(/^https?:\/\/(?:www\.)?(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const changes = [];
  let skipped = 0;

  for (const item of items) {
    const original = item.getField("DOI") || "";
    if (!original.trim()) continue;
    const cleaned = cleanDOI(original.trim());
    // Only syntactically valid DOIs are written / 只处理符合基本 DOI 语法的字符串
    if (!/^10\.\d{4,9}\/\S+$/i.test(cleaned)) continue;
    if (original === cleaned) continue;
    if (!isEditable(item)) { skipped++; continue; }
    changes.push({ item, original, cleaned });
  }

  const lines = changes.map(c => `${c.original} → ${c.cleaned}`);
  const summary = [T.count(changes.length), skipped ? T.skipped(skipped) : ""].filter(Boolean).join("\n");

  if (PREVIEW_ONLY || !changes.length) {
    return `${T.preview}\n${summary}\n${lines.join("\n") || T.none}`;
  }

  // Rollback log first / 先生成回滚记录
  const log = ["libraryID\titemKey\tfield\told\tnew",
    ...changes.map(c => `${c.item.libraryID}\t${c.item.key}\tDOI\t${c.original}\t${c.cleaned}`)].join("\n");
  if (!copyToClipboard(log)) return T.noClip;

  const shown = lines.slice(0, 10).join("\n") + (lines.length > 10 ? `\n${T.more(lines.length - 10)}` : "");
  if (!confirmWrite(T.dlgTitle, T.dlgText(changes.length, shown), T.ok)) return T.cancelled;

  await Zotero.DB.executeTransaction(async () => {
    for (const c of changes) {
      c.item.setField("DOI", c.cleaned);
      await c.item.save();
    }
  });

  return `${T.saved}\n${summary}\n${lines.join("\n")}\n\n${T.logHint}\n${log}`;
}

return await main();
