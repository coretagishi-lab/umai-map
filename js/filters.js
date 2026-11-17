// 検索語と絞り込み条件（エリア／種類／出典）。選択肢はデータから自動で作る。
import { SEARCH_DEBOUNCE_MS } from './config.js';
import { categoryLabel } from './labels.js';

const FIELDS = {
  area: (p) => p.area || '未分類',
  kind: (p) => categoryLabel(p), // 種類＝飲食店／その他
  // 出典「行きたい場所リスト」＝金色リングの店（wishlist）。タグ・リングと同じ数え方にそろえる
  source: (p) => (p.wishlist ? '行きたい場所リスト' : p.source || '未分類'),
};

export function createFilters(places, onChange) {
  const state = { q: '', area: new Set(), kind: new Set(), source: new Set() };

  const $ = (id) => document.getElementById(id);
  const panel = $('filters');
  const toggle = $('filter-toggle');
  const badge = $('filter-badge');
  const input = $('q');
  const qClear = $('q-clear');
  const active = $('active-filters');
  const summary = $('active-summary');

  // 選択肢：件数の多い順
  for (const [field, getter] of Object.entries(FIELDS)) {
    const counts = new Map();
    places.forEach((p) => counts.set(getter(p), (counts.get(getter(p)) || 0) + 1));
    const box = panel.querySelector(`[data-filter="${field}"]`);
    const opts = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
    box.innerHTML = '';
    for (const [value, n] of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.value = value;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `${escapeHtml(value)}<span class="chip__n">${n}</span>`;
      b.addEventListener('click', () => {
        const set = state[field];
        set.has(value) ? set.delete(value) : set.add(value);
        b.setAttribute('aria-pressed', String(set.has(value)));
        changed();
      });
      box.appendChild(b);
    }
    box.closest('.filters__group').hidden = opts.length <= 1;

    // 選択肢が多いとき（エリアなど）は上位だけ出して「すべて表示」で広げる
    const limit = Number(box.dataset.collapse || 0);
    if (limit && opts.length > limit + 3) {
      box.classList.add('chips--collapsed');
      box.style.setProperty('--limit', limit);
      [...box.children].forEach((c, i) => { if (i >= limit) c.classList.add('chip--extra'); });
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'chip chip--more';
      more.textContent = `すべて表示（${opts.length}）`;
      more.addEventListener('click', () => { box.classList.remove('chips--collapsed'); more.remove(); });
      box.appendChild(more);
    }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  let timer;
  input.addEventListener('input', () => {
    qClear.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = input.value.trim(); changed(); }, SEARCH_DEBOUNCE_MS);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  qClear.addEventListener('click', () => {
    input.value = ''; qClear.hidden = true; state.q = ''; changed(); input.focus();
  });

  $('filters-clear').addEventListener('click', clearAll);
  function clearAll() {
    ['area', 'kind', 'source'].forEach((f) => state[f].clear());
    panel.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    input.value = ''; qClear.hidden = true; state.q = '';
    changed();
  }

  function changed() {
    const n = state.area.size + state.kind.size + state.source.size;
    badge.hidden = n === 0;
    badge.textContent = String(n);
    const parts = ['area', 'kind', 'source'].flatMap((f) => [...state[f]]);
    if (state.q) parts.unshift(`「${state.q}」`);
    active.hidden = parts.length === 0;
    summary.textContent = parts.join('・');
    onChange(apply());
  }

  function apply() {
    const words = toKey(state.q).split(/\s+/).filter(Boolean);
    return places.filter((p) => {
      for (const f of ['area', 'kind', 'source']) {
        if (state[f].size && !state[f].has(FIELDS[f](p))) return false;
      }
      if (words.length) {
        const hay = p._search ??= toKey([p.name, p.address, p.memo, p.kind, p.area].join(' '));
        return words.every((w) => hay.includes(w));
      }
      return true;
    });
  }

  return { apply, setOpen, clearAll };
}

// 全角・半角、カタカナ・ひらがな、大文字・小文字の違いを無視して比べる
export function toKey(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
