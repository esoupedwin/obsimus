import type {
  Note,
  NoteId,
  Tab,
  Theme,
  TreeNode,
  EditorMode,
  LeftPanelTab,
  RightPanelTab,
  FolderNode,
  FileNode
} from './types';
import * as fs from './fs/vault-fs';
import { buildNoteIndex, parseNote, resolveLink } from './markdown/render';
import { basename, dirname, joinPath, stripExt } from './utils';

/* ------------------------------- Vault store ------------------------------ */

class VaultStore {
  notes = $state<Map<NoteId, Note>>(new Map());
  rootHandle = $state<FileSystemDirectoryHandle | null>(null);
  rootName = $state<string>('');
  loading = $state<boolean>(false);
  ready = $state<boolean>(false);

  /** name(lower) -> NoteId */
  index = $derived(buildNoteIndex(this.notes));

  /** Tree representation derived from notes (and folders we discover). */
  folders = $state<Set<string>>(new Set());

  tree = $derived.by<TreeNode[]>(() => {
    return buildTree([...this.notes.values()], this.folders);
  });

  /** All tags across vault → count. */
  tagCounts = $derived.by<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const n of this.notes.values()) {
      for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  });

  /** Backlinks index: noteId -> array of source NoteIds. */
  backlinks = $derived.by<Map<NoteId, NoteId[]>>(() => {
    const out = new Map<NoteId, NoteId[]>();
    for (const n of this.notes.values()) {
      for (const t of n.links) {
        if (!out.has(t)) out.set(t, []);
        out.get(t)!.push(n.id);
      }
    }
    return out;
  });

  async openVault() {
    if (!fs.isSupported()) {
      alert(
        'The File System Access API is not supported in this browser. Please use Chrome, Edge, or Opera.'
      );
      return;
    }
    try {
      const handle = await fs.pickVault();
      await this.loadFromHandle(handle);
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e);
    }
  }

  async tryReopenStored() {
    const handle = await fs.loadStoredVault();
    if (!handle) return false;
    const granted = await fs.ensurePermission(handle).catch(() => false);
    if (!granted) {
      this.rootHandle = handle; // store but un-loaded
      this.rootName = handle.name;
      return false;
    }
    await this.loadFromHandle(handle);
    return true;
  }

  async loadFromHandle(handle: FileSystemDirectoryHandle) {
    this.loading = true;
    try {
      this.rootHandle = handle;
      this.rootName = handle.name;
      const raws = await fs.readAllNotes(handle);
      const m = new Map<NoteId, Note>();
      const folders = new Set<string>();
      for (const r of raws) {
        const folder = dirname(r.path);
        if (folder) {
          // walk parent folders for tree
          let cur = folder;
          while (cur) {
            folders.add(cur);
            cur = dirname(cur);
          }
        }
        const note = makeNote(r);
        m.set(note.id, note);
      }
      // resolve links
      const idx = buildNoteIndex(m);
      for (const n of m.values()) {
        const parsed = parseNote(n.content);
        n.tags = parsed.tags;
        n.headings = parsed.headings;
        const links: string[] = [];
        const unresolved: string[] = [];
        for (const target of parsed.links) {
          const r = resolveLink(target, idx);
          if (r) links.push(r);
          else unresolved.push(target);
        }
        n.links = links;
        n.unresolved = unresolved;
      }
      this.notes = new Map(m);
      this.folders = folders;
      this.ready = true;
    } finally {
      this.loading = false;
    }
  }

  closeVault() {
    this.notes = new Map();
    this.folders = new Set();
    this.rootHandle = null;
    this.rootName = '';
    this.ready = false;
    fs.clearStoredVault();
  }

  resolve(target: string): NoteId | null {
    return resolveLink(target, this.index);
  }

  async saveNote(id: NoteId, content: string) {
    if (!this.rootHandle) return;
    const n = this.notes.get(id);
    if (!n) return;
    n.content = content;
    n.modified = Date.now();
    n.size = content.length;
    // Re-parse links
    const parsed = parseNote(content);
    n.tags = parsed.tags;
    n.headings = parsed.headings;
    const links: string[] = [];
    const unresolved: string[] = [];
    for (const target of parsed.links) {
      const r = resolveLink(target, this.index);
      if (r) links.push(r);
      else unresolved.push(target);
    }
    n.links = links;
    n.unresolved = unresolved;
    this.notes = new Map(this.notes); // trigger derived
    await fs.writeFile(this.rootHandle, id, content);
  }

  async createNote(folderPath: string, baseName = 'Untitled'): Promise<NoteId | null> {
    if (!this.rootHandle) return null;
    let name = baseName;
    let counter = 1;
    let id = joinPath(folderPath, `${name}.md`);
    while (this.notes.has(id)) {
      counter++;
      name = `${baseName} ${counter}`;
      id = joinPath(folderPath, `${name}.md`);
    }
    await fs.writeFile(this.rootHandle, id, '');
    const note: Note = {
      id,
      path: id,
      name,
      folder: folderPath,
      ext: '.md',
      size: 0,
      modified: Date.now(),
      content: '',
      links: [],
      unresolved: [],
      tags: [],
      headings: []
    };
    this.notes.set(id, note);
    this.notes = new Map(this.notes);
    return id;
  }

  async createFolder(parent: string, name: string): Promise<string | null> {
    if (!this.rootHandle) return null;
    const path = joinPath(parent, name);
    await fs.getDirHandle(this.rootHandle, path, { create: true });
    this.folders.add(path);
    this.folders = new Set(this.folders);
    return path;
  }

  async deleteNote(id: NoteId) {
    if (!this.rootHandle) return;
    await fs.deletePath(this.rootHandle, id);
    this.notes.delete(id);
    this.notes = new Map(this.notes);
  }

  async deleteFolder(path: string) {
    if (!this.rootHandle) return;
    await fs.deletePath(this.rootHandle, path);
    // Remove notes inside
    for (const id of [...this.notes.keys()]) {
      if (id.startsWith(path + '/')) this.notes.delete(id);
    }
    for (const f of [...this.folders]) {
      if (f === path || f.startsWith(path + '/')) this.folders.delete(f);
    }
    this.notes = new Map(this.notes);
    this.folders = new Set(this.folders);
  }

  async renameNote(id: NoteId, newName: string): Promise<NoteId | null> {
    if (!this.rootHandle) return null;
    const note = this.notes.get(id);
    if (!note) return null;
    const newId = joinPath(note.folder, `${newName}${note.ext}`);
    if (newId === id) return id;
    if (this.notes.has(newId)) return null;
    await fs.rename(this.rootHandle, id, newId);
    note.id = newId;
    note.path = newId;
    note.name = newName;
    this.notes.delete(id);
    this.notes.set(newId, note);
    this.notes = new Map(this.notes);
    return newId;
  }
}

