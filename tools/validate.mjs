import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const EXPECTED = [5, 6, 3];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const text = value => typeof value === 'string' && value.trim().length > 0;
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const isWithin = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`)
    && relative !== '..' && !path.isAbsolute(relative);
};

export async function validate(root, { release = false } = {}) {
  const errors = [];
  const missing = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  } catch (error) {
    return { ok: false, complete: false, present: 0, expected: 14,
      errors: [`Cannot read manifest.json: ${error.message}`], missing: [] };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, complete: false, present: 0, expected: 14,
      errors: ['Manifest must be an object.'], missing: [] };
  }
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must equal 1.');
  if (typeof manifest.sourcePending !== 'boolean') errors.push('sourcePending must be boolean.');
  if (manifest.sourcePending !== false) missing.push('Original source recovery is pending.');
  const expectedBatches = EXPECTED.map((count, index) => ({ batch: index + 1, count }));
  if (!Array.isArray(manifest.expectedBatches) || manifest.expectedBatches.length !== 3
      || expectedBatches.some((expected, index) =>
        manifest.expectedBatches[index]?.batch !== expected.batch
        || manifest.expectedBatches[index]?.count !== expected.count)) {
    errors.push('expectedBatches must be exactly batch 1: 5, batch 2: 6, batch 3: 3.');
  }
  if (!Array.isArray(manifest.scripts)) errors.push('scripts must be an array.');
  const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
  const ids = new Set();
  const paths = new Set();
  const slots = new Set();
  const counts = [0, 0, 0];
  const rootReal = await realpath(root);

  for (const [index, script] of scripts.entries()) {
    const label = `scripts[${index}]`;
    if (!script || typeof script !== 'object' || Array.isArray(script)) {
      errors.push(`${label}: must be an object.`);
      continue;
    }
    const batch = script.original?.batch;
    const ordinal = script.original?.ordinal;
    const validSlot = Number.isInteger(batch) && batch >= 1 && batch <= 3
      && Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= EXPECTED[batch - 1];
    if (!validSlot) errors.push(`${label}: invalid original batch/ordinal.`);
    else {
      counts[batch - 1]++;
      const slot = `${batch}:${ordinal}`;
      if (slots.has(slot)) errors.push(`${label}: duplicate original slot ${slot}.`);
      slots.add(slot);
      if (script.id !== `b${batch}-${String(ordinal).padStart(2, '0')}`) {
        errors.push(`${label}: id must match its original batch/ordinal.`);
      }
    }
    if (!text(script.id)) errors.push(`${label}: missing id.`);
    if (ids.has(script.id)) errors.push(`${label}: duplicate id.`);
    ids.add(script.id);
    if (!slug(script.category)) errors.push(`${label}: invalid category slug.`);
    if (!text(script.title?.en) || !text(script.title?.['zh-CN'])) {
      errors.push(`${label}: both en and zh-CN titles are required.`);
    }
    if (typeof script.filename !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.js$/.test(script.filename)) {
      errors.push(`${label}: filename must be a lowercase hyphenated .js name.`);
    }
    const scriptPath = script.path;
    const safePath = typeof scriptPath === 'string'
      && /^scripts\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.js$/.test(scriptPath);
    if (!safePath) errors.push(`${label}: unsafe or invalid repository-relative path.`);
    if (scriptPath !== `scripts/${script.category}/${script.filename}`) {
      errors.push(`${label}: path must match category and filename.`);
    }
    if (paths.has(scriptPath)) errors.push(`${label}: duplicate path.`);
    paths.add(scriptPath);
    if (!/^[a-f0-9]{64}$/.test(script.sha256 ?? '')) errors.push(`${label}: sha256 is required.`);
    const operations = script.operations;
    if (!['read-only', 'mutating'].includes(operations?.library)
        || typeof operations?.network !== 'boolean'
        || !['none', 'read', 'write'].includes(operations?.filesystem)) {
      errors.push(`${label}: operations must declare library, network and filesystem effects.`);
    }
    const runtime = script.runtime;
    if (!['untested', 'mock-tested', 'desktop-verified'].includes(runtime?.status)) {
      errors.push(`${label}: invalid runtime status.`);
    }
    if (runtime?.status === 'desktop-verified'
        && (!/^10\.\d+(?:\.\d+)?(?:[-.][A-Za-z0-9]+)*$/.test(runtime.version ?? '')
          || !text(runtime.evidence))) {
      errors.push(`${label}: desktop-verified requires an exact Zotero 10 version and evidence.`);
    }
    if (runtime?.status === 'mock-tested' && !text(runtime.evidence)) {
      errors.push(`${label}: mock-tested requires evidence.`);
    }
    if (!safePath) continue;
    try {
      const file = await realpath(path.join(root, scriptPath));
      if (!isWithin(rootReal, file)) {
        errors.push(`${label}: script resolves outside the repository.`);
        continue;
      }
      const buffer = await readFile(file);
      if (createHash('sha256').update(buffer).digest('hex') !== script.sha256) {
        errors.push(`${label}: sha256 does not match file contents.`);
      }
      const source = buffer.toString('utf8');
      if (!source.trim()) errors.push(`${label}: script is empty.`);
      // Parse only; never invoke the resulting function or execute a library operation.
      try { new AsyncFunction(source); }
      catch (error) { errors.push(`${label}: invalid Run JavaScript async syntax: ${error.message}`); }
    } catch (error) {
      errors.push(`${label}: cannot read script: ${error.message}`);
    }
  }
  for (const [index, expected] of EXPECTED.entries()) {
    if (counts[index] !== expected) missing.push(`Batch ${index + 1}: ${counts[index]}/${expected} scripts.`);
    for (let ordinal = 1; ordinal <= expected; ordinal++) {
      if (!slots.has(`${index + 1}:${ordinal}`)) missing.push(`Missing original ${index + 1}:${ordinal}.`);
    }
  }
  if (scripts.length !== 14) missing.push(`Total: ${scripts.length}/14 scripts.`);
  // Do not allow an unlisted JavaScript file to silently bypass metadata/API review.
  async function inspect(directory, relative) {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error) {
      if (error.code === 'ENOENT') return;
      errors.push(`Cannot inspect ${relative}: ${error.message}`);
      return;
    }
    for (const entry of entries) {
      const nextRelative = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) errors.push(`Symlinks are not permitted under scripts/: ${nextRelative}`);
      else if (entry.isDirectory()) await inspect(path.join(directory, entry.name), nextRelative);
      else if (entry.name.endsWith('.js') && !paths.has(nextRelative)) {
        errors.push(`Unlisted script: ${nextRelative}`);
      }
    }
  }
  await inspect(path.join(root, 'scripts'), 'scripts');
  const complete = errors.length === 0 && missing.length === 0;
  return { ok: errors.length === 0 && (!release || complete), complete,
    present: scripts.length, expected: 14, errors, missing };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--scaffold', '--release'].includes(args[0])) {
    console.error('Usage: node tools/validate.mjs --scaffold|--release');
    process.exitCode = 2;
    return;
  }
  const release = args[0] === '--release';
  const result = await validate(process.cwd(), { release });
  console.log(`Toolkit status: ${result.complete ? 'STRUCTURALLY COMPLETE' : 'INCOMPLETE'} (${result.present}/${result.expected} scripts)`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  for (const missing of result.missing) console.log(`PENDING: ${missing}`);
  if (result.ok) console.log(release
    ? 'Release structural gate passed. This does not certify Zotero runtime compatibility.'
    : 'Scaffold integrity passed. This does not certify original-script completeness or Zotero execution.');
  else console.error(release ? 'Release gate FAILED.' : 'Scaffold integrity FAILED.');
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
