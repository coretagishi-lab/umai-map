// 下部の詳細カード（店／銭湯）
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
        ${p.address ? `<p class="card__addr">${h(p.address)}${p.approx ? '<span class="approx">（位置はおおよそ）</span>' : ''}</p>` : ''}
        ${p.memo ? `<p class="card__memo">${h(p.memo)}</p>` : ''}
        <div class="card__actions">
          ${p.tabelogUrl ? `<a class="btn btn--primary" href="${h(p.tabelogUrl)}" target="_blank" rel="noopener">食べログを開く（電話・予約）</a>` : ''}
          ${p.instagramUrl ? `<a class="btn" href="${h(p.instagramUrl)}" target="_blank" rel="noopener">Instagramの元投稿</a>` : ''}
          <a class="btn" href="${mapsUrl(p)}" target="_blank" rel="noopener">Googleマップで開く</a>
        </div>
        ${p.author ? `<p class="card__credit">紹介：@${h(p.author)}</p>` : ''}
      </div>`;
    open();
  }

  /** 追加レイヤー（銭湯など）の1件 */
  function showLayerItem(x) {
    const label = x.pack.types?.[x.type]?.label || x.pack.name;
    const color = x.pack.types?.[x.type]?.color || '';
    body.innerHTML = `
      <div class="card__main">
        <div class="card__tags">
          <span class="tag tag--layer" style="--c:${h(color)}">${h(label)}</span>
          ${x.area ? `<span class="tag">${h(x.area)}</span>` : ''}
        </div>
        <h2 class="card__name">${h(x.name)}</h2>
        ${x.address ? `<p class="card__addr">${h(x.address)}</p>` : ''}
        <div class="card__actions">
          <a class="btn" href="${mapsUrl(x)}" target="_blank" rel="noopener">Googleマップで開く</a>
          ${x.url ? `<a class="btn" href="${h(x.url)}" target="_blank" rel="noopener">情報元のページ</a>` : ''}
        </div>
        ${x.pack.credit ? `<p class="card__credit">出典：${h(x.pack.credit)}</p>` : ''}
      </div>`;
    open();
  }

  function open() { el.hidden = false; el.scrollTop = 0; requestAnimationFrame(() => el.classList.add('card--open')); }
  function close() { el.classList.remove('card--open'); el.hidden = true; }
  const height = () => (el.hidden ? 0 : el.getBoundingClientRect().height);

  return { showPlace, showLayerItem, close, height, isOpen: () => !el.hidden };
}
