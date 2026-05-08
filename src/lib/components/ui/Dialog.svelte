<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  type Props = {
    open: boolean;
    onclose?: () => void;
    class?: string;
    align?: 'center' | 'top';
    children: Snippet;
  };
  let { open = $bindable(false), onclose, class: className, align = 'center', children }: Props = $props();

  function close() {
    open = false;
    onclose?.();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-sm fade-in"
    class:items-center={align === 'center'}
    class:items-start={align === 'top'}
    class:pt-24={align === 'top'}
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
    onkeydown={(e) => { if (e.key === 'Escape') close(); }}
    tabindex="-1"
  >
    <div class={cn('w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-xl', className)}>
      {@render children()}
    </div>
  </div>
{/if}