function makeNote(r: fs.RawFile): Note {
  const folder = dirname(r.path);
  const ext = extOf(r.path);
  const name = stripExt(basename(r.path));
  return {
    id: r.path,
    path: r.path,
    name,
    folder,
    ext,
    size: r.size,
    modified: r.modified,
    content: r.content,
    links: [],
    unresolved: [],
    tags: [],
    headings: []
  };
}

function extOf(p: string) {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
}

function buildTree(notes: Note[], folders: Set<string>): TreeNode[] {
  type DirEntry = FolderNode & { _children: Map<string, DirEntry | FileNode> };
  const root: DirEntry = { type: 'folder', name: '', path: '', children: [], _children: new Map() };

  function ensureFolder(path: string): DirEntry {
    if (!path) return root;
    const parts = path.split('/');
    let cur = root;
    let acc = '';
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      let next = cur._children.get(p) as DirEntry | undefined;
      if (!next) {
        next = { type: 'folder', name: p, path: acc, children: [], _children: new Map() };
        cur._children.set(p, next);
      }
      cur = next as DirEntry;
    }
    return cur;
  }

  for (const f of folders) ensureFolder(f);
  for (const n of notes) {
    const parent = ensureFolder(n.folder);
    parent._children.set(basename(n.path), { type: 'file', name: n.name, path: n.id, ext: n.ext });
  }

  function finalize(d: DirEntry): TreeNode {
    const kids = [...d._children.values()].map((c) =>
      c.type === 'folder' ? finalize(c as DirEntry) : c
    );
    kids.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    return { type: 'folder', name: d.name, path: d.path, children: kids };
  }

  const out = finalize(root) as FolderNode;
  return out.children;
}

export const vault = new VaultStore();

/* ------------------------------- Tabs store ------------------------------- */

class TabsStore {
  tabs = $state<Tab[]>([{ id: id(), noteId: null, mode: 'welcome' }]);
  activeId = $state<string>('');

  constructor() {
    this.activeId = this.tabs[0].id;
  }

  active = $derived.by(() => this.tabs.find((t) => t.id === this.activeId) ?? null);

  open(noteId: NoteId, opts: { newTab?: boolean } = {}) {
    const existing = this.tabs.find((t) => t.noteId === noteId);
    if (existing && !opts.newTab) {
      this.activeId = existing.id;
      return existing.id;
    }
    if (opts.newTab) {
      const t: Tab = { id: id(), noteId, mode: 'edit' };
      this.tabs = [...this.tabs, t];
      this.activeId = t.id;
      return t.id;
    }
    // Replace current tab if it's a welcome / empty
    const cur = this.tabs.find((t) => t.id === this.activeId);
    if (cur && (cur.mode === 'welcome' || cur.noteId === null)) {
      cur.noteId = noteId;
      cur.mode = 'edit';
      this.tabs = [...this.tabs];
      return cur.id;
    }
    const t: Tab = { id: id(), noteId, mode: 'edit' };
    this.tabs = [...this.tabs, t];
    this.activeId = t.id;
    return t.id;
  }

