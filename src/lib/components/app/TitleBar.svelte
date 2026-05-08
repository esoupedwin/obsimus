<script lang="ts">
  import { vault, ui, tabs, commands } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  import Separator from '$lib/components/ui/Separator.svelte';
  import {
    PanelLeft,
    PanelRight,
    Search,
    Plus,
    Network,
    Sun,
    Moon,
    Command,
    FolderOpen
  } from 'lucide-svelte';
</script>

<header
  class="flex h-11 shrink-0 items-center gap-1 border-b border-border bg-sidebar/40 px-2 select-none"
>
  <div class="flex items-center gap-2 pl-1 pr-3">
    <div class="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold shadow">
      O
    </div>
    <span class="text-sm font-semibold tracking-tight">Obsimus</span>
    {#if vault.rootName}
      <span class="text-xs text-muted-foreground">/ {vault.rootName}</span>
    {/if}
  </div>

  <Separator orientation="vertical" class="mx-1 h-5" />

  <Tooltip label="Toggle left sidebar (Ctrl+B)">
    <Button variant="ghost" size="iconsm" onclick={() => (ui.leftOpen = !ui.leftOpen)}>
      <PanelLeft class="h-4 w-4" />
    </Button>
  </Tooltip>
  <Tooltip label="Toggle right sidebar">
    <Button variant="ghost" size="iconsm" onclick={() => (ui.rightOpen = !ui.rightOpen)}>
      <PanelRight class="h-4 w-4" />
    </Button>
  </Tooltip>

  <Separator orientation="vertical" class="mx-1 h-5" />

  {#if vault.ready}
    <Tooltip label="New note (Ctrl+N)">
      <Button variant="ghost" size="iconsm" onclick={() => commands.run('note.new')}>
        <Plus class="h-4 w-4" />
      </Button>
    </Tooltip>
    <Tooltip label="Quick switcher (Ctrl+O)">
      <Button variant="ghost" size="iconsm" onclick={() => (ui.switcherOpen = true)}>
        <Search class="h-4 w-4" />
      </Button>
    </Tooltip>
    <Tooltip label="Graph view (Ctrl+G)">
      <Button variant="ghost" size="iconsm" onclick={() => tabs.openGraph()}>
        <Network class="h-4 w-4" />
      </Button>
    </Tooltip>
  {/if}

  <div class="flex-1"></div>

  {#if vault.ready}
    <Tooltip label="Command palette (Ctrl+P)">
      <Button variant="outline" size="sm" onclick={() => (ui.paletteOpen = true)}>
        <Command class="h-3.5 w-3.5" />
        <span class="text-xs text-muted-foreground">Ctrl+P</span>
      </Button>
    </Tooltip>
  {:else}
    <Tooltip label="Open a folder as a vault">
      <Button variant="default" size="sm" onclick={() => vault.openVault()}>
        <FolderOpen class="h-3.5 w-3.5" />
        Open vault
      </Button>
    </Tooltip>
  {/if}

  <Separator orientation="vertical" class="mx-1 h-5" />
  <Tooltip label="Toggle theme">
    <Button variant="ghost" size="iconsm" onclick={() => ui.toggleTheme()}>
      {#if ui.theme === 'dark'}
        <Sun class="h-4 w-4" />
      {:else}
        <Moon class="h-4 w-4" />
      {/if}
    </Button>
  </Tooltip>
</header>
