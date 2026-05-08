<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { vault, tabs, ui } from '$lib/state.svelte';
  import { fuzzyScore, fuzzyHighlight } from '$lib/utils';
  import { FileText, Plus } from 'lucide-svelte';

  let query = $state('');
  let selected = $state(0);

  const matches = $derived.by(() => {
    const items = [...vault.notes.values()]
      .map((n) => ({ note: n, score: fuzzyScore(query, n.name) ?? -Infinity }))
      .filter((x) => query === '' || x.score > -Infinity)
      .sort((a, b) => b.score - a.score || b.note.modified - a.note.modified)
      .slice(0, 50);
    return items;
  });

  $effect(() => {
    if (selected >= matches.length + 1) selected = 0;
  });

  function close() {
    ui.switcherOpen = false;
    query = '';
    selected = 0;
  }

  async function go(idx: number) {
    if (idx === matches.length) {
      // create new note with the typed name
      const name = query.trim();
      if (!name) return;
      const id = await vault.createNote('', name);
      if (id) tabs.open(id);
      close();
      return;
    }
    const m = matches[idx];
    if (!m) return;
    tabs.open(m.note.id);
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    const total = matches.length + (query.trim() ? 1 : 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, total - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); go(selected); }
  }
</script>

<Dialog bind:open={ui.switcherOpen} align="top" onclose={close} class="max-w-xl">
  <div class="border-b border-border px-3 py-2">
    <input
      class="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
      placeholder="Find or create a note…"
      bind:value={query}
      onkeydown={onKeydown}
      autofocus
    />
  </div>
  <ul class="max-h-80 overflow-y-auto p-1">
    {#each matches as m, i (m.note.id)}
      <li>
        <button
          type="button"
          class={'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm ' +
            (i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')}
          onclick={() => go(i)}
          onmousemove={() => (selected = i)}
        >
          <FileText class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span class="truncate">{@html fuzzyHighlight(query, m.note.name)}</span>
          {#if m.note.folder}
            <span class="ml-auto shrink-0 truncate text-xs text-muted-foreground">{m.note.folder}</span>
          {/if}
        </button>
      </li>
    {:else}
      {#if !query.trim()}
        <li class="px-3 py-4 text-center text-sm text-muted-foreground">Empty vault.</li>
      {/if}
    {/each}
    {#if query.trim()}
      <li>
        <button
          type="button"
          class={'flex w-full items-center gap-2 rounded-md border-t border-border px-3 py-1.5 text-left text-sm ' +
            (selected === matches.length ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')}
          onclick={() => go(matches.length)}
          onmousemove={() => (selected = matches.length)}
        >
          <Plus class="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Create note <strong>"{query}"</strong></span>
        </button>
      </li>
    {/if}
  </ul>
</Dialog>
