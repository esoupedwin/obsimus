<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';
  import { FileText, Link2Off } from 'lucide-svelte';

  const activeNoteId = $derived(tabs.active?.noteId ?? null);
  const linkers = $derived.by(() => {
    if (!activeNoteId) return [];
    return vault.backlinks.get(activeNoteId) ?? [];
  });

  const unresolvedRefs = $derived.by(() => {
    if (!activeNoteId) return [];
    const me = vault.notes.get(activeNoteId);
    return me?.unresolved ?? [];
  });

  function snippet(srcId: string, targetName: string): string {
    const src = vault.notes.get(srcId);
    if (!src) return '';
    const re = new RegExp('\\[\\[([^\\]]*?)\\]\\]', 'g');
    const lines = src.content.split('\n');
    for (const ln of lines) {
      if (ln.includes('[[')) {
        for (const m of ln.matchAll(re)) {
          const t = m[1].split('|')[0].trim();
          if (vault.resolve(t) === activeNoteId) return ln.trim();
        }
      }
    }
    return '';
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex h-8 shrink-0 items-center px-3 border-b border-sidebar-border">
    <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Linked mentions {linkers.length ? `(${linkers.length})` : ''}
    </span>
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto p-2">
    {#if !activeNoteId}
      <p class="px-2 py-3 text-xs text-muted-foreground">Open a note to see backlinks.</p>
    {:else if linkers.length === 0}
      <p class="px-2 py-3 text-xs text-muted-foreground">No backlinks yet.</p>
    {:else}
      <ul class="space-y-1">
        {#each linkers as srcId (srcId)}
          {@const src = vault.notes.get(srcId)}
          {#if src}
            {@const sn = snippet(srcId, vault.notes.get(activeNoteId)?.name ?? '')}
            <li>
              <button
                type="button"
                class="block w-full rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent transition-colors"
                onclick={() => tabs.open(srcId)}
              >
                <div class="flex items-center gap-1.5">
                  <FileText class="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span class="truncate text-[13px] font-medium">{src.name}</span>
                </div>
                {#if sn}
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{sn}</p>
                {/if}
              </button>
            </li>
          {/if}
        {/each}
      </ul>
    {/if}

    {#if unresolvedRefs.length > 0}
      <div class="mt-4 border-t border-sidebar-border pt-2">
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Unresolved ({unresolvedRefs.length})
        </p>
        <ul class="space-y-0.5">
          {#each unresolvedRefs as ref}
            <li class="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
              <Link2Off class="h-3 w-3 shrink-0" />
              <span class="truncate">{ref}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>
