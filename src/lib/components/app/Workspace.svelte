<script lang="ts">
  import { tabs, vault } from '$lib/state.svelte';
  import TabBar from './TabBar.svelte';
  import EditorPane from './EditorPane.svelte';
  import GraphView from './GraphView.svelte';
  import Welcome from './Welcome.svelte';

  const active = $derived(tabs.active);
</script>

<main class="flex min-w-0 flex-1 flex-col bg-background">
  <TabBar />

  <div class="min-h-0 flex-1">
    {#if !active}
      <Welcome />
    {:else if active.mode === 'graph'}
      <GraphView />
    {:else if active.mode === 'welcome' || !active.noteId}
      <Welcome />
    {:else}
      {#key active.id + ':' + active.noteId}
        <EditorPane tab={active} />
      {/key}
    {/if}
  </div>
</main>
