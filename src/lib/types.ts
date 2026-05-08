export type NoteId = string; // path relative to vault root, e.g. "folder/note.md"

export interface Note {
  id: NoteId;
  path: string;        // full path within vault, includes extension
  name: string;        // file name without extension
  folder: string;      // parent folder path ("" for root)
  ext: string;         // ".md", ".canvas", etc
  size: number;
  modified: number;
  content: string;     // raw text
  links: string[];     // resolved note ids this note links to
  unresolved: string[]; // wikilink targets that didn't resolve
  tags: string[];
  headings: { level: number; text: string; line: number }[];
}

export interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}
export interface FileNode {
  type: 'file';
  name: string;
  path: string;
  ext: string;
}
export type TreeNode = FolderNode | FileNode;

export interface Tab {
  id: string;
  noteId: NoteId | null;
  mode: 'edit' | 'preview' | 'graph' | 'welcome';
  scrollTop?: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type LeftPanelTab = 'files' | 'search' | 'tags';
export type RightPanelTab = 'backlinks' | 'outline';
export type EditorMode = 'live' | 'source' | 'preview';
