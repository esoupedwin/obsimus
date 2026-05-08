<script lang="ts">
  import { onMount } from 'svelte';
  import { vault, tabs, ui, commands, dragNote } from '$lib/state.svelte';
  import TitleBar from '$lib/components/app/TitleBar.svelte';
  import LeftSidebar from '$lib/components/app/LeftSidebar.svelte';
  import RightSidebar from '$lib/components/app/RightSidebar.svelte';
  import Workspace from '$lib/components/app/Workspace.svelte';
  import StatusBar from '$lib/components/app/StatusBar.svelte';
  import VaultGate from '$lib/components/app/VaultGate.svelte';
  import CommandPalette from '$lib/components/app/CommandPalette.svelte';
  import QuickSwitcher from '$lib/components/app/QuickSwitcher.svelte';

  onMount(async () => {
    ui.applyTheme();
    await vault.tryReopenStored().catch(() => {});
    registerCommands();
  });

  function registerCommands() {
    commands.register([
      {
        id: 'palette.open',
        title: 'Command palette: Open',
        shortcut: 'Ctrl+P',
        run: () => (ui.paletteOpen = true)
      },
      {
        id: 'switcher.open',
        title: 'Quick switcher: Open',
        shortcut: 'Ctrl+O',
        run: () => (ui.switcherOpen = true)
      },
      {
        id: 'note.new',
        title: 'Create new note',
        shortcut: 'Ctrl+N',
        run: async () => {
          const id = await vault.createNote('', 'Untitled');
          if (id) tabs.open(id);
        }
      },
      {
        id: 'graph.open',
        title: 'Open graph view',
        shortcut: 'Ctrl+G',
        run: () => tabs.openGraph()
      },
      {
        id: 'theme.toggle',
        title: 'Toggle dark mode',
        run: () => ui.toggleTheme()
      },
      {
        id: 'leftpanel.toggle',
        title: 'Toggle left sidebar',
        shortcut: 'Ctrl+B',
        run: () => (ui.leftOpen = !ui.leftOpen)
      },
      {
        id: 'rightpanel.toggle',
        title: 'Toggle right sidebar',
        run: () => (ui.rightOpen = !ui.rightOpen)
      },
      {
        id: 'view.source',
        title: 'View: Source mode',
        run: () => (ui.editorMode = 'source')
      },
      {
        id: 'view.live',
        title: 'View: Live preview',
        run: () => (ui.editorMode = 'live')
      },
      {
        id: 'view.preview',
        title: 'View: Reading mode',
        run: () => (ui.editorMode = 'preview')
      },
      {
        id: 'vault.open',
        title: 'Open vault folder…',
        run: () => vault.openVault()
      },
      {
        id: 'vault.close',
        title: 'Close vault',
        run: () => vault.closeVault()
      },
      {
        id: 'search.focus',
        title: 'Search vault',
        shortcut: 'Ctrl+Shift+F',
        run: () => {
          ui.leftOpen = true;
          ui.leftTab = 'search';
        }
      }
    ]);
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === 'p' || e.key === 'P') {
      if (e.shiftKey) return;
      e.preventDefault();
      ui.paletteOpen = !ui.paletteOpen;
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      ui.switcherOpen = !ui.switcherOpen;
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      ui.leftOpen = !ui.leftOpen;
    } else if (e.key === 'n' || e.key === 'N') {
      if (vault.ready) {
        e.preventDefault();
        commands.run('note.new');
      }
    } else if (e.key === 'g' || e.key === 'G') {
      if (vault.ready) {
        e.preventDefault();
        tabs.openGraph();
      }
    } else if ((e.key === 'F' || e.key === 'f') && e.shiftKey) {
      e.preventDefault();
      commands.run('search.focus');
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex h-screen w-screen flex-col bg-background text-foreground">
  <TitleBar />
  <div class="flex min-h-0 flex-1">
    {#if !vault.ready}
      <VaultGate />
    {:else}
      {#if ui.leftOpen}
        <LeftSidebar />
      {/if}
      <Workspace />
      {#if ui.rightOpen}
        <RightSidebar />
      {/if}
    {/if}
  </div>
  <StatusBar />
</div>

<CommandPalette />
<QuickSwitcher />

{#if dragNote.active}
  <div
    class="pointer-events-none fixed z-[100] flex items-center gap-1.5 rounded-md border border-border bg-popover/95 px-2.5 py-1 text-xs shadow-lg backdrop-blur"
    style="left: {dragNote.x + 12}px; top: {dragNote.y + 12}px"
  >
    <span class="text-muted-foreground">📎</span>
    <span class="max-w-[260px] truncate font-medium">{dragNote.label}</span>
  </div>
{/if}
