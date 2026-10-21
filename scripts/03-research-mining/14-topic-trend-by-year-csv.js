/**
 * 14 · Topic Trend by Year (CSV) / 研究主题年度趋势统计（CSV）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Counts, per publication year, how many selected items mention
 *                each topic (any of its keywords in title + abstract) and copies
 *                a CSV (Year, Total, topic columns) to the clipboard, ready for
 *                plotting in Excel, R or Python.
 * When to use  : Bibliometric overviews for a thesis introduction or review,
 *                e.g. how statistics -> machine learning -> deep learning methods
 *                spread in remote-sensing crop monitoring papers.
 * How to run   : 1) Edit TOPICS. 2) Select items -> Tools -> Developer ->
 *                Run JavaScript -> paste -> Run. 3) Paste into a .csv file.
 * Notes        : One item can count toward several topics, so topic columns do
 *                not sum to Total. Items without a parseable year are excluded
 *                (reported). Latin keywords match whole words (plural "s"/"es"
 *                allowed) when WHOLE_WORD = true, so "anova" does not match
 *                "manova". Counts reflect your selection, not the whole field.
 *
 * [中文]
 * 功能说明     ：按发表年份统计所选文献中提及各主题（标题+摘要命中该主题任一关键词）
 *                的数量，并将 CSV（Year、Total、各主题列）复制到剪贴板，可直接在
 *                Excel、R 或 Python 中绘图。
 * 适用场景     ：为学位论文绪论或综述做文献计量概览，例如观察遥感作物监测论文中
 *                传统统计 -> 机器学习 -> 深度学习方法的演变。
 * 运行方法     ：1) 修改 TOPICS；2) 选中文献 -> 工具 -> 开发者 -> Run JavaScript ->
 *                粘贴 -> 运行；3) 粘贴保存为 .csv 文件。
 * 注意事项     ：同一篇文献可计入多个主题，因此各主题列之和不等于 Total。无法解析
 *                年份的文献不计入（会报告数量）。WHOLE_WORD = true 时拉丁字母关键词
 *                按整词匹配（允许复数 s/es），“anova”不会匹配 “manova”。统计结果只
 *                反映所选文献，不代表整个领域。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置：主题与关键词 ===== */
const LANG = "zh";        // "zh" | "en"
const WHOLE_WORD = true;
const TOPICS = {
  "传统统计": ["regression", "anova", "linear model"],
  "机器学习": ["machine learning", "random forest", "support vector machine"],
  "深度学习": ["deep learning", "transformer", "convolutional neural network"],
  "遥感": ["remote sensing", "satellite", "uav"]
};

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献。",
    done: (v, s) => `已统计 ${v} 篇有可识别年份的文献${s ? `；${s} 篇无年份未计入` : ""}。`,
    copied: "CSV 数据已复制到剪贴板。"
  },
  en: {
    noSel: "Please select items first.",
    done: (v, s) => `Counted ${v} items with a parseable year${s ? `; ${s} without a year were excluded` : ""}.`,
    copied: "CSV data copied to the clipboard."
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

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function makeMatcher(word) {
  const w = word.trim();
  const esc = escapeRegExp(w);
  const latin = /^[\p{Script=Latin}\p{N}\s\-'.]+$/u.test(w);
  return WHOLE_WORD && latin
    ? new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu")
    : new RegExp(esc, "iu");
}

const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const names = Object.keys(TOPICS);
  const matchers = Object.fromEntries(
    names.map(n => [n, TOPICS[n].filter(Boolean).map(makeMatcher)])
  );

  const data = new Map();
  let valid = 0, noYear = 0;

  for (const item of items) {
    const year = getYear(item);
    if (!year) { noYear++; continue; }
    valid++;
    if (!data.has(year)) data.set(year, { total: 0 });
    const row = data.get(year);
    row.total++;

    const text = `${item.getField("title") || ""} ${item.getField("abstractNote") || ""}`;
    for (const topic of names) {
      if (matchers[topic].some(re => re.test(text))) row[topic] = (row[topic] || 0) + 1;
    }
  }

  const lines = [["Year", "Total", ...names].map(csvCell).join(",")];
  for (const year of [...data.keys()].sort()) {
    const row = data.get(year);
    lines.push([year, row.total, ...names.map(n => row[n] || 0)].join(","));
  }

  const result = lines.join("\n");
  const copied = copyToClipboard(result);
  return `${T.done(valid, noYear)}\n${copied ? T.copied + "\n" : ""}\n${result}`;
}

return await main();
