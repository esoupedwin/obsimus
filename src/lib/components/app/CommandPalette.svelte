<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { commands, ui } from '$lib/state.svelte';
  import { fuzzyScore, fuzzyHighlight } from '$lib/utils';
  import { Command } from 'lucide-svelte';

  let query = $state('');
  let selected = $state(0);

  const matches = $derived.by(() => {
    const list = commands.commands.map((c) => ({
      cmd: c,
      score: fuzzyScore(query, c.title) ?? -Infinity
    }));
    return list
      .filter((x) => query === '' || x.score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  });

  $effect(() => {
    if (selected >= matches.length) selected = 0;
  });

  function onClose() {
    query = '';
    selected = 0;
  }

  function run(idx: number) {
    const m = matches[idx];
    if (!m) return;
    ui.paletteOpen = false;
    onClose();
    queueMicrotask(() => m.cmd.run());
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, matches.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(selected);
    }
  }
</script>

<Dialog bind:open={ui.paletteOpen} align="top" onclose={onClose} class="max-w-xl">
  <div class="flex items-center gap-2 border-b border-border px-3 py-2">
    <Command class="h-4 w-4 text-muted-foreground" />
    <input
      class="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
      placeholder="Type a command…"
      bind:value={query}
      onkeydown={onKeydown}
      autofocus
    />
  </div>
  <ul class="max-h-80 overflow-y-auto p-1">
    {#each matches as m, i (m.cmd.id)}
      <li>
        <button
          type="button"
          class={'flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm ' +
            (i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')}
          onclick={() => run(i)}
          onmousemove={() => (selected = i)}
        >
          <span class="truncate">{@html fuzzyHighlight(query, m.cmd.title)}</span>
          {#if m.cmd.shortcut}
            <kbd class="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {m.cmd.shortcut}
            </kbd>
          {/if}
        </button>
      </li>
    {:else}
      <li class="px-3 py-4 text-center text-sm text-muted-foreground">No commands.</li>
    {/each}
  </ul>
</Dialog>

<style>
  :global(mark) { background: hsl(var(--primary) / 0.35); color: inherit; padding: 0 1px; border-radius: 2px; }
</style>
