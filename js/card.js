// 下部の詳細カード（店／銭湯）
import { LABELS } from './config.js';
import { thumbUrl } from './data.js';
import { kindLabel } from './labels.js';
import { escapeHtml as h } from './filters.js';

const mapsUrl = (x) => `https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`;

export function createCard(el, body, { onClose } = {}) {
  document.getElementById('card-close').addEventListener('click', () => onClose?.());

  // 下にスワイプで閉じる
  let y0 = null;
  el.addEventListener('touchstart', (e) => { if (el.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) el.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    y0 = null;
    el.style.transform = '';
    if (dy > 80) onClose?.();
  });

  function showPlace(p) {
    const img = thumbUrl(p.thumb);
    body.innerHTML = `
      ${img ? `<div class="card__img"><img src="${h(img)}" alt="" decoding="async" onerror="this.parentNode.remove()"></div>` : ''}
      <div class="card__main">
        <div class="card__tags">
          <span class="tag tag--${p.category}">${h(kindLabel(p))}</span>
          ${p.area ? `<span class="tag">${h(p.area)}</span>` : ''}
          ${p.wishlist ? '<span class="tag tag--wish">行きたい場所リスト</span>' : ''}
        </div>
        <h2 class="card__name">${h(p.name)}</h2>
        ${p.address ? `<p class="card__addr">${h(p.address)}</p>` : ''}
        ${p.memo ? `<p class="card__memo">${h(p.memo)}</p>` : ''}
        <div class="card__actions">
          ${p.tabelogUrl ? `<a class="btn btn--primary" href="${h(p.tabelogUrl)}" target="_blank" rel="noopener">食べログを開く（電話・予約）</a>` : ''}
          ${p.instagramUrl ? `<a class="btn" href="${h(p.instagramUrl)}" target="_blank" rel="noopener">Instagramの元投稿</a>` : ''}
          <a class="btn" href="${mapsUrl(p)}" target="_blank" rel="noopener">Googleマップで開く</a>
        </div>
      </div>`;
    open();
  }

  function showSento(s) {
    body.innerHTML = `
      <div class="card__main">
        <div class="card__tags"><span class="tag tag--${s.type}">${h(LABELS.sentoType[s.type])}</span></div>
        <h2 class="card__name">${h(s.name)}</h2>
        ${s.address ? `<p class="card__addr">${h(s.address)}</p>` : ''}
        <div class="card__actions">
          ${s.url ? `<a class="btn" href="${h(s.url)}" target="_blank" rel="noopener">公式・紹介ページ</a>` : ''}
          <a class="btn" href="${mapsUrl(s)}" target="_blank" rel="noopener">Googleマップで開く</a>
        </div>
      </div>`;
    open();
  }

  function open() { el.hidden = false; el.scrollTop = 0; requestAnimationFrame(() => el.classList.add('card--open')); }
  function close() { el.classList.remove('card--open'); el.hidden = true; }
  const height = () => (el.hidden ? 0 : el.getBoundingClientRect().height);

  return { showPlace, showSento, close, height, isOpen: () => !el.hidden };
}
