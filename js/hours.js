// 営業時間の表示。データは places.json の各店の "hours"（ふわが調べて記入する）。
//
// 形（曜日ごとの文字列。書いてある曜日だけ表示される）:
//   "hours": {
//     "月": "11:30〜14:00 / 17:30〜23:00 LO.22:30",
//     "火": "定休日",
//     ...,
//     "祝": "17:00〜22:00",          // 祝日（あれば）
//     "備考": "不定休あり。ランチは火〜木のみ",
//     "出典": "食べログ",
//     "確認日": "2026-11-20"
//   }
// 英語の曜日キー（mon, tue…）でも読める。
import { escapeHtml as h } from './filters.js';

import { normalizeHours, DAYS, ORDER } from './hours-data.js';

export { normalizeHours };

/** カードに入れるHTML。今日の曜日を先頭に出し、タップで全曜日を開く */
export function hoursHtml(hours, now = new Date()) {
  if (!hours) return '<p class="hours hours--none">営業時間：未登録</p>';
  const today = DAYS[now.getDay()];
  const todayText = hours[today] || '記載なし';
  const closed = /定休|休み|休業/.test(todayText);
  const rows = ORDER.filter((d) => hours[d]).map((d) => `
      <li class="${d === today ? 'is-today' : ''}"><span class="hours__day">${d === '祝' ? '祝日' : d}</span><span>${h(hours[d])}</span></li>`).join('');
  const foot = [hours['備考'], hours['出典'] && `出典：${hours['出典']}`, hours['確認日'] && `確認：${hours['確認日']}`]
    .filter(Boolean).map((t) => `<p class="hours__note">${h(t)}</p>`).join('');
  return `
    <details class="hours">
      <summary><span class="hours__label${closed ? ' is-closed' : ''}">本日（${today}）</span><span class="hours__today">${h(todayText)}</span><span class="hours__chev" aria-hidden="true"></span></summary>
      <ul class="hours__list">${rows}</ul>
      ${foot}
    </details>`;
}
