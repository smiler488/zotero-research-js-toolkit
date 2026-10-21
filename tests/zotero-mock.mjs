// Minimal mock of the Zotero 10 JavaScript API surface used by the toolkit.
// It is NOT Zotero: it reproduces documented behaviour closely enough to run
// every script end-to-end in Node and check its logic and safety guarantees
// (no writes in preview mode, no writes on cancel, read-only libraries skipped).
import fs from "node:fs";
import vm from "node:vm";

export const LINK_MODE_IMPORTED_FILE = 0;
export const LINK_MODE_LINKED_FILE = 2;

function multipartDate(raw) {
  // Zotero returns "YYYY-MM-DD original" for getField('date', true, true)
  if (!raw) return "";
  const m = String(raw).match(/(\d{4})/);
  return `${m ? m[1] : "0000"}-00-00 ${raw}`;
}

export class MockItem {
  constructor(registry, opts) {
    this._r = registry;
    Object.assign(this, {
      id: opts.id,
      key: opts.key || `KEY${opts.id}`,
      itemType: opts.itemType || "journalArticle",
      libraryID: opts.libraryID ?? 1,
      deleted: !!opts.deleted,
      _fields: { ...(opts.fields || {}) },
      _creators: opts.creators || [],
      _tags: (opts.tags || []).map(t => ({ tag: t, type: 0 })),
      _attachments: opts.attachments || [],
      _annotations: opts.annotations || [],
      _fileExists: opts.fileExists,
      _text: opts.text,
      attachmentContentType: opts.contentType || "",
      attachmentLinkMode: opts.linkMode ?? LINK_MODE_IMPORTED_FILE,
      saved: 0,
      fieldWrites: []
    });
    registry.items.set(this.id, this);
  }
  isRegularItem() { return !["attachment", "note", "annotation"].includes(this.itemType); }
  isAttachment() { return this.itemType === "attachment"; }
  isFileAttachment() { return this.isAttachment(); }
  isPDFAttachment() { return this.isAttachment() && this.attachmentContentType === "application/pdf"; }
  isEPUBAttachment() { return this.isAttachment() && this.attachmentContentType === "application/epub+zip"; }
  isSnapshotAttachment() { return this.isAttachment() && this.attachmentContentType === "text/html"; }
  getField(name, unformatted, includeBaseMapped) {
    const v = this._fields[name] ?? "";
    if (name === "date" && unformatted && includeBaseMapped) return multipartDate(v);
    return v;
  }
  setField(name, value) {
    if (this._r.inTransaction === false && this._r.requireTx) throw new Error("not in tx");
    this.fieldWrites.push([name, value]);
    this._fields[name] = value;
  }
  getCreators() {
    return this._creators.map(c => ({ firstName: c.firstName || "", lastName: c.lastName || c.name || "", fieldMode: c.name ? 1 : 0 }));
  }
  getCreatorsJSON() { return this._creators.map(c => ({ creatorType: "author", ...c })); }
  getTags() { return this._tags.map(t => ({ ...t })); }
  addTag(tag) { if (!this._tags.some(t => t.tag === tag)) this._tags.push({ tag, type: 0 }); this.fieldWrites.push(["tag", tag]); }
  getAttachments() { return this._attachments.slice(); }
  getAnnotations() { return this._annotations.slice(); }
  async fileExists() {
    if (this._fileExists instanceof Error) throw this._fileExists;
    return !!this._fileExists;
  }
  get attachmentText() {
    if (this._text instanceof Error) return Promise.reject(this._text);
    return Promise.resolve(this._text || "");
  }
  async save() { this.saved++; this._r.saves.push(this.id); return true; }
  async saveTx() { return this.save(); }
}

export function createEnv({ confirmIndex = 1, clipboardFails = false } = {}) {
  const registry = { items: new Map(), saves: [], clipboard: null, dialogs: [], transactions: 0, selected: [] };
  const item = opts => new MockItem(registry, opts);

  const Zotero = {
    getActiveZoteroPane: () => ({ getSelectedItems: () => registry.selected.slice() }),
    getMainWindow: () => ({ confirm: () => confirmIndex === 0 }),
    Items: {
      get: ids => Array.isArray(ids)
        ? ids.map(id => registry.items.get(id)).filter(Boolean)
        : registry.items.get(ids) || false
    },
    Libraries: { get: id => ({ libraryID: id, editable: id !== 2 }) },
    Attachments: { LINK_MODE_IMPORTED_FILE, LINK_MODE_LINKED_FILE },
    Utilities: {
      cleanDOI: x => { const m = String(x).match(/10(?:\.[0-9]{4,})?\/[^\s]*[^\s.,]/); return m ? m[0] : false; },
      Internal: {
        copyTextToClipboard: t => { if (clipboardFails) throw new Error("no clipboard"); registry.clipboard = t; }
      }
    },
    DB: {
      executeTransaction: async fn => { registry.transactions++; return fn(); }
    },
    logError: () => {}
  };

  const Services = {
    prompt: {
      BUTTON_POS_0: 1, BUTTON_POS_1: 256, BUTTON_TITLE_IS_STRING: 127, BUTTON_TITLE_CANCEL: 2,
      BUTTON_POS_1_DEFAULT: 1 << 24, BUTTON_DELAY_ENABLE: 1 << 26,
      confirmEx: (win, title, text, flags, b0) => { registry.dialogs.push({ title, text, flags, b0 }); return confirmIndex; }
    }
  };
  const Components = {
    classes: { "@mozilla.org/widget/clipboardhelper;1": { getService: () => ({ copyString: () => { throw new Error("no clipboard"); } }) } },
    interfaces: { nsIClipboardHelper: {} }
  };

  return { registry, item, Zotero, Services, Components };
}

// Run a toolkit script the way Zotero's "Run JavaScript" does in async mode.
export async function runScript(file, env, replacements = {}) {
  let code = fs.readFileSync(file, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    if (!code.includes(from)) throw new Error(`replacement not found in ${file}: ${from}`);
    code = code.replace(from, to);
  }
  const ctx = vm.createContext({
    Zotero: env.Zotero, Services: env.Services, Components: env.Components, console
  });
  return vm.runInContext(`(async () => {\n${code}\n})()`, ctx, { filename: file });
}
