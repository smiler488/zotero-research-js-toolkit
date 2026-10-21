/**
 * 13 · Title/Abstract Screening to CSV / 标题摘要初筛并导出 CSV
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Classifies the selected items for a systematic-review style
 *                first screen using two keyword groups (A AND B) and a title
 *                exclusion list, and copies a CSV (status, title, date, DOI,
 *                item key, reason) to the clipboard. Status values:
 *                "priority review", "probably exclude", "low priority, still
 *                review", "insufficient information" (no abstract).
 * When to use  : Triaging hundreds of search results, e.g. GROUP_A = ML
 *                methods and GROUP_B = crop yield, before full-text screening.
 * How to run   : 1) Edit GROUP_A / GROUP_B / EXCLUDE_TITLE. 2) Select items ->
 *                Tools -> Developer -> Run JavaScript -> paste -> Run.
 *                3) Paste into a plain-text editor and save as UTF-8 .csv
 *                (for Excel, import via Data -> From Text/CSV with UTF-8).
 * Notes        : This is decision SUPPORT, not an inclusion decision: every
 *                record still needs human review (PRISMA). Latin keywords match
 *                whole words (plural "s"/"es" allowed) when WHOLE_WORD = true, so
 *                "uav" does not match inside other words; CJK keywords use
 *                substring matching. Cells starting with = + - @ are prefixed
 *                with ' to prevent spreadsheet formula injection.
 *
 * [中文]
 * 功能说明     ：用两组关键词（A 且 B）和标题排除词，对所选文献进行类似系统综述的
 *                初筛分类，并将 CSV（筛选状态、标题、日期、DOI、条目 Key、理由）
 *                复制到剪贴板。状态包括“优先人工复核”“疑似排除”“低优先级，仍需复核”
 *                “信息不足”（无摘要）。
 * 适用场景     ：在全文筛选前对数百条检索结果进行分流，例如 GROUP_A 为机器学习方法，
 *                GROUP_B 为作物产量。
 * 运行方法     ：1) 修改 GROUP_A / GROUP_B / EXCLUDE_TITLE；2) 选中文献 -> 工具 ->
 *                开发者 -> Run JavaScript -> 粘贴 -> 运行；3) 粘贴到纯文本编辑器并以
 *                UTF-8 编码保存为 .csv（Excel 请通过 数据 -> 从文本/CSV 以 UTF-8 导入）。
 * 注意事项     ：结果仅为辅助判断而非纳入决定，每条记录仍需人工复核（PRISMA）。
 *                WHOLE_WORD = true 时拉丁字母关键词按整词匹配（允许复数 s/es），
 *                避免 “uav” 误匹配其他单词；中文关键词按子串匹配。以 = + - @ 开头的
 *                单元格会加 ' 前缀，防止电子表格公式注入。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";        // "zh" | "en"
const WHOLE_WORD = true;  // whole-word matching for Latin keywords / 拉丁字母关键词整词匹配
const GROUP_A = ["machine learning", "deep learning", "random forest"];
const GROUP_B = ["crop yield", "yield prediction", "产量预测"];
const EXCLUDE_TITLE = ["systematic review", "meta-analysis", "综述"];

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献。",
    header: ["筛选状态", "标题", "发表日期", "DOI", "条目Key", "理由"],
    insufficient: "信息不足", noAbs: "缺少摘要",
    exclude: "疑似排除", exHit: w => "标题命中：" + w,
    priority: "优先人工复核", both: (a, b) => `主题A：${a}；主题B：${b}`,
    low: "低优先级，仍需复核", notBoth: "未同时命中两组主题词",
    summary: n => `筛选 ${n} 篇文献：`,
    count: (k, v) => `${k}：${v} 篇`,
    copied: "CSV 已复制到剪贴板，可以粘贴到文本文件并以 UTF-8 保存为 .csv。",
    notCopied: "CSV 未能复制到剪贴板，请从下方复制："
  },
  en: {
    noSel: "Please select items first.",
    header: ["status", "title", "date", "DOI", "itemKey", "reason"],
    insufficient: "insufficient information", noAbs: "no abstract",
    exclude: "probably exclude", exHit: w => "title matched: " + w,
    priority: "priority review", both: (a, b) => `topic A: ${a}; topic B: ${b}`,
    low: "low priority, still review", notBoth: "did not match both keyword groups",
    summary: n => `Screened ${n} items:`,
    count: (k, v) => `${k}: ${v}`,
    copied: "CSV copied to the clipboard; paste into a text file and save as UTF-8 .csv.",
    notCopied: "The CSV could not be copied to the clipboard; copy it from below:"
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

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function makeMatcher(word) {
  const w = word.trim();
  const esc = escapeRegExp(w);
  const latin = /^[\p{Script=Latin}\p{N}\s\-'.]+$/u.test(w);
  const re = WHOLE_WORD && latin
    ? new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?:s|es)?(?![\\p{L}\\p{N}])`, "iu")
    : new RegExp(esc, "iu");
  return { word: w, re };
}

const matchAll = (text, matchers) => matchers.filter(m => m.re.test(text)).map(m => m.word);

function csv(value) {
  let s = String(value ?? "");
  // Prevent spreadsheet formula injection / 避免电子表格把外部字段当作公式
  if (/^\s*[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const A = GROUP_A.filter(Boolean).map(makeMatcher);
  const B = GROUP_B.filter(Boolean).map(makeMatcher);
  const X = EXCLUDE_TITLE.filter(Boolean).map(makeMatcher);

  const rows = [T.header];
  const counts = {};

  for (const item of items) {
    const title = item.getField("title") || "";
    const abstract = item.getField("abstractNote") || "";
    const text = `${title} ${abstract}`;
    const a = matchAll(text, A);
    const b = matchAll(text, B);
    const excluded = matchAll(title, X);

    let status, reason;
    if (!abstract.trim()) {
      status = T.insufficient; reason = T.noAbs;
    } else if (excluded.length) {
      status = T.exclude; reason = T.exHit(excluded.join("; "));
    } else if (a.length && b.length) {
      status = T.priority; reason = T.both(a.join("; "), b.join("; "));
    } else {
      status = T.low; reason = T.notBoth;
    }
    counts[status] = (counts[status] || 0) + 1;
    rows.push([status, title, item.getField("date"), item.getField("DOI"), item.key, reason]);
  }

  const output = rows.map(r => r.map(csv).join(",")).join("\n");
  const copied = copyToClipboard(output);
  const summary = `${T.summary(items.length)}\n` +
    Object.entries(counts).map(([k, v]) => T.count(k, v)).join("\n");
  return copied ? `${summary}\n\n${T.copied}` : `${summary}\n\n${T.notCopied}\n${output}`;
}

return await main();
