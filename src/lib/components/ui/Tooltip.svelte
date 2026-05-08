<script lang="ts">
  import type { Snippet } from 'svelte';
  type Props = { label: string; side?: 'top' | 'bottom' | 'left' | 'right'; children: Snippet };
  let { label, side = 'bottom', children }: Props = $props();
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  function show() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (visible = true), 400);
  }
  function hide() {
    if (timer) clearTimeout(timer);
    visible = false;
  }

  const positionClass = $derived(
    side === 'bottom' ? 'left-1/2 -translate-x-1/2 top-full mt-1.5'
    : side === 'top' ? 'left-1/2 -translate-x-1/2 bottom-full mb-1.5'
    : side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-1.5'
    : 'right-full top-1/2 -translate-y-1/2 mr-1.5'
  );
</script>

<span class="relative inline-flex" onmouseenter={show} onmouseleave={hide} onfocusin={show} onfocusout={hide} role="presentation">
  {@render children()}
  {#if visible}
    <span
      class={'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md border border-border fade-in ' + positionClass}
    >{label}</span>
  {/if}
</span>
