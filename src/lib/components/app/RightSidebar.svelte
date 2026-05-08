<script lang="ts">
  import { ui } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BacklinksPanel from './BacklinksPanel.svelte';
  import OutlinePanel from './OutlinePanel.svelte';
  import { Link, List } from 'lucide-svelte';
</script>

<aside class="flex w-64 shrink-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground">
  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-sidebar-border px-1">
    <Button
      variant={ui.rightTab === 'backlinks' ? 'secondary' : 'ghost'}
      size="iconsm"
      onclick={() => (ui.rightTab = 'backlinks')}
      aria-label="Backlinks"
    >
      <Link class="h-4 w-4" />
    </Button>
    <Button
      variant={ui.rightTab === 'outline' ? 'secondary' : 'ghost'}
      size="iconsm"
      onclick={() => (ui.rightTab = 'outline')}
      aria-label="Outline"
    >
      <List class="h-4 w-4" />
    </Button>
    <div class="flex-1"></div>
    <span class="pr-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      {ui.rightTab}
    </span>
  </div>
  <div class="min-h-0 flex-1 overflow-hidden">
    {#if ui.rightTab === 'backlinks'}
      <BacklinksPanel />
    {:else}
      <OutlinePanel />
    {/if}
  </div>
</aside>
