import { LABELS } from './config.js';

/** 絞り込み「種類」の値：飲食店／その他の2分類（旧ページと同じ） */
export function categoryLabel(p) {
  return LABELS.category[p.category] || 'その他';
}

/** 一覧やカードに出す種類の表示：サブタイプ（スイーツ、サウナ・スパなど）があればそれ */
export function kindLabel(p) {
  // サブタイプ「飲食」は分類名と同じ意味なので「飲食店」と出す
  if (!p.kind || p.kind === '飲食') return categoryLabel(p);
  return p.kind;
}
