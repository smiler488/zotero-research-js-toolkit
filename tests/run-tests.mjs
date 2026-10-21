// Run: node --test tests/   (Node >= 18)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv, runScript, LINK_MODE_LINKED_FILE } from "./zotero-mock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = rel => path.join(ROOT, "scripts", rel);
const LM = n => S(`01-literature-management/${n}`);
const RP = n => S(`02-research-productivity/${n}`);
const RM = n => S(`03-research-mining/${n}`);
const EN = { 'const LANG = "zh";': 'const LANG = "en";' };

function pdf(env, id, extra = {}) {
  return env.item({ id, itemType: "attachment", contentType: "application/pdf", fileExists: true, ...extra });
}

// ---------- 01 metadata completeness ----------
test("01 metadata check flags missing fields and accepts DOI in Extra", async () => {
  const env = createEnv();
  pdf(env, 101);
  const a = env.item({ id: 1, fields: { title: "Complete", date: "2020", abstractNote: "x", DOI: "10.1/abc" }, creators: [{ lastName: "Li" }], attachments: [101] });
  const b = env.item({ id: 2, fields: { title: "Extra DOI", date: "2021", abstractNote: "x", extra: "DOI: 10.2/xyz" }, creators: [{ lastName: "Wu" }] });
  const c = env.item({ id: 3, fields: {} });
  env.registry.selected = [a, b, c];
  const out = await runScript(LM("01-metadata-completeness-check.js"), env);
  assert.match(out, /检查文献：3 篇/);
  assert.match(out, /存在待检查问题：2 篇/);
  const extraBlock = out.split("\n\n").find(b => b.startsWith("【Extra DOI】")) || "";
  assert.doesNotMatch(extraBlock, /未填写 DOI/);
  assert.match(out, /【未命名文献】[\s\S]*缺少标题/);
  assert.equal(env.registry.saves.length, 0);
});

test("01 handles empty selection and English output", async () => {
  const env = createEnv();
  const out = await runScript(LM("01-metadata-completeness-check.js"), env, EN);
  assert.match(out, /select items/);
});

// ---------- 02 duplicates ----------
test("02 groups DOIs that differ only by prefix/case, and same title+year", async () => {
  const env = createEnv();
  const a = env.item({ id: 1, fields: { title: "Leaf BRDF model", date: "2023-05-01", DOI: "https://doi.org/10.1016/J.X.2023" } });
  const b = env.item({ id: 2, fields: { title: "Leaf BRDF Model.", date: "May 2023", DOI: "doi:10.1016/j.x.2023" } });
  const c = env.item({ id: 3, fields: { title: "Other", date: "2019" } });
  env.registry.selected = [a, b, c];
  const out = await runScript(LM("02-duplicate-candidates-finder.js"), env);
  assert.match(out, /DOI 相同：10\.1016\/j\.x\.2023/);
  assert.match(out, /标题和年份相同：2023:leafbrdfmodel/);
  assert.doesNotMatch(out, /Other/);
});

// ---------- 03 DOI cleanup ----------
const DOI_ITEMS = env => {
  const a = env.item({ id: 1, itemType: "conferencePaper", fields: { DOI: "https://doi.org/10.1234/abc" } });
  const b = env.item({ id: 2, fields: { DOI: "10.5555/ok" } });
  const c = env.item({ id: 3, fields: { DOI: "doi: not-a-doi" } });
  const d = env.item({ id: 4, libraryID: 2, fields: { DOI: "doi:10.9999/ro" } });
  env.registry.selected = [a, b, c, d];
  return { a, d };
};

test("03 preview mode never writes", async () => {
  const env = createEnv({ confirmIndex: 0 });
  DOI_ITEMS(env);
  const out = await runScript(LM("03-doi-cleanup-preview.js"), env);
  assert.match(out, /预览/);
  assert.match(out, /可清洗 DOI：1 条/);
  assert.match(out, /只读文献库中跳过：1 条/);
  assert.equal(env.registry.saves.length, 0);
  assert.equal(env.registry.dialogs.length, 0);
});

test("03 write mode + Cancel (default/Esc) writes nothing", async () => {
  const env = createEnv({ confirmIndex: 1 });
  DOI_ITEMS(env);
  const out = await runScript(LM("03-doi-cleanup-preview.js"), env, { "const PREVIEW_ONLY = true;": "const PREVIEW_ONLY = false;" });
  assert.match(out, /已取消/);
  assert.equal(env.registry.saves.length, 0);
  assert.match(env.registry.clipboard, /KEY1\tDOI\thttps:\/\/doi.org\/10.1234\/abc\t10.1234\/abc/);
});

