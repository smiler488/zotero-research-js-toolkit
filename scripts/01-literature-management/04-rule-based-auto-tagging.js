/**
 * 04 · Rule-based Auto Tagging (preview-first) / 基于规则的自动标签（默认仅预览）
 * ---------------------------------------------------------------------------
 * Target: Zotero 10 (10.0.x) · Mode: PREVIEW by default; WRITE (add tags only)
 *         after PREVIEW_ONLY = false AND an explicit confirmation dialog.
 *         默认仅预览；设置 PREVIEW_ONLY = false 并确认后才写入，且只添加标签。
 *
 * [EN]
 * What it does : Applies regular-expression rules to the title (or title +
 *                abstract) of each selected item and proposes hierarchical tags
 *                such as "Type/Review" or "Topic/AI". Existing tags are never
 *                removed or renamed; tags the item already has are not re-added.
 * When to use  : Building a first-pass classification of a newly imported
 *                corpus (e.g. separating reviews, datasets and methods papers,
 *                or flagging AI papers in a crop-phenotyping library).
 * How to run   : 1) Edit RULES below for your field. 2) Select items -> Tools ->
 *                Developer -> Run JavaScript -> paste -> Run and review the preview.
 *                3) Set PREVIEW_ONLY = false, run again, click "Apply".
 * Notes        : Keyword rules are heuristics; review the preview. To undo, use
 *                the tag selector to delete a tag, or the rollback log copied to
 *                the clipboard before saving. Read-only libraries are skipped.
 *                Do not use the `g` flag in RULES (it makes regex.test stateful).
 *
 * [中文]
 * 功能说明     ：用正则规则匹配每篇所选文献的标题（或标题+摘要），建议添加
 *                “类型/综述”“主题/人工智能”等层级标签。不会删除或重命名已有标签，
 *                已存在的标签不会重复添加。
 * 适用场景     ：对新导入的文献集进行初步分类，例如区分综述、数据集与方法类论文，
 *                或在作物表型文献库中标记人工智能相关论文。
 * 运行方法     ：1) 按学科修改下方 RULES；2) 选中文献 -> 工具 -> 开发者 ->
 *                Run JavaScript -> 粘贴 -> 运行，查看预览；
 *                3) 将 PREVIEW_ONLY 改为 false 后再次运行，点击“应用”。
 * 注意事项     ：关键词规则只是启发式判断，请认真核对预览。撤销时可在标签选择器中
 *                删除对应标签，或参考保存前复制到剪贴板的回滚记录。只读文献库会被跳过。
 *                RULES 中的正则不要使用 g 标志（会使 regex.test 产生状态）。
 *
 * License: MIT · https://github.com/smiler488/zotero-research-js-toolkit
 */

/* ===== Config / 配置 ===== */
const LANG = "zh";          // "zh" | "en"
const PREVIEW_ONLY = true;  // true: preview only / 仅预览; false: ask, then save / 确认后保存

// Edit for your discipline / 可按学科修改规则
const RULES = [
  { tag: "类型/综述",   regex: /\b(review|meta-analysis)\b|系统评价|综述/i, titleOnly: true },
  { tag: "类型/数据集", regex: /\b(dataset|database|benchmark)\b|数据集|数据库/i, titleOnly: true },
  { tag: "类型/方法",   regex: /\b(framework|pipeline|algorithm|workflow)\b|算法|方法框架/i, titleOnly: true },
  {
    tag: "主题/人工智能",
    regex: /machine learning|deep learning|neural network|large language model|机器学习|深度学习|大语言模型/i,
    titleOnly: false
  }
];

