<script lang="ts">
  import type { Tab } from '$lib/types';
  import { vault, tabs, ui } from '$lib/state.svelte';
  import { renderMarkdown } from '$lib/markdown/render';
  import { debounce } from '$lib/utils';
  import { onDestroy, tick } from 'svelte';

  type Props = { tab: Tab };
  let { tab }: Props = $props();

  const note = $derived(tab.noteId ? vault.notes.get(tab.noteId) ?? null : null);

  let value = $state('');
  let initialized = false;
  let textarea: HTMLTextAreaElement | undefined = $state();
  let saving = $state(false);

  $effect(() => {
    if (note && !initialized) {
      value = note.content;
      initialized = true;
    }
  });

  const save = debounce(async (id: string, text: string) => {
    saving = true;
    try {
      await vault.saveNote(id, text);
    } finally {
      saving = false;
    }
  }, 400);

  function onInput(e: Event) {
    value = (e.currentTarget as HTMLTextAreaElement).value;
    if (note) save(note.id, value);
  }

  function onKeydown(e: KeyboardEvent) {
    // Indent with Tab
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const ta = e.currentTarget as HTMLTextAreaElement;
      const { selectionStart: s, selectionEnd: en } = ta;
      const before = value.slice(0, s);
      const after = value.slice(en);
      value = before + '  ' + after;
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 2;
      });
      if (note) save(note.id, value);
    }
    // Wikilink autocomplete: typing [[
    // (light approach — just helps insertion)
  }

  // Render markdown for preview / live
  const html = $derived.by(() => {
    if (!note) return '';
    if (ui.editorMode === 'source') return '';
    return renderMarkdown(value, (t) => vault.resolve(t));
  });

  function onPreviewClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    const linkEl = t.closest('a.internal-link') as HTMLAnchorElement | null;
    if (linkEl) {
      e.preventDefault();
      const target = linkEl.dataset.link ?? '';
      const id = vault.resolve(target);
      if (id) {
        tabs.open(id, { newTab: e.ctrlKey || e.metaKey });
      } else {
        // Create note from unresolved link
        const created = vault.createNote('', target.replace(/[\\/:*?"<>|]/g, ''));
        created.then((nid) => nid && tabs.open(nid));
      }
      return;
    }
    const tagEl = t.closest('a.tag') as HTMLAnchorElement | null;
    if (tagEl) {
      e.preventDefault();
      ui.leftOpen = true;
      ui.leftTab = 'tags';
    }
  }

  const filePath = $derived(note?.id ?? '');
  const showSource = $derived(ui.editorMode === 'source' || ui.editorMode === 'live');
  const showPreview = $derived(ui.editorMode === 'preview' || ui.editorMode === 'live');
</script>

{#if note}
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border px-4 text-xs text-muted-foreground">
      <span class="truncate">{filePath}</span>
      <span class="flex-1"></span>
      {#if saving}
        <span class="text-primary">saving…</span>
      {:else}
        <span>saved</span>
      {/if}
    </div>

    <div class="flex min-h-0 flex-1">
      {#if ui.editorMode === 'source'}
        <textarea
          bind:this={textarea}
          class="cm-editor"
          spellcheck="false"
          {value}
          oninput={onInput}
          onkeydown={onKeydown}
          placeholder="Start writing…"
        ></textarea>
      {:else if ui.editorMode === 'preview'}
        <div class="h-full w-full overflow-y-auto" onclick={onPreviewClick} role="document">
          <article class="md-preview">
            <h1 class="!mt-0">{note.name}</h1>
            {@html html}
          </article>
        </div>
      {:else}
        <!-- live: split editor + preview -->
        <div class="flex min-h-0 flex-1">
          <div class="flex min-w-0 flex-1 border-r border-border">
            <textarea
              class="cm-editor"
              spellcheck="false"
              {value}
              oninput={onInput}
              onkeydown={onKeydown}
              placeholder="Start writing…"
            ></textarea>
          </div>
          <div class="flex min-w-0 flex-1 overflow-y-auto" onclick={onPreviewClick} role="document">
            <article class="md-preview">
              <h1 class="!mt-0">{note.name}</h1>
              {@html html}
            </article>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
