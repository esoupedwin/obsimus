<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';

  const activeNoteId = $derived(tabs.active?.noteId ?? null);
  const note = $derived(activeNoteId ? vault.notes.get(activeNoteId) ?? null : null);
  const headings = $derived(note?.headings ?? []);
</script>

<div class="flex h-full flex-col">
  <div class="flex h-8 shrink-0 items-center px-3 border-b border-sidebar-border">
    <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Outline {headings.length ? `(${headings.length})` : ''}
    </span>
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto py-1">
    {#if !note}
      <p class="px-3 py-3 text-xs text-muted-foreground">Open a note.</p>
    {:else if headings.length === 0}
      <p class="px-3 py-3 text-xs text-muted-foreground">No headings yet.</p>
    {:else}
      <ul>
        {#each headings as h}
          <li>
            <button
              type="button"
              class="block w-full truncate rounded-sm px-3 py-1 text-left text-[13px] hover:bg-sidebar-accent"
              style="padding-left: {(h.level - 1) * 12 + 12}px"
              title={h.text}
            >
              {h.text}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
