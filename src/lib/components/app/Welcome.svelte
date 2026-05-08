<script lang="ts">
  import { vault, tabs, ui, commands } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FileText, Search, Network, Plus, Keyboard } from 'lucide-svelte';

  const recent = $derived(
    [...vault.notes.values()]
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 8)
  );
</script>

<div class="flex h-full overflow-y-auto">
  <div class="mx-auto w-full max-w-2xl px-8 py-12">
    <div class="mb-10 flex items-center gap-3">
      <div class="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground text-xl font-bold shadow">
        O
      </div>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{vault.rootName || 'Obsimus'}</h1>
        <p class="text-sm text-muted-foreground">
          {vault.notes.size} {vault.notes.size === 1 ? 'note' : 'notes'} in vault
        </p>
      </div>
    </div>

    <div class="mb-8 flex flex-wrap gap-2">
      <Button onclick={() => commands.run('note.new')}>
        <Plus class="h-4 w-4" /> New note
      </Button>
      <Button variant="outline" onclick={() => (ui.switcherOpen = true)}>
        <Search class="h-4 w-4" /> Quick switcher
      </Button>
      <Button variant="outline" onclick={() => tabs.openGraph()}>
        <Network class="h-4 w-4" /> Graph view
      </Button>
      <Button variant="outline" onclick={() => (ui.paletteOpen = true)}>
        <Keyboard class="h-4 w-4" /> Commands
      </Button>
    </div>

    {#if recent.length > 0}
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Recent
      </h2>
      <ul class="divide-y divide-border rounded-lg border border-border">
        {#each recent as n}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
              onclick={() => tabs.open(n.id)}
            >
              <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">{n.name}</div>
                <div class="truncate text-xs text-muted-foreground">{n.folder || '/'}</div>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">
                {new Date(n.modified).toLocaleDateString()}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Your vault is empty.
        <button class="text-primary underline-offset-4 hover:underline" onclick={() => commands.run('note.new')}>
          Create your first note
        </button>
        to get started.
      </div>
    {/if}
  </div>
</div>
