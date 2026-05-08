import { get, set, del } from 'idb-keyval';
import { joinPath } from '$lib/utils';

const HANDLE_KEY = 'obsimus.vault.handle';

export type AnyFileHandle = FileSystemFileHandle;
export type AnyDirHandle = FileSystemDirectoryHandle;

export const TEXT_EXTS = new Set(['.md', '.markdown', '.txt', '.canvas']);

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickVault(): Promise<AnyDirHandle> {
  // @ts-ignore
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await set(HANDLE_KEY, handle);
  return handle;
}

export async function loadStoredVault(): Promise<AnyDirHandle | null> {
  const handle = (await get(HANDLE_KEY)) as AnyDirHandle | undefined;
  if (!handle) return null;
  // Verify permission
  // @ts-ignore
  const opts = { mode: 'readwrite' };
  // @ts-ignore
  const perm = await handle.queryPermission(opts);
  if (perm === 'granted') return handle;
  return handle; // caller must call requestPermission on user gesture
}

export async function ensurePermission(handle: AnyDirHandle): Promise<boolean> {
  // @ts-ignore
  const opts = { mode: 'readwrite' };
  // @ts-ignore
  let perm = await handle.queryPermission(opts);
  if (perm === 'granted') return true;
  // @ts-ignore
  perm = await handle.requestPermission(opts);
  return perm === 'granted';
}

export async function clearStoredVault() {
  await del(HANDLE_KEY);
}

export interface RawFile {
  path: string;       // full vault-relative path with extension
  name: string;       // file name with extension
  size: number;
  modified: number;
  content: string;
}

export async function* walk(
  dir: AnyDirHandle,
  prefix = ''
): AsyncGenerator<{ kind: 'file'; path: string; handle: AnyFileHandle } | { kind: 'dir'; path: string; handle: AnyDirHandle }> {
  // @ts-ignore - entries() exists on FileSystemDirectoryHandle
  for await (const [name, entry] of dir.entries()) {
    if (name.startsWith('.')) continue; // skip hidden / .obsidian
    const path = joinPath(prefix, name);
    if (entry.kind === 'file') {
      yield { kind: 'file', path, handle: entry as AnyFileHandle };
    } else {
      yield { kind: 'dir', path, handle: entry as AnyDirHandle };
      yield* walk(entry as AnyDirHandle, path);
    }
  }
}

export async function readFile(handle: AnyFileHandle): Promise<RawFile> {
  const file = await handle.getFile();
  const text = await file.text();
  return {
    path: file.name,
    name: file.name,
    size: file.size,
    modified: file.lastModified,
    content: text
  };
}

export async function readAllNotes(root: AnyDirHandle): Promise<RawFile[]> {
  const out: RawFile[] = [];
  for await (const item of walk(root)) {
    if (item.kind !== 'file') continue;
    const ext = extOf(item.path);
    if (!TEXT_EXTS.has(ext)) continue;
    const file = await item.handle.getFile();
    const text = await file.text().catch(() => '');
    out.push({
      path: item.path,
      name: file.name,
      size: file.size,
      modified: file.lastModified,
      content: text
    });
  }
  return out;
}

function extOf(p: string) {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i).toLowerCase() : '';
}

export async function getFileHandle(
  root: AnyDirHandle,
  path: string,
  opts: { create?: boolean } = {}
): Promise<AnyFileHandle> {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop()!;
  let dir = root;
  for (const seg of parts) {
    dir = await dir.getDirectoryHandle(seg, { create: opts.create });
  }
  return dir.getFileHandle(fileName, { create: opts.create });
}

export async function getDirHandle(
  root: AnyDirHandle,
  path: string,
  opts: { create?: boolean } = {}
): Promise<AnyDirHandle> {
  const parts = path.split('/').filter(Boolean);
  let dir = root;
  for (const seg of parts) {
    dir = await dir.getDirectoryHandle(seg, { create: opts.create });
  }
  return dir;
}

export async function writeFile(root: AnyDirHandle, path: string, content: string) {
  const handle = await getFileHandle(root, path, { create: true });
  // @ts-ignore createWritable
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deletePath(root: AnyDirHandle, path: string) {
  const parts = path.split('/').filter(Boolean);
  const last = parts.pop()!;
  let dir = root;
  for (const seg of parts) dir = await dir.getDirectoryHandle(seg);
  // @ts-ignore
  await dir.removeEntry(last, { recursive: true });
}

export async function rename(root: AnyDirHandle, fromPath: string, toPath: string) {
  // The File System Access API has no native rename. Implement as read+write+delete.
  const fileHandle = await getFileHandle(root, fromPath);
  const file = await fileHandle.getFile();
  const text = await file.text();
  await writeFile(root, toPath, text);
  await deletePath(root, fromPath);
}
