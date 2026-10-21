/**
 * 10 · Literature Review Matrix (Markdown table) / 文献综述矩阵（Markdown 表格）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Builds a Markdown table (No., year, first author, title,
 *                journal, DOI, abstract excerpt) for the selected items and
 *                copies it to the clipboard.
 * When to use  : Starting a review matrix in Markdown/Obsidian/Typora, or a
 *                quick overview table for a thesis-chapter literature section.
 *                Add your own columns (method, crop, sensor, scale...) afterwards.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste
 *                -> Run -> paste into a Markdown editor.
 * Notes        : Pipe characters are escaped so the table stays valid.
 *                "First author" is the first creator whose role is Author
 *                (falls back to the first creator). The year comes from Zotero's
 *                parsed date, so non-standard date strings still work.
 *
 * [中文]
 * 功能说明     ：为所选文献生成 Markdown 表格（编号、年份、第一作者、标题、期刊、
 *                DOI、摘要摘录），并复制到剪贴板。
 * 适用场景     ：在 Markdown/Obsidian/Typora 中建立综述矩阵，或为学位论文文献综述
 *                章节快速生成概览表；之后可自行增加方法、作物、传感器、尺度等列。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行 ->
 *                粘贴到 Markdown 编辑器。
 * 注意事项     ：竖线字符会被转义以保证表格有效。“第一作者”取第一位角色为“作者”
 *                的责任者（没有则取第一位责任者）。年份取自 Zotero 解析后的日期，
 *                非标准日期字符串同样可用。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";            // "zh" | "en"
const ABSTRACT_CHARS = 350;   // abstract excerpt length / 摘要摘录长度
const PREVIEW_CHARS = 1800;

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献。",
    header: "| 编号 | 年份 | 第一作者 | 标题 | 期刊 | DOI | 摘要摘录 |",
    unknown: "未知", noAbs: "无摘要",
    done: (n, c) => `已生成 ${n} 篇文献的综述矩阵${c ? "，并复制到剪贴板" : ""}。`
  },
  en: {
    noSel: "Please select items first.",
    header: "| No. | Year | First author | Title | Journal | DOI | Abstract excerpt |",
    unknown: "Unknown", noAbs: "No abstract",
    done: (n, c) => `Review matrix built for ${n} item(s)${c ? " and copied to the clipboard" : ""}.`
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
}

function getYear(item) {
  const y = (item.getField("date", true, true) || "").slice(0, 4);
  return /^\d{4}$/.test(y) && y !== "0000" ? y : "";
}

function firstAuthor(item) {
  const creators = item.getCreatorsJSON();
  if (!creators.length) return "";
  const c = creators.find(x => x.creatorType === "author") || creators[0];
  return c.lastName || c.name || c.firstName || "";
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

const clean = s => String(s || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const rows = [T.header, "|---|---|---|---|---|---|---|"];
  items.forEach((item, n) => {
    const cells = [
      n + 1,
      getYear(item) || T.unknown,
      clean(firstAuthor(item)) || T.unknown,
      clean(item.getField("title")),
      clean(item.getField("publicationTitle")),
      clean(item.getField("DOI")),
      // slice before escaping so a cut never leaves a dangling "\" before the cell border
      clean(String(item.getField("abstractNote") || "").replace(/\s+/g, " ").trim().slice(0, ABSTRACT_CHARS)) || T.noAbs
    ];
    rows.push(`| ${cells.join(" | ")} |`);
  });

  const result = rows.join("\n");
  const copied = copyToClipboard(result);
  return `${T.done(items.length, copied)}\n\n${result.slice(0, PREVIEW_CHARS)}`;
}

return await main();
