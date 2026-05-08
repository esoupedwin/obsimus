<script lang="ts">
  import { ui } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FileTree from './FileTree.svelte';
  import SearchPanel from './SearchPanel.svelte';
  import TagsPanel from './TagsPanel.svelte';
  import { Files, Search, Hash } from 'lucide-svelte';
</script>

<aside class="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-sidebar-border px-1">
    <Button
      variant={ui.leftTab === 'files' ? 'secondary' : 'ghost'}
      size="iconsm"
      onclick={() => (ui.leftTab = 'files')}
      aria-label="Files"
    >
      <Files class="h-4 w-4" />
    </Button>
    <Button
      variant={ui.leftTab === 'search' ? 'secondary' : 'ghost'}
      size="iconsm"
      onclick={() => (ui.leftTab = 'search')}
      aria-label="Search"
    >
      <Search class="h-4 w-4" />
    </Button>
    <Button
      variant={ui.leftTab === 'tags' ? 'secondary' : 'ghost'}
      size="iconsm"
      onclick={() => (ui.leftTab = 'tags')}
      aria-label="Tags"
    >
      <Hash class="h-4 w-4" />
    </Button>
    <div class="flex-1"></div>
    <span class="pr-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      {ui.leftTab}
    </span>
  </div>

  <div class="min-h-0 flex-1 overflow-hidden">
    {#if ui.leftTab === 'files'}
      <FileTree />
    {:else if ui.leftTab === 'search'}
      <SearchPanel />
    {:else}
      <TagsPanel />
    {/if}
  </div>
</aside>
