// 一覧ボトムシート：peek（見出しだけ）／mid（半分）／full（ほぼ全画面）。
// ハンドルのドラッグで追従、指を離すと近い段にスナップ。タップで peek→mid→full→peek。
import { SHEET } from './config.js';

const ORDER = ['peek', 'mid', 'full'];

export function createSheet(el, handle, { onChange } = {}) {
  let state = 'peek';
  let heights = {};

  function measure() {
    const vh = window.innerHeight;
    heights = { peek: SHEET.peekPx, mid: Math.round(vh * SHEET.midRatio), full: Math.round(vh * SHEET.fullRatio) };
    el.style.height = `${heights.full}px`;
    place(heights[state], false);
  }

  function place(visible, animate = true) {
    el.classList.toggle('sheet--anim', animate);
    el.style.transform = `translateY(${heights.full - visible}px)`;
    // 一覧がスクロールできる高さ＝今見えている高さ（見えない部分までスクロールしないように）
    el.style.setProperty('--vis', `${visible}px`);
  }

  function set(next, animate = true) {
    state = next;
    el.dataset.state = next;
    place(heights[next], animate);
    onChange?.(next, heights[next]);
  }

  // ドラッグ
  let startY = 0, startVis = 0, dragging = false, moved = false, lastY = 0, lastT = 0, vel = 0;
  handle.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startY = lastY = e.clientY; lastT = performance.now(); vel = 0;
    startVis = heights[state];
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 4) moved = true;
    const now = performance.now();
    vel = (e.clientY - lastY) / Math.max(1, now - lastT);
    lastY = e.clientY; lastT = now;
    const vis = Math.min(heights.full, Math.max(heights.peek, startVis - dy));
    place(vis, false);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) { // タップ
      set(ORDER[(ORDER.indexOf(state) + 1) % ORDER.length]);
      return;
    }
    const vis = startVis - (e.clientY - startY);
    // 速いフリックは向きを優先
    if (Math.abs(vel) > 0.5) {
      // 今の位置から、はじいた向きにある次の段へ
      const next = vel < 0
        ? ORDER.find((s) => heights[s] > vis + 8) ?? 'full'
        : [...ORDER].reverse().find((s) => heights[s] < vis - 8) ?? 'peek';
      return set(next);
    }
    const nearest = ORDER.reduce((a, b) => (Math.abs(heights[b] - vis) < Math.abs(heights[a] - vis) ? b : a));
    set(nearest);
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(ORDER[(ORDER.indexOf(state) + 1) % 3]); }
  });

  window.addEventListener('resize', measure);
  measure();

  return {
    get state() { return state; },
    set,
    visibleHeight: () => heights[state],
  };
}
