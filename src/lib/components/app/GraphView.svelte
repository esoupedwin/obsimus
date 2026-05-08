<script lang="ts">
  import { vault, tabs, ui, dragNote } from '$lib/state.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { onMount, onDestroy } from 'svelte';

  type Node = {
    id: string;
    label: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    degree: number;
  };
  type Edge = { source: string; target: string };

  let canvas: HTMLCanvasElement | undefined = $state();
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;

  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);

  let filter = $state('');
  let hideNeighbors = $state(false);

  // Local-graph mode: nothing visible until the user drags notes onto the canvas.
  let visibleIds = $state(new Set<string>());
  // Spawn coords for newly-added nodes so they appear at the drop point.
  let seedPositions = new Map<string, { x: number; y: number }>();

  // Visual / simulation tuning, controlled by the bottom edit bar.
  let spreadMul = $state(1);   // 0.4 .. 5    — node spacing
  let nodeSizeMul = $state(1); // 0.4 .. 2.5  — node radius multiplier
  let linkWidth = $state(1);   // 0.5 .. 4    — edge line width

  // Simulation state — mutated each frame, doesn't need fine-grained reactivity.
  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let nodeIdx = new Map<string, Node>();
  let hovered: Node | null = null;
  let dragging: Node | null = null;
  let dragOffset = { x: 0, y: 0 };
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };

  function buildGraph() {
    const f = filter.trim().toLowerCase();
    const allNotes = vault.notes;

    // Visible set = explicitly-added notes + (optionally) their direct neighbors.
    const visible = new Set<string>();
    for (const id of visibleIds) {
      if (!allNotes.has(id)) continue;
      visible.add(id);
      if (!hideNeighbors) {
        const note = allNotes.get(id)!;
        for (const t of note.links) if (allNotes.has(t)) visible.add(t);
        const inc = vault.backlinks.get(id) ?? [];
        for (const src of inc) visible.add(src);
      }
    }

    const filtered = [...visible]
      .map((id) => allNotes.get(id)!)
      .filter((n) => n && (!f || n.name.toLowerCase().includes(f)));
    const filteredIds = new Set(filtered.map((n) => n.id));

    const newEdges: Edge[] = [];
    for (const n of filtered) {
      for (const t of n.links) {
        if (filteredIds.has(t)) newEdges.push({ source: n.id, target: t });
      }
    }
    const degree = new Map<string, number>();
    for (const e of newEdges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    const filteredNodes = filtered.map<Node>((n) => {
      const old = nodeIdx.get(n.id);
      if (old) {
        return { ...old, label: n.name, degree: degree.get(n.id) ?? 0 };
      }
      const seed = seedPositions.get(n.id);
      return {
        id: n.id,
        label: n.name,
        x: seed?.x ?? (Math.random() - 0.5) * 200,
        y: seed?.y ?? (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
        degree: degree.get(n.id) ?? 0
      };
    });
    // Seed positions are one-shot — clear them once consumed.
    for (const n of filteredNodes) seedPositions.delete(n.id);

    nodes = filteredNodes;
    edges = newEdges;
    nodeIdx = new Map(nodes.map((n) => [n.id, n]));
    reheat();
  }

  /** Add a note + its direct neighbors to the graph at a screen-space drop point. */
  function addToGraph(noteId: string, screenX: number, screenY: number) {
    if (!vault.notes.has(noteId)) return;
    const w = screenToWorld(screenX, screenY);
    if (!visibleIds.has(noteId)) seedPositions.set(noteId, { x: w.x, y: w.y });

    // Seed positions for neighbors that aren't already laid out — fan around the drop point.
    const note = vault.notes.get(noteId)!;
    const inc = vault.backlinks.get(noteId) ?? [];
    const fresh = [
      ...note.links.filter((id) => vault.notes.has(id) && !nodeIdx.has(id)),
      ...inc.filter((id) => !nodeIdx.has(id) && !note.links.includes(id))
    ];
    fresh.forEach((id, i) => {
      if (seedPositions.has(id)) return;
      const angle = (i / Math.max(1, fresh.length)) * Math.PI * 2;
      const r = 110;
      seedPositions.set(id, { x: w.x + Math.cos(angle) * r, y: w.y + Math.sin(angle) * r });
    });

    visibleIds.add(noteId);
    visibleIds = new Set(visibleIds);
    reheat();
  }

  function clearGraph() {
    visibleIds = new Set();
    nodeIdx = new Map();
    seedPositions.clear();
  }

  // d3-force-style cooling: alpha decays from 1 to ~0 across ~300 ticks.
  let alpha = 1;
  const ALPHA_MIN = 0.005;
  const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300);
  const VEL_DECAY = 0.55; // per-tick velocity damping (higher = faster settle)

  function reheat() {
    alpha = Math.max(alpha, 0.6);
  }

  function tick() {
    if (alpha < ALPHA_MIN && !dragging && !isPanning) {
      // Settled — keep drawing for hover/pan/zoom but skip simulation work.
      draw();
      raf = requestAnimationFrame(tick);
      return;
    }
    alpha += (0 - alpha) * ALPHA_DECAY;

    // Force tuning — repulsion scales with node count so dense graphs spread out
    const N = nodes.length;
    const REPULSE = (200 + N * 35) * spreadMul * spreadMul;
    const SPRING_LEN = 90 * spreadMul;
    const CENTER = 0.01;
    const MIN_D = 10; // soft minimum distance — avoids singular forces when nodes overlap

    // Center pull
    for (const n of nodes) {
      n.vx += -n.x * CENTER * alpha;
      n.vy += -n.y * CENTER * alpha;
    }
    // Repulsion (Coulomb-like with min distance clamp)
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < MIN_D * MIN_D) {
          if (d2 < 0.001) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); }
          d2 = MIN_D * MIN_D;
        }
        const d = Math.sqrt(d2);
        const f = (REPULSE / d2) * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }
    // Springs — strength tapered by endpoint degree so hub nodes don't crush the layout
    for (const e of edges) {
      const a = nodeIdx.get(e.source);
      const b = nodeIdx.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const k = 1 / (1 + Math.min(a.degree, b.degree));
      const f = (d - SPRING_LEN) * k * alpha;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    const MAX_VEL = 20;
    for (const n of nodes) {
      if (dragging === n) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= 1 - VEL_DECAY;
      n.vy *= 1 - VEL_DECAY;
      // clamp speed
      const speed = Math.hypot(n.vx, n.vy);
      if (speed > MAX_VEL) {
        n.vx = (n.vx / speed) * MAX_VEL;
        n.vy = (n.vy / speed) * MAX_VEL;
      }
      n.x += n.vx;
      n.y += n.vy;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function draw() {
    if (!ctx || !canvas) return;
    // ctx is pre-multiplied by setTransform(dpr,…) in resize(), so we work in CSS pixels here.
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + panX, H / 2 + panY);
    ctx.scale(scale, scale);

    // Edges
    const cs = getComputedStyle(document.documentElement);
    const muted = `hsl(${cs.getPropertyValue('--muted-foreground')} / 0.4)`;
    const primary = `hsl(${cs.getPropertyValue('--primary')})`;
    const fg = `hsl(${cs.getPropertyValue('--foreground')})`;

    ctx.strokeStyle = muted;
    ctx.lineWidth = linkWidth;
    ctx.beginPath();
    for (const e of edges) {
      const a = nodeIdx.get(e.source);
      const b = nodeIdx.get(e.target);
      if (!a || !b) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Nodes — radius scales by sqrt(degree) so hubs stay readable without ballooning
    const activeId = tabs.active?.noteId;
    const showLabels = scale > 0.9 || nodes.length < 40;
    for (const n of nodes) {
      const radius = (3 + Math.sqrt(n.degree) * 1.4) * nodeSizeMul;
      const isActive = n.id === activeId;
      const isHover = n === hovered;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive || isHover
        ? primary
        : `hsl(${cs.getPropertyValue('--foreground')} / 0.85)`;
      ctx.fill();
      if (isActive || isHover) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Label
      if (isHover || isActive || showLabels) {
        ctx.fillStyle = fg;
        ctx.font = '11px -apple-system, "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(n.label, n.x, n.y + radius + 3);
      }
    }
    ctx.restore();
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function screenToWorld(x: number, y: number) {
    if (!canvas) return { x, y };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2 + panX;
    const cy = rect.height / 2 + panY;
    return { x: (x - rect.left - cx) / scale, y: (y - rect.top - cy) / scale };
  }

  function nodeAt(wx: number, wy: number): Node | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const drawn = (3 + Math.sqrt(n.degree) * 1.4) * nodeSizeMul;
      const hit = Math.max(8, drawn + 4); // generous hit radius
      const dx = n.x - wx;
      const dy = n.y - wy;
      if (dx * dx + dy * dy <= hit * hit) return n;
    }
    return null;
  }

  // Track screen-space movement to distinguish click from drag.
  let mouseDownAt = { x: 0, y: 0 };
  let movedSinceDown = 0;
  const CLICK_THRESHOLD = 4; // pixels (screen space)

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    mouseDownAt = { x: e.clientX, y: e.clientY };
    movedSinceDown = 0;
    const w = screenToWorld(e.clientX, e.clientY);
    const n = nodeAt(w.x, w.y);
    if (n) {
      dragging = n;
      dragOffset = { x: w.x - n.x, y: w.y - n.y };
      n.vx = 0;
      n.vy = 0;
      if (canvas) canvas.style.cursor = 'grabbing';
      reheat();
    } else {
      isPanning = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      if (canvas) canvas.style.cursor = 'grabbing';
    }
  }
  function onMouseMove(e: MouseEvent) {
    movedSinceDown = Math.max(
      movedSinceDown,
      Math.hypot(e.clientX - mouseDownAt.x, e.clientY - mouseDownAt.y)
    );
    const w = screenToWorld(e.clientX, e.clientY);
    if (dragging) {
      dragging.x = w.x - dragOffset.x;
      dragging.y = w.y - dragOffset.y;
      reheat();
    } else if (isPanning) {
      panX += e.clientX - lastMouse.x;
      panY += e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
    } else {
      hovered = nodeAt(w.x, w.y);
      if (canvas) canvas.style.cursor = hovered ? 'pointer' : 'grab';
    }
  }
  function onMouseUp(e: MouseEvent) {
    const wasClick = movedSinceDown < CLICK_THRESHOLD;
    if (dragging && wasClick) {
      tabs.open(dragging.id);
    }
    // If it was a real drag, dropped node keeps its position; sim resumes around it.
    dragging = null;
    isPanning = false;
    if (canvas) canvas.style.cursor = hovered ? 'pointer' : 'grab';
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.max(0.2, Math.min(3, scale * factor));
  }

  // Rebuild on vault / filter / mode / visibility changes
  $effect(() => {
    void vault.notes;
    void filter;
    void hideNeighbors;
    void visibleIds;
    buildGraph();
  });

  // Reheat the simulation when spread changes so the new spacing is reached.
  $effect(() => {
    void spreadMul;
    reheat();
  });

  let unregisterDrop: (() => void) | null = null;

  onMount(() => {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    buildGraph();
    raf = requestAnimationFrame(tick);

    unregisterDrop = dragNote.registerDropHandler((noteId, x, y) => {
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false;
      addToGraph(noteId, x, y);
      return true;
    });
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    unregisterDrop?.();
  });

  /* Show the dashed highlight while a note drag is hovering this canvas. */
  const dragOver = $derived.by(() => {
    if (!dragNote.active || !canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return (
      dragNote.x >= rect.left &&
      dragNote.x <= rect.right &&
      dragNote.y >= rect.top &&
      dragNote.y <= rect.bottom
    );
  });
</script>

<div
  class="relative h-full w-full bg-background"
  role="region"
  aria-label="Graph canvas"
>
  <div class="absolute left-3 top-3 z-10 flex w-72 flex-col gap-2 rounded-lg border border-border bg-popover/90 p-3 shadow-lg backdrop-blur">
    <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local graph</div>
    <Input bind:value={filter} placeholder="Filter notes…" />
    <label class="flex cursor-pointer items-center gap-2 text-xs">
      <input type="checkbox" bind:checked={hideNeighbors} />
      Hide neighbor notes
    </label>
    <div class="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onclick={() => { scale = 1; panX = 0; panY = 0; reheat(); }}>
        Reset view
      </Button>
      <span class="text-[10px] text-muted-foreground">{nodes.length} nodes · {edges.length} edges</span>
    </div>
    <p class="text-[10px] leading-snug text-muted-foreground">
      Drag a file from the left panel onto the canvas · click a node to open · drag a node to move it · scroll to zoom
    </p>
  </div>

  <canvas
    bind:this={canvas}
    class="h-full w-full"
    style="cursor: grab"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    onwheel={onWheel}
  ></canvas>

  {#if dragOver}
    <div class="pointer-events-none absolute inset-0 z-20 border-2 border-dashed border-primary/60 bg-primary/5"></div>
  {/if}

  {#if visibleIds.size === 0}
    <div class="pointer-events-none absolute inset-0 grid place-items-center">
      <div class="text-center text-muted-foreground">
        <div class="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full border border-dashed border-border opacity-70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6">
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="18" cy="7" r="2.5" />
            <circle cx="12" cy="18" r="2.5" />
            <line x1="8" y1="7" x2="15.5" y2="7.5" />
            <line x1="7" y1="8" x2="11" y2="15.5" />
            <line x1="17" y1="9" x2="13" y2="15.5" />
          </svg>
        </div>
        <p class="text-sm font-medium">Empty graph</p>
        <p class="mt-1 text-xs">Drag a note from the left sidebar onto this canvas to start exploring.</p>
      </div>
    </div>
  {/if}

  <!-- Bottom edit bar -->
  <div
    class="absolute inset-x-0 bottom-0 z-10 border-t border-border bg-popover/85 px-4 py-2.5 backdrop-blur"
  >
    <div class="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2">
      <div class="flex min-w-[180px] flex-1 items-center gap-2">
        <label for="g-spread" class="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">
          Spread
        </label>
        <input
          id="g-spread"
          type="range"
          min="0.4"
          max="5"
          step="0.05"
          bind:value={spreadMul}
          class="flex-1 accent-[hsl(var(--primary))]"
        />
        <span class="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {spreadMul.toFixed(2)}×
        </span>
      </div>

      <div class="flex min-w-[180px] flex-1 items-center gap-2">
        <label for="g-node" class="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">
          Node size
        </label>
        <input
          id="g-node"
          type="range"
          min="0.4"
          max="2.5"
          step="0.05"
          bind:value={nodeSizeMul}
          class="flex-1 accent-[hsl(var(--primary))]"
        />
        <span class="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {nodeSizeMul.toFixed(2)}×
        </span>
      </div>

      <div class="flex min-w-[180px] flex-1 items-center gap-2">
        <label for="g-link" class="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">
          Link width
        </label>
        <input
          id="g-link"
          type="range"
          min="0.5"
          max="4"
          step="0.1"
          bind:value={linkWidth}
          class="flex-1 accent-[hsl(var(--primary))]"
        />
        <span class="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {linkWidth.toFixed(1)}px
        </span>
      </div>

      <button
        type="button"
        class="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
        onclick={() => { spreadMul = 1; nodeSizeMul = 1; linkWidth = 1; }}
      >
        Reset
      </button>
      <button
        type="button"
        class="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        disabled={visibleIds.size === 0}
        onclick={clearGraph}
      >
        Clear graph
      </button>
    </div>
  </div>
</div>
