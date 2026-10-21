/**
 * 09 · Annotation Export to Markdown / 文献批注汇总导出（Markdown）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Collects highlight / underline / note / text annotations (and
 *                their comments) made in the Zotero reader from the selected
 *                items' PDF, EPUB and web-snapshot attachments, sorted in
 *                reading order, and copies a Markdown digest to the clipboard.
 * When to use  : Turning reading notes into a literature-review draft or an
 *                Obsidian/Logseq note; preparing lab-meeting summaries.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste
 *                -> Run -> paste the clipboard into a .md file.
 * Notes        : Image and ink annotations have no text and are skipped.
 *                Annotations embedded in a PDF by another program are included
 *                only after Zotero has imported them (open the PDF once in the
 *                Zotero reader). The return pane shows only the first
 *                PREVIEW_CHARS characters; the clipboard holds the full text.
 *
 * [中文]
 * 功能说明     ：汇总所选文献的 PDF、EPUB 与网页快照附件中，在 Zotero 阅读器内
 *                添加的高亮、下划线、便笺、文本批注及其评论，按阅读顺序排序，并将
 *                Markdown 汇总复制到剪贴板。
 * 适用场景     ：将阅读笔记整理为综述初稿或 Obsidian/Logseq 笔记；准备组会汇报。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行 ->
 *                将剪贴板内容粘贴到 .md 文件。
 * 注意事项     ：图片批注与手绘（ink）批注没有文字，会被跳过。其他软件写入 PDF 的
 *                内嵌批注，需先在 Zotero 阅读器中打开一次该 PDF 才会被导入。
 *                结果窗口仅显示前 PREVIEW_CHARS 个字符，剪贴板中为完整内容。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";            // "zh" | "en"
const PREVIEW_CHARS = 1800;   // characters shown in the result pane / 结果窗口显示字符数
const INCLUDE_COLOR = true;   // include highlight colour / 输出高亮颜色

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选择文献。",
    h1: "# Zotero 文献批注汇总",
    untitled: "无标题",
    page: "页码", type: "类型", color: "颜色", unknown: "未知",
    quote: "原文", comment: "评论",
    none: "选中文献中没有找到带文字内容的批注。",
    done: (n, c) => `已提取 ${n} 条文字批注${c ? "，完整内容已复制到剪贴板" : ""}。`
  },
  en: {
    noSel: "Please select items first.",
    h1: "# Zotero annotation digest",
    untitled: "Untitled",
    page: "Page", type: "Type", color: "Color", unknown: "unknown",
    quote: "Quote", comment: "Comment",
    none: "No annotations with text were found in the selected items.",
    done: (n, c) => `Extracted ${n} text annotation(s)${c ? "; the full digest is on the clipboard" : ""}.`
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
}

// Attachments that can hold reader annotations in Zotero 7+ (PDF, EPUB, snapshot)
function isReaderAttachment(att) {
  if (!att || !att.isAttachment() || !att.isFileAttachment()) return false;
  const fn = name => typeof att[name] === "function" && att[name]();
  return fn("isPDFAttachment") || fn("isEPUBAttachment") || fn("isSnapshotAttachment")
    || att.attachmentContentType === "application/pdf";
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

const oneLine = s => String(s || "").replace(/\s+/g, " ").trim();

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const lines = [T.h1, ""];
  let count = 0;

  for (const item of items) {
    const sections = [];
    for (const att of Zotero.Items.get(item.getAttachments()).filter(isReaderAttachment)) {
      const annotations = att.getAnnotations()
        .slice()
        .sort((a, b) => (a.annotationSortIndex || "").localeCompare(b.annotationSortIndex || ""));
      for (const a of annotations) {
        const quote = oneLine(a.annotationText);
        const comment = oneLine(a.annotationComment);
        if (!quote && !comment) continue; // image / ink annotations
        count++;
        const meta = [
          `${T.page}：${a.annotationPageLabel || T.unknown}`,
          `${T.type}：${a.annotationType}`,
          INCLUDE_COLOR && a.annotationColor ? `${T.color}：${a.annotationColor}` : ""
        ].filter(Boolean).join("；");
        sections.push(
          `- ${meta}\n` +
          (quote ? `  - ${T.quote}：${quote}\n` : "") +
          (comment ? `  - ${T.comment}：${comment}\n` : "")
        );
      }
    }
    if (sections.length) {
      lines.push(`## ${item.getField("title") || T.untitled}`);
      lines.push(...sections, "");
    }
  }

  if (!count) return T.none;
  const result = lines.join("\n");
  const copied = copyToClipboard(result);
  return `${T.done(count, copied)}\n\n${result.slice(0, PREVIEW_CHARS)}`;
}

return await main();