  close(tabId: string) {
    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    this.tabs = this.tabs.filter((t) => t.id !== tabId);
    if (this.tabs.length === 0) {
      const t: Tab = { id: id(), noteId: null, mode: 'welcome' };
      this.tabs = [t];
      this.activeId = t.id;
    } else if (this.activeId === tabId) {
      const next = this.tabs[Math.min(idx, this.tabs.length - 1)];
      this.activeId = next.id;
    }
  }

  setMode(tabId: string, mode: Tab['mode']) {
    const t = this.tabs.find((x) => x.id === tabId);
    if (!t) return;
    t.mode = mode;
    this.tabs = [...this.tabs];
  }

  openGraph() {
    const existing = this.tabs.find((t) => t.mode === 'graph');
    if (existing) {
      this.activeId = existing.id;
      return;
    }
    const t: Tab = { id: id(), noteId: null, mode: 'graph' };
    this.tabs = [...this.tabs, t];
    this.activeId = t.id;
  }

  /** When a note is renamed/deleted, update tabs. */
  onRename(oldId: NoteId, newId: NoteId) {
    let changed = false;
    for (const t of this.tabs) {
      if (t.noteId === oldId) {
        t.noteId = newId;
        changed = true;
      }
    }
    if (changed) this.tabs = [...this.tabs];
  }

  onDelete(noteId: NoteId) {
    let changed = false;
    for (const t of this.tabs) {
      if (t.noteId === noteId) {
        t.noteId = null;
        t.mode = 'welcome';
        changed = true;
      }
    }
    if (changed) this.tabs = [...this.tabs];
  }
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export const tabs = new TabsStore();

/* --------------------------------- UI store -------------------------------- */

class UIStore {
  theme = $state<Theme>(detectTheme());
  leftOpen = $state(true);
  rightOpen = $state(true);
  leftTab = $state<LeftPanelTab>('files');
  rightTab = $state<RightPanelTab>('backlinks');
  editorMode = $state<EditorMode>('live');
  paletteOpen = $state(false);
  switcherOpen = $state(false);

  constructor() {
    if (typeof document !== 'undefined') {
      this.applyTheme();
    }
  }

  setTheme(t: Theme) {
    this.theme = t;
    this.applyTheme();
    try {
      localStorage.setItem('obsimus.theme', t);
    } catch {}
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const t = this.theme;
    let dark = false;
    if (t === 'dark') dark = true;
    else if (t === 'light') dark = false;
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', dark);
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }
}

function detectTheme(): Theme {
  try {
    const v = localStorage.getItem('obsimus.theme');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'dark';
}

export const ui = new UIStore();

/* ---------------------------- Command registry ---------------------------- */

export interface Command {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

class CommandStore {
  commands = $state<Command[]>([]);

  register(cmds: Command[]) {
    const ids = new Set(this.commands.map((c) => c.id));
    for (const c of cmds) if (!ids.has(c.id)) this.commands.push(c);
    this.commands = [...this.commands];
  }

  run(id: string) {
    const c = this.commands.find((x) => x.id === id);
    if (c) c.run();
  }
}

export const commands = new CommandStore();

/* ---------------------- Note drag (pointer-based) ------------------------ */

type DropHandler = (noteId: NoteId, x: number, y: number) => boolean;

class DragNoteStore {
  noteId = $state<NoteId | null>(null);
  label = $state('');
  active = $state(false);
  x = $state(0);
  y = $state(0);
  private startX = 0;
  private startY = 0;
  private handlers = new Set<DropHandler>();

  begin(noteId: NoteId, label: string, x: number, y: number) {
    this.noteId = noteId;
    this.label = label;
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.active = false;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
    if (!this.active && this.noteId) {
      if (Math.hypot(x - this.startX, y - this.startY) > 5) this.active = true;
    }
  }

  /** Returns true if a real drag occurred (so the caller can suppress click). */
  end(x: number, y: number): boolean {
    const wasActive = this.active;
    if (wasActive && this.noteId) {
      for (const h of this.handlers) {
        if (h(this.noteId, x, y)) break;
      }
    }
    this.noteId = null;
    this.label = '';
    this.active = false;
    return wasActive;
  }

  cancel() {
    this.noteId = null;
    this.label = '';
    this.active = false;
  }

  registerDropHandler(handler: DropHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const dragNote = new DragNoteStore();