/* ===== Messages / 文本 ===== */
const M = {
  zh: {
    noSel: "请先在 Zotero 条目列表中选择文献。",
    badRule: t => `规则“${t}”使用了 g 或 y 标志，请删除后重试。`,
    preview: "标签预览（未修改任何数据）",
    saved: "标签已保存",
    cancelled: "已取消，未修改任何文献。",
    count: n => `匹配文献：${n} 篇`,
    skipped: n => `只读文献库中跳过：${n} 篇`,
    none: "没有新的匹配标签",
    untitled: "无标题",
    dlgTitle: "批量添加标签",
    dlgText: (n, k, p) => `将为 ${n} 篇文献添加共 ${k} 个标签（不删除任何已有标签）。\n回滚记录已复制到剪贴板。\n\n${p}\n\n是否应用？`,
    ok: "应用",
    more: n => `……另有 ${n} 篇`,
    logHint: "回滚记录（制表符分隔）已复制到剪贴板：",
    noClip: "警告：回滚记录未能复制到剪贴板，已取消写入。"
  },
  en: {
    noSel: "Please select items in the Zotero item list first.",
    badRule: t => `Rule "${t}" uses the g or y flag; remove it and retry.`,
    preview: "Tag preview (nothing was changed)",
    saved: "Tags saved",
    cancelled: "Cancelled; no items were changed.",
    count: n => `Matched items: ${n}`,
    skipped: n => `Skipped (read-only library): ${n}`,
    none: "No new matching tags.",
    untitled: "Untitled",
    dlgTitle: "Add tags in batch",
    dlgText: (n, k, p) => `${k} tag(s) will be added to ${n} item(s) (no existing tag is removed).\nA rollback log has been copied to the clipboard.\n\n${p}\n\nApply?`,
    ok: "Apply",
    more: n => `...and ${n} more`,
    logHint: "Rollback log (tab-separated) copied to the clipboard:",
    noClip: "Warning: the rollback log could not be copied to the clipboard; nothing was written."
  }
};
const T = M[LANG] || M.en;

/* ===== Helpers / 工具函数 ===== */
function getSelectedRegularItems() {
  const pane = Zotero.getActiveZoteroPane();
  if (!pane) return [];
  return pane.getSelectedItems().filter(i => i.isRegularItem() && !i.deleted);
}

function isEditable(item) {
  try { return !!Zotero.Libraries.get(item.libraryID).editable; }
  catch (e) { return false; }
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

function confirmWrite(title, text, okLabel) {
  const win = Zotero.getMainWindow();
  const ps = typeof Services !== "undefined" ? Services.prompt : null;
  if (ps && typeof ps.confirmEx === "function") {
    const flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_CANCEL
      + ps.BUTTON_POS_1_DEFAULT
      + ps.BUTTON_DELAY_ENABLE;
    return ps.confirmEx(win, title, text, flags, okLabel, null, null, null, {}) === 0;
  }
  return !!(win && win.confirm(`${title}\n\n${text}`));
}

/* ===== Main / 主程序 ===== */
async function main() {
  const bad = RULES.find(r => r.regex.global || r.regex.sticky);
  if (bad) return T.badRule(bad.tag);

  const items = getSelectedRegularItems();
  if (!items.length) return T.noSel;

  const plan = [];
  let skipped = 0;

  for (const item of items) {
    const title = item.getField("title") || "";
    const abstract = item.getField("abstractNote") || "";
    const existing = new Set(item.getTags().map(t => t.tag));
    const newTags = RULES
      .filter(rule => rule.regex.test(rule.titleOnly ? title : `${title} ${abstract}`))
      .map(rule => rule.tag)
      .filter(tag => !existing.has(tag));
    if (!newTags.length) continue;
    if (!isEditable(item)) { skipped++; continue; }
    plan.push({ item, title: title || T.untitled, newTags });
  }

  const lines = plan.map(p => `${p.title}\n→ ${p.newTags.join(", ")}`);
  const summary = [T.count(plan.length), skipped ? T.skipped(skipped) : ""].filter(Boolean).join("\n");

  if (PREVIEW_ONLY || !plan.length) {
    return `${T.preview}\n${summary}\n\n${lines.join("\n\n") || T.none}`;
  }

  const log = ["libraryID\titemKey\taddedTags",
    ...plan.map(p => `${p.item.libraryID}\t${p.item.key}\t${p.newTags.join("; ")}`)].join("\n");
  if (!copyToClipboard(log)) return T.noClip;

  const tagCount = plan.reduce((s, p) => s + p.newTags.length, 0);
  const shown = lines.slice(0, 8).join("\n") + (lines.length > 8 ? `\n${T.more(lines.length - 8)}` : "");
  if (!confirmWrite(T.dlgTitle, T.dlgText(plan.length, tagCount, shown), T.ok)) return T.cancelled;

  await Zotero.DB.executeTransaction(async () => {
    for (const p of plan) {
      for (const tag of p.newTags) p.item.addTag(tag);
      await p.item.save();
    }
  });

  return `${T.saved}\n${summary}\n\n${lines.join("\n\n")}\n\n${T.logHint}\n${log}`;
}

return await main();