test("03 write mode + Apply saves in one transaction, skips read-only", async () => {
  const env = createEnv({ confirmIndex: 0 });
  const { a, d } = DOI_ITEMS(env);
  await runScript(LM("03-doi-cleanup-preview.js"), env, { "const PREVIEW_ONLY = true;": "const PREVIEW_ONLY = false;" });
  assert.equal(a.getField("DOI"), "10.1234/abc");
  assert.equal(d.getField("DOI"), "doi:10.9999/ro");
  assert.deepEqual(env.registry.saves, [1]);
  assert.equal(env.registry.transactions, 1);
  const flags = env.registry.dialogs[0].flags;
  assert.ok(flags & (1 << 24), "Cancel must be the default button");
});

test("03 refuses to write when rollback log cannot be copied", async () => {
  const env = createEnv({ confirmIndex: 0, clipboardFails: true });
  DOI_ITEMS(env);
  const out = await runScript(LM("03-doi-cleanup-preview.js"), env, { "const PREVIEW_ONLY = true;": "const PREVIEW_ONLY = false;" });
  assert.match(out, /警告/);
  assert.equal(env.registry.saves.length, 0);
});

// ---------- 04 auto tagging ----------
test("04 preview proposes tags without writing; apply adds only new tags", async () => {
  const mk = env => {
    const a = env.item({ id: 1, fields: { title: "A review of UAV phenotyping", abstractNote: "deep learning based" }, tags: ["类型/综述"] });
    const b = env.item({ id: 2, fields: { title: "A dataset for wheat", abstractNote: "" } });
    env.registry.selected = [a, b];
    return { a, b };
  };
  let env = createEnv({ confirmIndex: 0 });
  mk(env);
  let out = await runScript(LM("04-rule-based-auto-tagging.js"), env);
  assert.match(out, /主题\/人工智能/);
  assert.match(out, /类型\/数据集/);
  assert.equal(env.registry.saves.length, 0);

  env = createEnv({ confirmIndex: 0 });
  const { a, b } = mk(env);
  await runScript(LM("04-rule-based-auto-tagging.js"), env, { "const PREVIEW_ONLY = true;": "const PREVIEW_ONLY = false;" });
  assert.deepEqual(a.getTags().map(t => t.tag).sort(), ["主题/人工智能", "类型/综述"].sort());
  assert.deepEqual(b.getTags().map(t => t.tag), ["类型/数据集"]);
  assert.equal(env.registry.saves.length, 2);
});

test("04 rejects regex rules with the g flag", async () => {
  const env = createEnv();
  env.registry.selected = [env.item({ id: 1, fields: { title: "x" } })];
  const out = await runScript(LM("04-rule-based-auto-tagging.js"), env,
    { "regex: /\\b(review|meta-analysis)\\b|系统评价|综述/i,": "regex: /review/gi," });
  assert.match(out, /g 或 y 标志/);
});

// ---------- 05 DOI batch fix ----------
test("05 only journal articles; Cancel writes nothing; Apply writes", async () => {
  const mk = env => {
    const j = env.item({ id: 1, fields: { DOI: "DOI: 10.1000/j1" } });
    const c = env.item({ id: 2, itemType: "conferencePaper", fields: { DOI: "doi:10.1000/c1" } });
    env.registry.selected = [j, c];
    return { j, c };
  };
  let env = createEnv({ confirmIndex: 1 });
  mk(env);
  let out = await runScript(LM("05-doi-batch-fix-confirm.js"), env);
  assert.match(out, /已取消/);
  assert.equal(env.registry.saves.length, 0);

  env = createEnv({ confirmIndex: 0 });
  const { j, c } = mk(env);
  out = await runScript(LM("05-doi-batch-fix-confirm.js"), env);
  assert.match(out, /已规范 1 条/);
  assert.equal(j.getField("DOI"), "10.1000/j1");
  assert.equal(c.getField("DOI"), "doi:10.1000/c1");
});

test("05 all-read-only selection reports and does not prompt", async () => {
  const env = createEnv({ confirmIndex: 0 });
  env.registry.selected = [env.item({ id: 1, libraryID: 2, fields: { DOI: "doi:10.1000/x" } })];
  const out = await runScript(LM("05-doi-batch-fix-confirm.js"), env);
  assert.match(out, /只读/);
  assert.equal(env.registry.dialogs.length, 0);
});

