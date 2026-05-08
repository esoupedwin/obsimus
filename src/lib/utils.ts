import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function debounce<T extends (...a: any[]) => any>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Lightweight fuzzy match. Returns score (higher is better) or null. */
export function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let score = 0;
  let qi = 0;
  let lastMatch = -1;
  let consecutive = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 1;
      if (lastMatch === i - 1) {
        score += 4;
        consecutive++;
      } else {
        consecutive = 0;
      }
      if (i === 0 || /[\s\/_\-\.]/.test(t[i - 1])) score += 3; // word-start bonus
      lastMatch = i;
      qi++;
    }
  }
  if (qi < q.length) return null;
  // Bonus for shorter strings
  score += Math.max(0, 30 - t.length) * 0.1;
  return score;
}

/** Highlight matched chars given a query and target (returns HTML-safe segments). */
export function fuzzyHighlight(query: string, target: string): string {
  if (!query) return escapeHtml(target);
  const q = query.toLowerCase();
  const t = target;
  const lower = target.toLowerCase();
  let out = '';
  let qi = 0;
  let inMatch = false;
  for (let i = 0; i < t.length; i++) {
    const isMatch = qi < q.length && lower[i] === q[qi];
    if (isMatch && !inMatch) { out += '<mark>'; inMatch = true; }
    if (!isMatch && inMatch) { out += '</mark>'; inMatch = false; }
    out += escapeHtml(t[i]);
    if (isMatch) qi++;
  }
  if (inMatch) out += '</mark>';
  return out;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function basename(path: string) {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

export function dirname(path: string) {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(0, i) : '';
}

export function stripExt(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export function joinPath(...parts: string[]) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}
