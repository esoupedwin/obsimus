<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import { vault } from '$lib/state.svelte';
  import { isSupported } from '$lib/fs/vault-fs';
  import { FolderOpen, FolderPlus, AlertTriangle } from 'lucide-svelte';

  const supported = $derived(isSupported());
</script>

<div class="flex min-h-0 flex-1 items-center justify-center">
  <div class="w-full max-w-xl rounded-2xl border border-border bg-card p-10 shadow-sm">
    <div class="mb-6 flex items-center gap-3">
      <div class="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground text-xl font-bold shadow">
        O
      </div>
      <div>
        <h1 class="text-xl font-semibold">Welcome to Obsimus</h1>
        <p class="text-sm text-muted-foreground">A local-first markdown workspace.</p>
      </div>
    </div>

    {#if !supported}
      <div class="mb-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p class="font-medium">Browser not supported</p>
          <p class="opacity-80">Obsimus uses the File System Access API. Please open this page in Chrome, Edge, Brave, or Opera.</p>
        </div>
      </div>
    {/if}

    <p class="text-sm text-muted-foreground mb-6">
      Pick a folder on your disk. Your notes stay as plain <code class="rounded bg-muted px-1 py-0.5 text-xs">.md</code> files
      &mdash; Obsimus reads and writes them in place. No cloud, no lock-in.
    </p>

    <div class="flex flex-wrap gap-2">
      <Button onclick={() => vault.openVault()} disabled={!supported}>
        <FolderOpen class="h-4 w-4" />
        Open existing folder
      </Button>
      <Button variant="outline" onclick={() => vault.openVault()} disabled={!supported}>
        <FolderPlus class="h-4 w-4" />
        Create new vault…
      </Button>
    </div>

    <div class="mt-8 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+P</kbd> Command palette</div>
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+O</kbd> Quick switcher</div>
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+N</kbd> New note</div>
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+G</kbd> Graph view</div>
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+B</kbd> Toggle sidebar</div>
      <div><kbd class="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl+Shift+F</kbd> Search</div>
    </div>
  </div>
</div>
