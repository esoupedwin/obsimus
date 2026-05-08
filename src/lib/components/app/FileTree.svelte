<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';
  import type { TreeNode, FolderNode, FileNode } from '$lib/types';
  import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Plus, FolderPlus, RefreshCw } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  import { joinPath } from '$lib/utils';

  let expanded = $state<Set<string>>(new Set(['']));
  let menuOpenFor = $state<string | null>(null);
  let renaming = $state<string | null>(null);
  let renameValue = $state('');

  function toggle(path: string) {
    if (expanded.has(path)) expanded.delete(path);
    else expanded.add(path);
    expanded = new Set(expanded);
  }

  async function newNoteIn(folder: string) {
    const id = await vault.createNote(folder, 'Untitled');
    if (id) {
      tabs.open(id);
      expanded.add(folder);
      expanded = new Set(expanded);
    }
  }

  async function newFolderIn(parent: string) {
    const name = prompt('Folder name:');
    if (!name) return;
    await vault.createFolder(parent, name.trim());
    expanded.add(joinPath(parent, name.trim()));
    expanded = new Set(expanded);
  }

  function startRename(path: string, currentName: string) {
    renaming = path;
    renameValue = currentName;
  }

  async function commitRename(path: string) {
    if (!renameValue.trim()) {
      renaming = null;
      return;
    }
    const newId = await vault.renameNote(path, renameValue.trim());
    if (newId) tabs.onRename(path, newId);
    renaming = null;
  }

  async function deleteFile(path: string, isFolder: boolean) {
    const ok = confirm(`Delete "${path}"?`);
    if (!ok) return;
    if (isFolder) await vault.deleteFolder(path);
    else {
      tabs.onDelete(path);
      await vault.deleteNote(path);
    }
  }

  async function refresh() {
    if (vault.rootHandle) await vault.loadFromHandle(vault.rootHandle);
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex h-8 shrink-0 items-center gap-1 border-b border-sidebar-border px-1.5">
    <span class="ml-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {vault.rootName}
    </span>
    <div class="flex-1"></div>
    <Tooltip label="New note">
      <Button variant="ghost" size="iconsm" onclick={() => newNoteIn('')}>
        <Plus class="h-3.5 w-3.5" />
      </Button>
    </Tooltip>
    <Tooltip label="New folder">
      <Button variant="ghost" size="iconsm" onclick={() => newFolderIn('')}>
        <FolderPlus class="h-3.5 w-3.5" />
      </Button>
    </Tooltip>
    <Tooltip label="Refresh">
      <Button variant="ghost" size="iconsm" onclick={refresh}>
        <RefreshCw class="h-3.5 w-3.5" />
      </Button>
    </Tooltip>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto py-1">
    {#each vault.tree as node (node.path)}
      {@render renderNode(node, 0)}
    {/each}
  </div>
</div>

{#snippet renderNode(node: TreeNode, depth: number)}
  {#if node.type === 'folder'}
    {@const isOpen = expanded.has(node.path)}
    <div
      class="group flex cursor-pointer select-none items-center gap-1 rounded-sm pr-1 hover:bg-sidebar-accent/60"
      style="padding-left: {depth * 12 + 6}px"
      role="button"
      tabindex="0"
      onclick={() => toggle(node.path)}
      onkeydown={(e) => { if (e.key === 'Enter') toggle(node.path); }}
    >
      <span class="grid h-5 w-4 place-items-center text-muted-foreground">
        {#if isOpen}<ChevronDown class="h-3 w-3" />{:else}<ChevronRight class="h-3 w-3" />{/if}
      </span>
      {#if isOpen}
        <FolderOpen class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {:else}
        <Folder class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {/if}
      <span class="min-w-0 flex-1 truncate py-0.5 text-[13px]">{node.name}</span>
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          class="grid h-5 w-5 place-items-center rounded hover:bg-accent"
          title="New note"
          onclick={(e) => { e.stopPropagation(); newNoteIn(node.path); }}
          aria-label="New note in folder"
        >
          <Plus class="h-3 w-3" />
        </button>
        <button
          class="grid h-5 w-5 place-items-center rounded hover:bg-accent"
          title="Delete"
          onclick={(e) => { e.stopPropagation(); deleteFile(node.path, true); }}
          aria-label="Delete folder"
        >
          ×
        </button>
      </div>
    </div>
    {#if isOpen}
      {#each node.children as c (c.path)}
        {@render renderNode(c, depth + 1)}
      {/each}
    {/if}
  {:else}
    {@const file = node as FileNode}
    {@const isActive = tabs.active?.noteId === file.path}
    <div
      class={'group flex cursor-pointer select-none items-center gap-1 rounded-sm pr-1 ' +
        (isActive ? 'bg-sidebar-accent text-foreground' : 'hover:bg-sidebar-accent/60')}
      style="padding-left: {depth * 12 + 22}px"
      role="button"
      tabindex="0"
      ondblclick={() => startRename(file.path, file.name)}
      onclick={() => tabs.open(file.path)}
      onkeydown={(e) => { if (e.key === 'Enter') tabs.open(file.path); if (e.key === 'F2') startRename(file.path, file.name); }}
    >
      <FileText class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {#if renaming === file.path}
        <input
          class="min-w-0 flex-1 rounded border border-input bg-background px-1 py-0 text-[13px] outline-none focus:ring-1 focus:ring-ring"
          bind:value={renameValue}
          onkeydown={(e) => { if (e.key === 'Enter') commitRename(file.path); if (e.key === 'Escape') renaming = null; }}
          onblur={() => commitRename(file.path)}
          onclick={(e) => e.stopPropagation()}
          autofocus
        />
      {:else}
        <span class="min-w-0 flex-1 truncate py-0.5 text-[13px]">{file.name}</span>
      {/if}
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          class="grid h-5 w-5 place-items-center rounded hover:bg-accent"
          title="Rename"
          onclick={(e) => { e.stopPropagation(); startRename(file.path, file.name); }}
          aria-label="Rename"
        >
          ✎
        </button>
        <button
          class="grid h-5 w-5 place-items-center rounded hover:bg-accent"
          title="Delete"
          onclick={(e) => { e.stopPropagation(); deleteFile(file.path, false); }}
          aria-label="Delete"
        >
          ×
        </button>
      </div>
    </div>
  {/if}
{/snippet}
