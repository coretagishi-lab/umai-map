// 営業時間データの読み替え（画面とツールの両方から使う。画面の部品は hours.js）
export const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const EN = { sun: '日', mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', holiday: '祝', note: '備考', source: '出典', checked: '確認日' };
export const ORDER = ['月', '火', '水', '木', '金', '土', '日', '祝'];

/** 英語キーを日本語キーにそろえる */
export function normalizeHours(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = EN[k.toLowerCase?.()] || k;
    if (v !== null && v !== undefined && String(v).trim() !== '') out[key] = String(v).trim();
  }
  return ORDER.some((d) => out[d]) ? out : null;
}

