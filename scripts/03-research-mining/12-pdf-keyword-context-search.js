/**
 * 12 · PDF Keyword-in-Context Search / PDF 实验参数关键词上下文检索
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Reads the full text that Zotero has indexed for each selected
 *                item's PDF and reports up to MAX_HITS snippets per keyword with
 *                CONTEXT characters on each side. The report (Markdown) is
 *                copied to the clipboard.
 * When to use  : Extracting experimental settings across papers for a
 *                meta-analysis or model parameterization, e.g. temperature,
 *                irrigation amount, nitrogen rate, sample size, LAI, Vcmax.
 * How to run   : 1) Edit KEYWORDS. 2) Select items -> Tools -> Developer ->
 *                Run JavaScript -> paste -> Run.
 * Notes        : Uses `attachment.attachmentText`, i.e. Zotero's full-text
 *                index. PDFs that are scanned images (no OCR) or not yet indexed
 *                return no text: right-click the PDF -> "Reindex Item", or check
 *                Settings -> Search -> Full-Text Cache. Matching is
 *                case-insensitive substring matching; numbers in snippets must
 *                be verified against the PDF (tables and units are often
 *                garbled by text extraction). Run script 07 first if files may
 *                be missing locally.
 *
 * [中文]
 * 功能说明     ：读取 Zotero 为所选文献 PDF 建立的全文索引，每个关键词最多报告
 *                MAX_HITS 处片段，前后各截取 CONTEXT 个字符。报告（Markdown）
 *                复制到剪贴板。
 * 适用场景     ：为 Meta 分析或模型参数化跨文献提取实验条件，例如温度、灌溉量、
 *                施氮量、样本量、LAI、Vcmax 等。
 * 运行方法     ：1) 修改 KEYWORDS；2) 选中文献 -> 工具 -> 开发者 ->
 *                Run JavaScript -> 粘贴 -> 运行。
 * 注意事项     ：使用 attachment.attachmentText（即 Zotero 全文索引）。扫描版 PDF
 *                （未 OCR）或尚未建立索引的 PDF 无法返回文本：可右键 PDF ->
 *                “重建索引”，或在 设置 -> 搜索 -> 全文缓存 中检查。匹配方式为不区分
 *                大小写的子串匹配；片段中的数值必须对照 PDF 核实（文本提取常使表格
 *                与单位错乱）。如文件可能未下载到本地，请先运行脚本 07。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置：修改这里即可 ===== */
const LANG = "zh";   // "zh" | "en"
const KEYWORDS = [
  "temperature", "°C",
  "irrigation", "灌溉",
  "nitrogen", "氮肥",
  "sample size"
];
const CONTEXT = 100;      // characters before/after the hit / 关键词前后截取字符数
const MAX_HITS = 3;       // per keyword per PDF / 每篇 PDF 每个词最多几处
const PREVIEW_CHARS = 2500;

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献记录。",
    h1: "# PDF 实验参数检索报告",
    untitled: "无标题", noDOI: "未填写",
    kw: "关键词", text: "原文",
    readFail: m => `PDF 读取失败：${m}`,
    stats: (n, s, h, e, f) => `检查 ${n} 篇；可读 PDF ${s} 个；命中 ${h} 处；无文本 ${e} 个（可能未建立全文索引或为扫描件）；读取失败 ${f} 个。`,
    copied: "完整报告已复制到剪贴板。",
    noHit: "所选文献的 PDF 中未找到任何关键词。"
  },
  en: {
    noSel: "Please select items first.",
    h1: "# PDF parameter search report",
    untitled: "Untitled", noDOI: "n/a",
    kw: "Keyword", text: "Text",
    readFail: m => `Failed to read PDF: ${m}`,
    stats: (n, s, h, e, f) => `Checked ${n} items; readable PDFs ${s}; hits ${h}; PDFs without text ${e} (not indexed or scanned); read failures ${f}.`,
    copied: "The full report has been copied to the clipboard.",
    noHit: "None of the keywords were found in the selected PDFs."
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
}

function isPDF(att) {
  if (!att || !att.isAttachment()) return false;
  return typeof att.isPDFAttachment === "function"
    ? att.isPDFAttachment()
    : att.attachmentContentType === "application/pdf";
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

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const patterns = KEYWORDS.filter(Boolean)
    .map(k => ({ keyword: k, re: new RegExp(escapeRegExp(k), "giu") }));

  const output = [T.h1, ""];
  let scanned = 0, matched = 0, empty = 0, failed = 0;

  for (const item of items) {
    const title = item.getField("title") || T.untitled;
    const doi = item.getField("DOI") || T.noDOI;
    const hits = [];

    for (const att of Zotero.Items.get(item.getAttachments()).filter(isPDF)) {
      try {
        const raw = await att.attachmentText;
        const content = String(raw || "").replace(/\s+/g, " ").trim();
        if (!content) { empty++; continue; }
        scanned++;
        for (const { keyword, re } of patterns) {
          re.lastIndex = 0;
          let n = 0;
          for (const m of content.matchAll(re)) {
            if (n++ >= MAX_HITS) break;
            const start = Math.max(0, m.index - CONTEXT);
            const end = Math.min(content.length, m.index + m[0].length + CONTEXT);
            hits.push(`${T.kw}：${keyword}\n${T.text}：…${content.slice(start, end)}…`);
            matched++;
          }
        }
      } catch (e) {
        failed++;
        hits.push(T.readFail(e.message));
      }
    }

    if (hits.length) {
      output.push(`## ${title}\nDOI: ${doi}`);
      output.push(hits.join("\n\n"), "");
    }
  }

  output.splice(1, 0, T.stats(items.length, scanned, matched, empty, failed));
  if (!matched && !failed) output.push(T.noHit);
  const report = output.join("\n");
  const copied = copyToClipboard(report);
  return (copied ? `${T.copied}\n\n` : "") + report.slice(0, PREVIEW_CHARS);
}

return await main();
