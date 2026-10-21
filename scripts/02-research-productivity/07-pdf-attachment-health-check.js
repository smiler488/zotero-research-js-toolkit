/**
 * 07 · PDF Attachment Health Check / PDF 附件体检
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : For each selected item, reports whether it has a PDF
 *                attachment and whether each PDF file exists on this computer
 *                (stored copy or linked file). The report is copied to the clipboard.
 * When to use  : Before going offline (fieldwork, travel), before running
 *                script 12 (PDF keyword search), after moving a linked-files
 *                folder, or after changing sync/storage settings.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste -> Run.
 * Notes        : "Not available locally" can simply mean that a synced file has
 *                not been downloaded yet ("download files as needed"), or that a
 *                linked file was moved; it does not prove the file is lost.
 *                Open the attachment once, or use "Find Available PDF", to fix it.
 *
 * [中文]
 * 功能说明     ：逐篇报告所选文献是否关联 PDF，以及每个 PDF 文件（存储副本或链接
 *                文件）在本机是否存在。报告会复制到剪贴板。
 * 适用场景     ：离线前（野外调查、出差）、运行脚本 12（PDF 关键词检索）前、
 *                移动链接文件目录后，或修改同步/存储设置后。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行。
 * 注意事项     ：“本地不可用”可能只是同步文件尚未下载（“按需下载文件”），或链接
 *                文件被移动，并不代表文件已丢失。可双击打开一次附件，或使用
 *                “查找可用 PDF”进行修复。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh"; // "zh" | "en"

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先选中需要检查的文献记录。",
    untitled: "无标题",
    head: "Zotero PDF 附件体检报告",
    checked: n => `检查文献：${n} 篇`,
    ok: n => `本地可用 PDF：${n} 个`,
    noPDF: n => `未关联 PDF：${n} 篇`,
    bad: n => `本地不可用 PDF：${n} 个（可能尚未下载或链接文件已移动）`,
    secNo: "【未关联 PDF】",
    secBad: "【需要排查的 PDF】",
    fail: m => `检查失败：${m}`,
    linked: "链接文件", stored: "存储文件",
    copied: "（报告已复制到剪贴板）"
  },
  en: {
    noSel: "Please select the items to check first.",
    untitled: "Untitled",
    head: "Zotero PDF attachment health report",
    checked: n => `Items checked: ${n}`,
    ok: n => `PDFs available locally: ${n}`,
    noPDF: n => `Items without a PDF: ${n}`,
    bad: n => `PDFs not available locally: ${n} (possibly not downloaded yet, or a linked file was moved)`,
    secNo: "[Items without a PDF]",
    secBad: "[PDFs to investigate]",
    fail: m => `check failed: ${m}`,
    linked: "linked file", stored: "stored file",
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

/* ===== Main / 主程序 ===== */
async function main() {
  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const noPDF = [];
  const unavailable = [];
  let available = 0;

  for (const item of items) {
    const title = item.getField("title") || T.untitled;
    const pdfs = Zotero.Items.get(item.getAttachments()).filter(isPDF);
    if (!pdfs.length) { noPDF.push(title); continue; }

    for (const pdf of pdfs) {
      const kind = pdf.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_FILE ? T.linked : T.stored;
      try {
        if (await pdf.fileExists()) available++;
        else unavailable.push(`${title}（${kind}, Key: ${pdf.key}）`);
      } catch (e) {
        unavailable.push(`${title}（${T.fail(e.message)}）`);
      }
    }
  }

  const report = [
    T.head,
    T.checked(items.length),
    T.ok(available),
    T.noPDF(noPDF.length),
    T.bad(unavailable.length),
    "",
    T.secNo,
    ...noPDF.map(t => "• " + t),
    "",
    T.secBad,
    ...unavailable.map(t => "• " + t)
  ].join("\n");

  return copyToClipboard(report) ? `${report}\n\n${T.copied}` : report;
}

return await main();