// ---------- 06 LLM prompt ----------
test("06 builds prompt, caps item count, copies to clipboard", async () => {
  const env = createEnv();
  env.registry.selected = Array.from({ length: 12 }, (_, i) =>
    env.item({ id: i + 1, fields: { title: `Paper ${i + 1}`, abstractNote: "abc  def" } }));
  const out = await runScript(RP("06-llm-review-prompt-builder.js"), env);
  assert.match(out, /仅纳入前 10 篇/);
  assert.match(env.registry.clipboard, /【文献 10】/);
  assert.doesNotMatch(env.registry.clipboard, /【文献 11】/);
  const en = await runScript(RP("06-llm-review-prompt-builder.js"), env, EN);
  assert.match(en, /\[Ref 1\]/);
});

// ---------- 07 PDF health ----------
test("07 counts available, missing, unavailable and failing PDFs", async () => {
  const env = createEnv();
  pdf(env, 101);
  pdf(env, 102, { fileExists: false, linkMode: LINK_MODE_LINKED_FILE });
  pdf(env, 103, { fileExists: new Error("boom") });
  env.registry.selected = [
    env.item({ id: 1, fields: { title: "Has" }, attachments: [101] }),
    env.item({ id: 2, fields: { title: "Broken" }, attachments: [102, 103] }),
    env.item({ id: 3, fields: { title: "None" } })
  ];
  const out = await runScript(RP("07-pdf-attachment-health-check.js"), env);
  assert.match(out, /本地可用 PDF：1 个/);
  assert.match(out, /未关联 PDF：1 篇/);
  assert.match(out, /本地不可用 PDF：2 个/);
  assert.match(out, /链接文件/);
  assert.match(out, /boom/);
});

// ---------- 08 reference quality ----------
test("08 checks journal-specific fields only for journal articles", async () => {
  const env = createEnv();
  env.registry.selected = [
    env.item({ id: 1, fields: { title: "J", date: "2020", publicationTitle: "Plant Phenomics", abstractNote: "a", DOI: "10.1/x", pages: "1" }, creators: [{ lastName: "Z" }] }),
    env.item({ id: 2, itemType: "book", fields: { title: "B", date: "2020" }, creators: [{ lastName: "Y" }] })
  ];
  const out = await runScript(RP("08-reference-quality-check.js"), env);
  assert.match(out, /需人工核对：1 篇/);
  assert.match(out, /【J】\n• 缺少卷号/);
});

// ---------- 09 annotations ----------
test("09 exports text annotations in reading order, skips ink/image", async () => {
  const env = createEnv();
  const ann = (sort, type, text, comment) => ({ annotationSortIndex: sort, annotationType: type, annotationText: text, annotationComment: comment, annotationPageLabel: "3", annotationColor: "#ffd400" });
  pdf(env, 101, { annotations: [ann("00002", "highlight", "second", ""), ann("00001", "highlight", "first", "why?"), ann("00003", "ink", "", "")] });
  env.item({ id: 102, itemType: "attachment", contentType: "application/epub+zip", annotations: [ann("1", "underline", "epub text", "")] });
  env.registry.selected = [env.item({ id: 1, fields: { title: "Annotated" }, attachments: [101, 102] })];
  const out = await runScript(RP("09-annotation-export-markdown.js"), env);
  assert.match(out, /已提取 3 条文字批注/);
  const clip = env.registry.clipboard;
  assert.ok(clip.indexOf("first") < clip.indexOf("second"));
  assert.match(clip, /评论：why\?/);
  assert.match(clip, /epub text/);
});

// ---------- 10 review matrix ----------
test("10 builds a valid Markdown table with escaped pipes and first author", async () => {
  const env = createEnv();
  env.registry.selected = [env.item({
    id: 1, fields: { title: "A | B", date: "Spring 2018", publicationTitle: "J", abstractNote: "x".repeat(349) + "|tail" },
    creators: [{ creatorType: "editor", lastName: "Ed" }, { creatorType: "author", lastName: "Deng" }]
  })];
  const out = await runScript(RP("10-review-matrix-markdown.js"), env);
  const row = env.registry.clipboard.split("\n")[2];
  assert.match(row, /^\| 1 \| 2018 \| Deng \| A \\\| B \|/);
  assert.doesNotMatch(row, /\\ \|$/, "no dangling backslash before last border");
  assert.match(out, /已生成 1 篇/);
});

// ---------- 11 similar tags ----------
test("11 groups tags differing by case, width, whitespace and hyphen", async () => {
  const env = createEnv();
  env.registry.selected = [
    env.item({ id: 1, tags: ["Remote sensing", "LAI"] }),
    env.item({ id: 2, tags: ["remote-sensing", "Ｌａｉ", "photosynthesis"] })
  ];
  const out = await runScript(RP("11-similar-tags-check.js"), env);
  assert.match(out, /疑似重复标签组：2/);
  assert.match(out, /Remote sensing \/ remote-sensing/);
});

