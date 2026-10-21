import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validate } from '../tools/validate.mjs';

const digest = source => createHash('sha256').update(source).digest('hex');
const initial = () => ({ schemaVersion: 1, sourcePending: true,
  expectedBatches: [{ batch: 1, count: 5 }, { batch: 2, count: 6 }, { batch: 3, count: 3 }], scripts: [] });

async function fixture(t, { complete = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zotero-validator-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = initial();
  const save = () => writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  if (complete) {
    manifest.sourcePending = false;
    await mkdir(path.join(root, 'scripts/fixtures'), { recursive: true });
    for (const { batch, count } of manifest.expectedBatches) {
      for (let ordinal = 1; ordinal <= count; ordinal++) {
        const id = `b${batch}-${String(ordinal).padStart(2, '0')}`;
        const source = `// Synthetic parser fixture; never an original toolkit script.\nawait Promise.resolve();\nreturn ${ordinal};\n`;
        const script = { id, original: { batch, ordinal }, category: 'fixtures',
          filename: `${id}.js`, path: `scripts/fixtures/${id}.js`,
          title: { en: 'Synthetic fixture', 'zh-CN': '合成校验样例' }, sha256: digest(source),
          operations: { library: 'read-only', network: false, filesystem: 'none' },
          runtime: { status: 'untested' } };
        manifest.scripts.push(script);
        await writeFile(path.join(root, script.path), source);
      }
    }
  }
  await save();
  return { root, manifest, save };
}

test('pending source is valid scaffold but fails the release gate', async t => {
  const { root } = await fixture(t);
  const scaffold = await validate(root);
  assert.equal(scaffold.ok, true);
  assert.equal(scaffold.complete, false);
  assert.equal(scaffold.present, 0);
  const release = await validate(root, { release: true });
  assert.equal(release.ok, false);
  assert.match(release.missing.join('\n'), /Original source recovery is pending/);
});

test('14 synthetic fixtures accept top-level await and return without execution', async t => {
  const { root } = await fixture(t, { complete: true });
  const result = await validate(root, { release: true });
  assert.deepEqual(result.errors, []);
  assert.equal(result.complete, true);
  assert.equal(result.ok, true);
});

test('claiming source recovery cannot hide a missing original', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  const removed = manifest.scripts.pop();
  await rm(path.join(root, removed.path));
  await save();
  const result = await validate(root, { release: true });
  assert.equal(result.ok, false);
  assert.match(result.missing.join('\n'), /Batch 3: 2\/3/);
  assert.match(result.missing.join('\n'), /Missing original 3:3/);
});

test('altering expected counts cannot relax the 5+6+3 contract', async t => {
  const { root, manifest, save } = await fixture(t);
  manifest.expectedBatches[0].count = 0;
  await save();
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /expectedBatches/);
});

test('duplicate IDs, paths and original slots are rejected', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  manifest.scripts[1] = structuredClone(manifest.scripts[0]);
  await save();
  const result = await validate(root);
  assert.equal(result.ok, false);
  for (const word of ['duplicate id', 'duplicate path', 'duplicate original slot']) {
    assert.ok(result.errors.some(error => error.includes(word)), word);
  }
});

test('batch/ordinal must agree with stable identity', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  manifest.scripts[0].id = 'b2-01';
  await save();
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /id must match/);
});

test('traversal and absolute script paths are rejected before file reads', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  for (const badPath of ['../outside.js', '/tmp/outside.js', 'scripts/fixtures/../../outside.js', 'scripts\\fixtures\\x.js']) {
    manifest.scripts[0].path = badPath;
    await save();
    const result = await validate(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /unsafe or invalid/);
  }
});

test('symlinks cannot introduce scripts outside the repository', async t => {
  const { root, manifest } = await fixture(t, { complete: true });
  const externalRoot = await mkdtemp(path.join(os.tmpdir(), 'zotero-external-'));
  t.after(() => rm(externalRoot, { recursive: true, force: true }));
  const external = path.join(externalRoot, 'external.js');
  await writeFile(external, 'return 1;');
  const scriptFile = path.join(root, manifest.scripts[0].path);
  await rm(scriptFile);
  await symlink(external, scriptFile);
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /outside the repository/);
});

test('modified bytes fail SHA-256 verification', async t => {
  const { root, manifest } = await fixture(t, { complete: true });
  await writeFile(path.join(root, manifest.scripts[0].path), 'return "changed";');
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /sha256 does not match/);
});

test('invalid JavaScript fails parsing even with a matching hash', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  const source = 'await }';
  await writeFile(path.join(root, manifest.scripts[0].path), source);
  manifest.scripts[0].sha256 = digest(source);
  await save();
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /invalid Run JavaScript async syntax/);
});

test('required bilingual metadata, effects and runtime evidence are checked', async t => {
  const { root, manifest, save } = await fixture(t, { complete: true });
  const script = manifest.scripts[0];
  delete script.title['zh-CN'];
  delete script.operations.network;
  script.runtime = { status: 'desktop-verified', version: '10' };
  await save();
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /both en and zh-CN/);
  assert.match(result.errors.join('\n'), /operations must declare/);
  assert.match(result.errors.join('\n'), /exact Zotero 10 version and evidence/);
});

test('unlisted JavaScript cannot bypass the manifest', async t => {
  const { root } = await fixture(t, { complete: true });
  await writeFile(path.join(root, 'scripts/fixtures/unlisted.js'), 'return null;');
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Unlisted script/);
});

test('malformed manifest returns a clear failed result', async t => {
  const { root } = await fixture(t);
  await writeFile(path.join(root, 'manifest.json'), '{ broken');
  const result = await validate(root);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Cannot read manifest/);
});
