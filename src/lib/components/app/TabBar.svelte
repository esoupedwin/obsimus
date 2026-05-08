<script lang="ts">
  import { tabs, vault, ui } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { X, FileText, Network, Eye, Edit3, BookOpen } from 'lucide-svelte';

  function titleFor(t: typeof tabs.tabs[number]) {
    if (t.mode === 'graph') return 'Graph view';
    if (t.mode === 'welcome' || !t.noteId) return 'New tab';
    return vault.notes.get(t.noteId)?.name ?? 'Missing';
  }
</script>

<div class="relative z-10 flex h-9 shrink-0 items-center gap-0.5 border-b border-border bg-sidebar/30 px-1">
  <div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
    {#each tabs.tabs as tab (tab.id)}
      {@const active = tab.id === tabs.activeId}
      <div
        class={'group relative flex h-8 min-w-0 max-w-[220px] items-center rounded-t-md text-xs transition-colors ' +
          (active
            ? 'bg-background text-foreground shadow-sm border border-b-0 border-border -mb-px'
            : 'text-muted-foreground hover:bg-accent/50')}
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1"
          onclick={() => (tabs.activeId = tab.id)}
        >
          {#if tab.mode === 'graph'}
            <Network class="h-3.5 w-3.5 shrink-0 opacity-70" />
          {:else}
            <FileText class="h-3.5 w-3.5 shrink-0 opacity-70" />
          {/if}
          <span class="truncate">{titleFor(tab)}</span>
        </button>
        <button
          type="button"
          class="mr-1 grid h-4 w-4 shrink-0 place-items-center rounded opacity-0 hover:bg-accent group-hover:opacity-100 focus:opacity-100"
          onclick={() => tabs.close(tab.id)}
          aria-label="Close tab"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    {/each}
  </div>

  {#if tabs.active && tabs.active.noteId}
    <div class="ml-2 flex items-center gap-0.5 border-l border-border pl-2">
      <Button
        variant={ui.editorMode === 'source' ? 'secondary' : 'ghost'}
        size="iconsm"
        onclick={() => (ui.editorMode = 'source')}
        aria-label="Source"
      >
        <Edit3 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={ui.editorMode === 'live' ? 'secondary' : 'ghost'}
        size="iconsm"
        onclick={() => (ui.editorMode = 'live')}
        aria-label="Live"
      >
        <Eye class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={ui.editorMode === 'preview' ? 'secondary' : 'ghost'}
        size="iconsm"
        onclick={() => (ui.editorMode = 'preview')}
        aria-label="Reading"
      >
        <BookOpen class="h-3.5 w-3.5" />
      </Button>
    </div>
  {/if}
</div>
