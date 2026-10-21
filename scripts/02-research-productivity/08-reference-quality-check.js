/**
 * 08 · Reference Quality Check (citation-ready) / 参考文献质量检查（投稿前）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Checks fields that citation styles need: title, creators and
 *                date for every item, plus DOI, journal name, abstract, volume
 *                and pages/article number for journal articles. The report is
 *                copied to the clipboard.
 * When to use  : Before submitting a manuscript or thesis, on the collection
 *                that feeds your bibliography, to avoid "n.p." / missing-volume
 *                entries in the reference list.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste -> Run.
 * Notes        : Online-first articles legitimately lack volume/pages; GB/T 7714
 *                and many journals accept an article number instead of pages.
 *                Treat each flag as "check manually", not as an error.
 *                Overlaps with script 01 (adds PDF check, omits volume/pages);
 *                both are kept.
 *
 * [中文]
 * 功能说明     ：检查引文样式所需字段：所有条目检查标题、作者/责任者、日期；
 *                期刊论文另检查 DOI、期刊名称、摘要、卷号以及页码/文章编号。
 *                报告复制到剪贴板。
 * 适用场景     ：投稿或提交学位论文前，对生成参考文献表的分类运行，避免出现
 *                缺卷号、缺页码等不完整条目。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行。
 * 注意事项     ：网络优先出版的论文可能确实没有卷号和页码；GB/T 7714 及许多期刊
 *                接受以文章编号代替页码。每项提示应理解为“需人工核对”而非错误。
 *                与脚本 01（增加 PDF 检查，不查卷号页码）功能重叠，两者均保留。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh"; // "zh" | "en"

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择参考文献。",
    untitled: "无标题",
    title: "缺少标题", creators: "缺少作者/责任者", date: "缺少发表日期",
    doi: "未填写 DOI", journal: "缺少期刊名称", abstract: "缺少摘要",
    volume: "缺少卷号", pages: "未填写页码或文章编号",
    head: (n, p) => `参考文献质量检查\n检查：${n} 篇\n需人工核对：${p} 篇`,
    none: "未发现上述缺失项",
    copied: "（报告已复制到剪贴板）"
  },
  en: {
    noSel: "Please select references first.",
    untitled: "Untitled",
    title: "Missing title", creators: "Missing authors/creators", date: "Missing date",
    doi: "Missing DOI", journal: "Missing journal name", abstract: "Missing abstract",
    volume: "Missing volume", pages: "Missing pages or article number",
    head: (n, p) => `Reference quality check\nChecked: ${n}\nNeed manual review: ${p}`,
    none: "No missing fields of the above kinds.",
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

function getDOI(item) {
  const field = (item.getField("DOI") || "").trim();
  if (field) return field;
  const m = (item.getField("extra") || "").match(/^\s*DOI:\s*(\S+)/im);
  return m ? m[1] : "";
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

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const problems = [];
  for (const item of items) {
    const issues = [];
    const title = item.getField("title") || T.untitled;
    if (!item.getField("title")) issues.push(T.title);
    if (!item.getCreators().length) issues.push(T.creators);
    if (!item.getField("date")) issues.push(T.date);
    if (item.itemType === "journalArticle") {
      if (!getDOI(item)) issues.push(T.doi);
      if (!item.getField("publicationTitle")) issues.push(T.journal);
      if (!item.getField("abstractNote")) issues.push(T.abstract);
      if (!item.getField("volume")) issues.push(T.volume);
      if (!item.getField("pages")) issues.push(T.pages);
    }
    if (issues.length) problems.push(`【${title}】\n${issues.map(x => "• " + x).join("\n")}`);
  }

  const report = `${T.head(items.length, problems.length)}\n${problems.join("\n\n") || T.none}`;
  return copyToClipboard(report) ? `${report}\n\n${T.copied}` : report;
}

return await main();
