/**
 * 11 · Similar Tags Check / 相似标签检查
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读，不合并、不重命名标签
 *
 * [EN]
 * What it does : Finds tags on the selected items that differ only by case,
 *                full-width/half-width characters, extra whitespace and (with
 *                LOOSE = true) hyphens/underscores, e.g. "Remote sensing",
 *                "remote-sensing", "Remote  Sensing". The report is copied to
 *                the clipboard.
 * When to use  : Cleaning a tag vocabulary that grew from several import
 *                sources, coauthors or automatic tags.
 * How to run   : Select items (Ctrl/Cmd+A for the whole collection) -> Tools ->
 *                Developer -> Run JavaScript -> paste -> Run.
 * Notes        : The script only reports. Merge tags manually in the tag
 *                selector: rename one variant to exactly match the other and
 *                Zotero merges them. Only tags on the selected items are checked.
 *
 * [中文]
 * 功能说明     ：找出所选文献上仅在大小写、全角/半角、多余空白，以及（LOOSE = true
 *                时）连字符/下划线上有差异的标签，例如 “Remote sensing”
 *                “remote-sensing”“Remote  Sensing”。报告复制到剪贴板。
 * 适用场景     ：清理来自多个导入来源、合作者或自动标签而变得杂乱的标签体系。
 * 运行方法     ：选中文献（可 Ctrl/Cmd+A 全选当前分类）-> 工具 -> 开发者 ->
 *                Run JavaScript -> 粘贴 -> 运行。
 * 注意事项     ：本脚本只报告不修改。请在标签选择器中手动合并：把一个变体重命名为
 *                与另一个完全一致，Zotero 会自动合并。仅检查所选文献上的标签。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";   // "zh" | "en"
const LOOSE = true;  // also treat "-" and "_" as spaces / 将 - 与 _ 视为空格

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献。",
    head: "Zotero 相似标签检查",
    checked: n => `检查文献：${n} 篇`,
    groups: n => `疑似重复标签组：${n}`,
    copied: "（报告已复制到剪贴板）"
  },
  en: {
    noSel: "Please select items first.",
    head: "Zotero similar-tag check",
    checked: n => `Items checked: ${n}`,
    groups: n => `Candidate duplicate tag groups: ${n}`,
    copied: "(Report copied to the clipboard)"
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
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

function normalizeTag(tag) {
  let s = tag.normalize("NFKC").toLowerCase();
  if (LOOSE) s = s.replace(/[-_]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const groups = new Map();
  for (const item of items) {
    for (const { tag } of item.getTags()) {
      const key = normalizeTag(tag);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(tag);
    }
  }

  const duplicates = [...groups.values()]
    .filter(names => names.size > 1)
    .map(names => [...names].join(" / "));

  const report = [
    T.head,
    T.checked(items.length),
    T.groups(duplicates.length),
    "",
    ...duplicates.map((s, i) => `${i + 1}. ${s}`)
  ].join("\n");

  return copyToClipboard(report) ? `${report}\n\n${T.copied}` : report;
}

return await main();
