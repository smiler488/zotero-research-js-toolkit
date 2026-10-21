/**
 * 02 · Duplicate Candidates Finder / 疑似重复文献查找
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读，不合并、不删除
 *
 * [EN]
 * What it does : Groups the selected items that share the same normalized DOI,
 *                or the same normalized title + publication year, and lists them
 *                with their item IDs and keys.
 * When to use  : Within a specific collection or a search result, where the
 *                built-in "Duplicate Items" view is too broad or misses items
 *                whose DOIs differ only by prefix (https://doi.org/, doi:) or case.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste -> Run.
 * Notes        : Results are CANDIDATES only. Merge them with Zotero's own
 *                "Duplicate Items" view, which keeps attachments, notes and tags.
 *                Titles are compared after removing punctuation, symbols and
 *                whitespace, so a preprint and its journal version from the same
 *                year will be grouped together; check before merging.
 *
 * [中文]
 * 功能说明     ：将 DOI 规范化后相同，或标题规范化后与发表年份均相同的所选条目
 *                归为一组，并列出条目 ID 与 Key。
 * 适用场景     ：只想在某个分类或检索结果内查重；内置“重复条目”视图范围过大，
 *                或因 DOI 前缀（https://doi.org/、doi:）、大小写不同而漏检时。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行。
 * 注意事项     ：结果仅为“疑似重复”。请在 Zotero 自带的“重复条目”视图中合并，
 *                以保留附件、笔记与标签。标题比较时会去除标点、符号与空白，
 *                同年发表的预印本与正式版本可能被归为一组，合并前请人工确认。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh"; // "zh" | "en"

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 条目列表中选择文献。",
    byDOI: "DOI 相同",
    byTitle: "标题和年份相同",
    none: n => `已检查 ${n} 篇，未发现上述疑似重复记录。`,
    head: (n, g) => `已检查 ${n} 篇，疑似重复组：${g} 组\n合并请使用 Zotero 的“重复条目”视图。`
  },
  en: {
    noSel: "Please select items in the Zotero item list first.",
    byDOI: "Same DOI",
    byTitle: "Same title and year",
    none: n => `Checked ${n} items; no duplicate candidates of these kinds found.`,
    head: (n, g) => `Checked ${n} items; candidate groups: ${g}\nUse Zotero's "Duplicate Items" view to merge.`
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
  // Multipart SQL date, e.g. "2021-03-00 March 2021"; "0000" when unknown
  const y = (item.getField("date", true, true) || "").slice(0, 4);
  return /^\d{4}$/.test(y) && y !== "0000" ? y : "";
}

function normalizeDOI(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  // Zotero.Utilities.cleanDOI extracts "10.xxxx/..." or returns false
  const cleaned = typeof Zotero.Utilities.cleanDOI === "function"
    ? Zotero.Utilities.cleanDOI(s)
    : s.replace(/^https?:\/\/(?:www\.)?(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  return (cleaned || "").toLowerCase();
}

function getDOI(item) {
  const field = item.getField("DOI");
  if (field) return field;
  const m = (item.getField("extra") || "").match(/^\s*DOI:\s*(\S+)/im);
  return m ? m[1] : "";
}

function addToMap(map, key, item) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const doiMap = new Map();
  const titleMap = new Map();

  for (const item of items) {
    const doi = normalizeDOI(getDOI(item));
    if (doi) addToMap(doiMap, doi, item);

    const title = (item.getField("title") || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\p{P}\p{S}\s]/gu, "");
    const year = getYear(item);
    if (title && year) addToMap(titleMap, `${year}:${title}`, item);
  }

  const results = [];
  for (const [type, map] of [[T.byDOI, doiMap], [T.byTitle, titleMap]]) {
    for (const [key, group] of map) {
      if (group.length < 2) continue;
      results.push(
        `${type}：${key}\n` +
        group.map(i => `- ${i.getField("title")} [ID: ${i.id} | Key: ${i.key}]`).join("\n")
      );
    }
  }

  return results.length
    ? `${T.head(items.length, results.length)}\n\n${results.join("\n\n")}`
    : T.none(items.length);
}

return await main();
