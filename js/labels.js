import { LABELS } from './config.js';

/** 「種類」として表示する文字：ジャンルがあればジャンル、なければ飲食店／その他 */
export function kindLabel(p) {
  return p.kind || LABELS.category[p.category] || 'その他';
}
