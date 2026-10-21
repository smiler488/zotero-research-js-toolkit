/**
 * 01 · Metadata Completeness Check / 文献元数据完整性检查
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读，不修改任何数据
 *
 * [EN]
 * What it does : Checks the selected regular items for missing title, creators,
 *                date, abstract, DOI (journal articles only) and a PDF attachment.
 * When to use  : Before writing a manuscript or thesis chapter; after a bulk
 *                import from a database export; before sharing a group library.
 * How to run   : Select items in the item list -> Tools -> Developer ->
 *                Run JavaScript -> paste this file -> Run (Ctrl/Cmd+R).
 *                The script contains `await`, so it runs as an async function.
 * Notes        : "Missing" means the field is empty in Zotero; it does not
 *                verify that existing values are correct. A DOI stored only in
 *                the Extra field ("DOI: 10.xxx/...") is accepted.
 *                Overlaps with script 08 (reference quality check); both are kept.
 *
 * [中文]
 * 功能说明     ：检查所选常规条目是否缺少标题、作者/责任者、日期、摘要、
 *                DOI（仅期刊论文）以及 PDF 附件。
 * 适用场景     ：撰写论文或学位论文章节之前；从数据库批量导入之后；
 *                共享群组文献库之前。
 * 运行方法     ：在条目列表中选中文献 -> 工具 -> 开发者 -> Run JavaScript ->
 *                粘贴本文件全部内容 -> 运行（Ctrl/Cmd+R）。
 * 注意事项     ：“缺少”仅指 Zotero 字段为空，不校验已有内容是否正确；
 *                仅写在“其他”(Extra) 字段中的 DOI 也视为已填写。
 *                与脚本 08（参考文献质量检查）功能部分重叠，两者均保留。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh"; // "zh" | "en"

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 条目列表中选择文献。",
    untitled: "未命名文献",
    title: "缺少标题",
    creators: "缺少作者或其他责任者",
    date: "缺少发表日期",
    abstract: "缺少摘要",
    doi: "未填写 DOI",
    pdf: "未关联 PDF",
    summary: (n, p) => `检查文献：${n} 篇\n存在待检查问题：${p} 篇`,
    none: "未发现上述问题"
  },
  en: {
    noSel: "Please select items in the Zotero item list first.",
    untitled: "Untitled item",
    title: "Missing title",
    creators: "Missing authors/creators",
    date: "Missing date",
    abstract: "Missing abstract",
    doi: "Missing DOI",
    pdf: "No PDF attachment",
    summary: (n, p) => `Items checked: ${n}\nItems with issues: ${p}`,
    none: "No issues of the above kinds were found."
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

function isPDF(att) {
  if (!att || !att.isAttachment()) return false;
  return typeof att.isPDFAttachment === "function"
    ? att.isPDFAttachment()
    : att.attachmentContentType === "application/pdf";
}

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const report = [];
  let problemCount = 0;

  for (const item of items) {
    const problems = [];
    const title = item.getField("title") || T.untitled;

    if (!item.getField("title")) problems.push(T.title);
    if (!item.getCreators().length) problems.push(T.creators);
    if (!item.getField("date")) problems.push(T.date);
    if (!item.getField("abstractNote")) problems.push(T.abstract);
    // DOI is checked for journal articles only / DOI 仅检查期刊论文
    if (item.itemType === "journalArticle" && !getDOI(item)) problems.push(T.doi);

    const hasPDF = Zotero.Items.get(item.getAttachments()).some(isPDF);
    if (!hasPDF) problems.push(T.pdf);

    if (problems.length) {
      problemCount++;
      report.push(`【${title}】\n- ${problems.join("\n- ")}`);
    }
  }

  return `${T.summary(items.length, problemCount)}\n\n${report.join("\n\n") || T.none}`;
}

return await main();
