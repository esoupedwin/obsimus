<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { escapeHtml } from '$lib/utils';
  import { FileText } from 'lucide-svelte';

  let query = $state('');

  type Hit = { noteId: string; name: string; matches: { line: number; html: string }[] };

  const hits = $derived.by<Hit[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const re = new RegExp(escapeRegex(q), 'gi');
    const out: Hit[] = [];
    for (const n of vault.notes.values()) {
      const matches: Hit['matches'] = [];
      const titleMatch = re.test(n.name);
      re.lastIndex = 0;
      const lines = n.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          re.lastIndex = 0;
          const ln = lines[i];
          const html = highlight(ln, q);
          matches.push({ line: i, html });
          if (matches.length >= 4) break;
        }
        re.lastIndex = 0;
      }
      if (titleMatch || matches.length > 0) {
        out.push({ noteId: n.id, name: n.name, matches });
      }
    }
    out.sort((a, b) => b.matches.length - a.matches.length);
    return out.slice(0, 100);
  });

  function highlight(text: string, q: string): string {
    const re = new RegExp(`(${escapeRegex(q)})`, 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const totalMatches = $derived(hits.reduce((s, h) => s + h.matches.length, 0));
</script>

<div class="flex h-full flex-col">
  <div class="border-b border-sidebar-border p-2">
    <Input bind:value={query} placeholder="Search vault…" autofocus />
    {#if query}
      <p class="mt-1 px-1 text-[11px] text-muted-foreground">
        {totalMatches} matches in {hits.length} {hits.length === 1 ? 'note' : 'notes'}
      </p>
    {/if}
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto p-1">
    {#if !query}
      <p class="px-3 py-3 text-xs text-muted-foreground">Start typing to search.</p>
    {:else if hits.length === 0}
      <p class="px-3 py-3 text-xs text-muted-foreground">No matches.</p>
    {:else}
      <ul class="space-y-1">
        {#each hits as hit (hit.noteId)}
          <li class="rounded-md p-1.5 hover:bg-sidebar-accent/50">
            <button
              type="button"
              class="flex w-full items-center gap-1.5 text-left"
              onclick={() => tabs.open(hit.noteId)}
            >
              <FileText class="h-3 w-3 shrink-0 text-muted-foreground" />
              <span class="truncate text-[13px] font-medium">{hit.name}</span>
            </button>
            {#if hit.matches.length}
              <ul class="mt-0.5 space-y-0.5">
                {#each hit.matches as m}
                  <li class="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted-foreground line-clamp-2 hover:bg-accent/50">
                    {@html m.html}
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  :global(.search-hit mark) { background: hsl(var(--primary) / 0.3); color: inherit; padding: 0 1px; border-radius: 2px; }
</style>
