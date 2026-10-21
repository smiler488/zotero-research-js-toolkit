/**
 * 06 · LLM Literature-Review Prompt Builder / 大模型文献综述提示词生成
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: READ-ONLY / 只读
 *
 * [EN]
 * What it does : Builds an evidence-constrained prompt from the title, date, DOI
 *                and abstract of up to MAX_ITEMS selected items, returns it and
 *                copies it to the clipboard for pasting into an LLM chat.
 *                The prompt asks the model to cite [Ref n], mark gaps as
 *                "insufficient information", and not invent results.
 * When to use  : Drafting a comparison table or research-gap analysis for a
 *                small, focused set of papers (e.g. 5-10 canopy photosynthesis
 *                or UAV phenotyping papers) before reading them in full.
 * How to run   : Select items -> Tools -> Developer -> Run JavaScript -> paste
 *                -> Run -> paste the clipboard content into your LLM.
 * Notes        : Nothing is sent over the network by this script. Abstracts are
 *                not full texts; treat the model's output as a reading aid and
 *                verify every claim against the papers. Check the licence or
 *                institutional policy before pasting abstracts into a cloud LLM.
 *
 * [中文]
 * 功能说明     ：根据所选文献（最多 MAX_ITEMS 篇）的标题、日期、DOI 与摘要，生成带
 *                证据约束的提示词，返回结果并复制到剪贴板，可直接粘贴到大模型对话。
 *                提示词要求模型使用【文献编号】标注依据、对缺乏证据处标记“信息不足”、
 *                不得编造结果。
 * 适用场景     ：在精读前，为一小组主题集中的文献（如 5-10 篇冠层光合或无人机表型
 *                文献）快速生成比较表与研究空白分析的初稿。
 * 运行方法     ：选中文献 -> 工具 -> 开发者 -> Run JavaScript -> 粘贴 -> 运行 ->
 *                将剪贴板内容粘贴到大模型中。
 * 注意事项     ：本脚本不进行任何网络传输。摘要不等于全文，模型输出仅作阅读辅助，
 *                所有结论需对照原文核实。将摘要粘贴到云端大模型前，请确认版权与
 *                所在机构的数据政策。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";           // "zh" | "en" — language of the prompt / 提示词语言
const MAX_ITEMS = 10;        // max items included / 最多纳入文献数
const MAX_ABSTRACT_CHARS = 3000;

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 中选择文献。",
    unknownTitle: "未知标题", unknownDate: "未知日期", none: "未提供", noAbs: "未提供摘要",
    ref: (i, t, d, doi, a) => `【文献 ${i}】\n标题：${t}\n日期：${d}\nDOI：${doi}\n摘要：${a}`,
    truncated: (n, m) => `（已选择 ${n} 篇，仅纳入前 ${m} 篇。）`,
    copied: "提示词已复制到剪贴板。",
    prompt: refs => `你是一名专业的科研文献分析助手。
请根据下面提供的文献信息完成：
1. 概括这些文献的共同研究问题。
2. 比较研究方法、数据来源和技术路线。
3. 总结可以从摘要证实的主要发现。
4. 分析不同研究结论的相同点和差异。
5. 识别尚未充分解决的研究问题。
6. 提出三个值得继续研究的科学问题。
要求：
- 使用【文献编号】标注依据。
- 不得编造文献、数据或实验结果。
- 缺少证据的地方明确标记“信息不足”。
- 不得将摘要中未报告的结果当作事实。
- 先输出比较表格，再进行综合分析。
以下是参考文献：
${refs}`
  },
  en: {
    noSel: "Please select items in Zotero first.",
    unknownTitle: "Unknown title", unknownDate: "Unknown date", none: "Not provided", noAbs: "No abstract provided",
    ref: (i, t, d, doi, a) => `[Ref ${i}]\nTitle: ${t}\nDate: ${d}\nDOI: ${doi}\nAbstract: ${a}`,
    truncated: (n, m) => `(${n} items selected; only the first ${m} are included.)`,
    copied: "The prompt has been copied to the clipboard.",
    prompt: refs => `You are a professional research-literature analysis assistant.
Based on the references below:
1. Summarize the research question these papers share.
2. Compare their methods, data sources and technical approaches.
3. Summarize the main findings that the abstracts support.
4. Analyse agreements and differences among their conclusions.
5. Identify research questions that remain insufficiently addressed.
6. Propose three scientific questions worth further study.
Requirements:
- Cite evidence as [Ref n].
- Do not invent references, data or experimental results.
- Explicitly mark anything without evidence as "insufficient information".
- Do not treat results not reported in the abstracts as facts.
- Output a comparison table first, then the synthesis.
References:
${refs}`
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

/* ===== Main / 主程序 ===== */
async function main() {
  const all = getSelectedRegularItems();
  if (!all.length) return T.noSel;
  const items = all.slice(0, MAX_ITEMS);

  const references = items.map((item, index) => {
    const abstract = (item.getField("abstractNote") || "")
      .replace(/\s+/g, " ")
      .slice(0, MAX_ABSTRACT_CHARS);
    return T.ref(
      index + 1,
      item.getField("title") || T.unknownTitle,
      item.getField("date") || T.unknownDate,
      item.getField("DOI") || T.none,
      abstract || T.noAbs
    );
  }).join("\n\n");

  const prompt = T.prompt(references);
  const copied = copyToClipboard(prompt);
  const notes = [all.length > MAX_ITEMS ? T.truncated(all.length, MAX_ITEMS) : "", copied ? T.copied : ""]
    .filter(Boolean).join("\n");
  return notes ? `${notes}\n\n${prompt}` : prompt;
}

return await main();
