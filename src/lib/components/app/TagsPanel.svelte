<script lang="ts">
  import { vault, tabs } from '$lib/state.svelte';
  import { Hash, FileText } from 'lucide-svelte';
  import Input from '$lib/components/ui/Input.svelte';

  let query = $state('');
  let openTag = $state<string | null>(null);

  const tagList = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return [...vault.tagCounts.entries()]
      .filter(([t]) => !q || t.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  });

  function notesForTag(tag: string) {
    return [...vault.notes.values()].filter((n) => n.tags.includes(tag));
  }
</script>

<div class="flex h-full flex-col">
  <div class="border-b border-sidebar-border p-2">
    <Input bind:value={query} placeholder="Filter tags…" />
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto p-1">
    {#if tagList.length === 0}
      <p class="px-3 py-3 text-xs text-muted-foreground">No tags.</p>
    {:else}
      <ul class="space-y-0.5">
        {#each tagList as [tag, count] (tag)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left hover:bg-sidebar-accent"
              onclick={() => (openTag = openTag === tag ? null : tag)}
            >
              <Hash class="h-3 w-3 shrink-0 text-muted-foreground" />
              <span class="min-w-0 flex-1 truncate text-[13px]">{tag}</span>
              <span class="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{count}</span>
            </button>
            {#if openTag === tag}
              <ul class="ml-4 my-1 border-l border-sidebar-border pl-2">
                {#each notesForTag(tag) as n (n.id)}
                  <li>
                    <button
                      class="flex w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-left hover:bg-sidebar-accent"
                      onclick={() => tabs.open(n.id)}
                    >
                      <FileText class="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span class="truncate text-[12px]">{n.name}</span>
                    </button>
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
