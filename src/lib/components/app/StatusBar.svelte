<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';

  const noteCount = $derived(vault.notes.size);
  const tagCount = $derived(vault.tagCounts.size);
  const active = $derived(tabs.active);
  const activeNote = $derived(active?.noteId ? vault.notes.get(active.noteId) : null);

  const wordCount = $derived(activeNote ? wordsOf(activeNote.content) : 0);
  const charCount = $derived(activeNote ? activeNote.content.length : 0);

  function wordsOf(s: string) {
    const m = s.trim().match(/\S+/g);
    return m ? m.length : 0;
  }
</script>

<footer
  class="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-sidebar/40 px-3 text-[11px] text-muted-foreground select-none"
>
  {#if vault.ready}
    <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
    <span class="text-border">·</span>
    <span>{tagCount} {tagCount === 1 ? 'tag' : 'tags'}</span>
    {#if activeNote}
      <span class="text-border">·</span>
      <span>{wordCount} words</span>
      <span class="text-border">·</span>
      <span>{charCount} chars</span>
    {/if}
  {:else}
    <span>No vault open</span>
  {/if}
  <div class="flex-1"></div>
  <span class="opacity-70">Obsimus v0.1</span>
</footer>