// ---------- 12 PDF keyword context ----------
test("12 finds keyword context, counts empty text and read failures", async () => {
  const env = createEnv();
  pdf(env, 101, { text: "Plants grew at 25 °C. Nitrogen was 120 kg/ha. NITROGEN again. nitrogen third. nitrogen fourth." });
  pdf(env, 102, { text: "" });
  pdf(env, 103, { text: new Error("index error") });
  env.registry.selected = [env.item({ id: 1, fields: { title: "Field trial", DOI: "10.1/f" }, attachments: [101, 102, 103] })];
  const out = await runScript(RM("12-pdf-keyword-context-search.js"), env);
  assert.match(out, /可读 PDF 1 个/);
  assert.match(out, /无文本 1 个/);
  assert.match(out, /读取失败 1 个/);
  const n = (env.registry.clipboard.match(/关键词：nitrogen/g) || []).length;
  assert.equal(n, 3, "MAX_HITS caps hits per keyword");
  assert.match(env.registry.clipboard, /关键词：°C/);
});

// ---------- 13 screening ----------
test("13 classifies records and guards CSV formula injection", async () => {
  const env = createEnv();
  env.registry.selected = [
    env.item({ id: 1, fields: { title: "Random forests for crop yield", abstractNote: "We use random forest for yield prediction." } }),
    env.item({ id: 2, fields: { title: "A systematic review of ML", abstractNote: "machine learning crop yield" } }),
    env.item({ id: 3, fields: { title: "=HYPERLINK(\"x\")", abstractNote: "nothing" } }),
    env.item({ id: 4, fields: { title: "No abstract" } })
  ];
  const out = await runScript(RM("13-title-abstract-screening-csv.js"), env);
  assert.match(out, /优先人工复核：1 篇/);
  assert.match(out, /疑似排除：1 篇/);
  assert.match(out, /信息不足：1 篇/);
  assert.match(env.registry.clipboard, /"'=HYPERLINK\(""x""\)"/);
});

// ---------- 14 topic trend ----------
test("14 counts topics per year with whole-word matching", async () => {
  const env = createEnv();
  env.registry.selected = [
    env.item({ id: 1, fields: { title: "MANOVA of yield", date: "2015" } }),
    env.item({ id: 2, fields: { title: "UAVs and deep learning", date: "2022-01-01" } }),
    env.item({ id: 3, fields: { title: "ANOVA", date: "2015" } }),
    env.item({ id: 4, fields: { title: "No year" } })
  ];
  const out = await runScript(RM("14-topic-trend-by-year-csv.js"), env);
  assert.match(out, /无年份未计入/);
  const csv = env.registry.clipboard.split("\n");
  assert.equal(csv[0], "Year,Total,传统统计,机器学习,深度学习,遥感");
  assert.equal(csv[1], "2015,2,1,0,0,0");
  assert.equal(csv[2], "2022,1,0,0,1,1");
});

// ---------- Global invariants ----------
import fs from "node:fs";
const ALL = fs.readdirSync(path.join(ROOT, "scripts"), { recursive: true })
  .filter(f => f.endsWith(".js")).map(f => path.join(ROOT, "scripts", f));

test("repository contains exactly 14 scripts (5 + 6 + 3)", () => {
  assert.equal(ALL.length, 14);
  const count = d => ALL.filter(f => f.includes(d)).length;
  assert.deepEqual([count("01-literature"), count("02-research"), count("03-research")], [5, 6, 3]);
});

for (const f of ALL) {
  const name = path.basename(f);
  test(`${name}: bilingual header, async entry point, no destructive API`, () => {
    const code = fs.readFileSync(f, "utf8");
    const body = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); // strip comments
    for (const h of ["[EN]", "[中文]", "When to use", "适用场景", "How to run", "运行方法", "Notes", "注意事项", "License: MIT"]) {
      assert.ok(code.includes(h), `${name} header missing "${h}"`);
    }
    assert.match(code, /return await main\(\);\s*$/);
    assert.doesNotMatch(body, /\.(erase|eraseTx|trash|trashTx|removeTag|setCreators|deleteSelection)\s*\(/);
    assert.doesNotMatch(body, /getSelectedLibraryID\(|getCollectionTreeRow\(|getSelectedCollection\(|\.collectionTreeRow\b|canEdit\(/,
      "uses Zotero 10-removed single-selection getters");
    const writes = /\.(setField|addTag)\(/.test(code);
    if (writes) assert.match(code, /confirmWrite\(/, `${name} writes without confirmation`);
  });
}
