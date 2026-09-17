/**
 * 모델이 돌려준 객체를 DOM 으로 그린다.
 *
 * 모델 출력은 신뢰할 수 없는 텍스트로 다룬다 — innerHTML 대신 textContent 만 쓴다.
 */

import { compactNumber, groupedNumber, formatUsd, severityOf } from './usage.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function section(title) {
  const wrap = el('div', 'sec');
  wrap.append(el('h3', 'sec-title', title));
  return wrap;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** 낱말 풀이 목록. */
function wordList(words) {
  const box = el('div', 'words');
  const items = Array.isArray(words) ? words : [];

  for (const word of items) {
    if (!word || !nonEmpty(word.surface)) continue;
    const row = el('div', 'word');
    row.append(el('span', 'word-surface', word.surface));
    row.append(el('span', 'word-meaning', word.meaning || ''));

    const gram = [word.part_of_speech, nonEmpty(word.base_form) && word.base_form !== word.surface ? `← ${word.base_form}` : '']
      .filter(nonEmpty)
      .join('  ');
    row.append(el('span', 'word-gram', gram));

    if (nonEmpty(word.note)) row.append(el('span', 'word-note', word.note));
    box.append(row);
  }

  if (!box.childElementCount) box.append(el('p', 'muted small', '풀이할 낱말이 없습니다.'));
  return box;
}

/** 라벨 / 값 목록. `[label, value]` 쌍 중 값이 빈 것은 건너뛴다. */
function keyValues(pairs) {
  const dl = el('dl', 'kv');
  let count = 0;
  for (const [label, value] of pairs) {
    if (!nonEmpty(value)) continue;
    dl.append(el('dt', null, label));
    dl.append(el('dd', null, value));
    count += 1;
  }
  return count ? dl : null;
}

/* ── 오늘의 숙어 ───────────────────────────────────────── */

/**
 * @param {HTMLElement} target
 * @param {object} idiom
 * @param {{onRefresh?: () => void, onCopy?: () => void}} [handlers]
 */
export function renderIdiom(target, idiom, handlers = {}) {
  target.replaceChildren();

  const head = el('div');
  head.append(el('p', 'headline-ko', idiom.korean || ''));
  if (nonEmpty(idiom.romanization)) head.append(el('p', 'romanization', `[${idiom.romanization}]`));
  head.append(el('p', 'headline-sv', idiom.swedish || ''));
  target.append(head);

  /* 뜻 */
  const meaning = section('뜻');
  const meaningPairs = keyValues([
    ['직역', idiom.literal_meaning],
    ['속뜻', idiom.figurative_meaning],
    ['스웨덴어 직역', idiom.swedish_literal],
  ]);
  if (meaningPairs) meaning.append(meaningPairs);
  target.append(meaning);

  /* 스웨덴어 낱말 */
  const sv = section('스웨덴어 낱말 풀이');
  sv.append(wordList(idiom.swedish_words));
  target.append(sv);

  /* 한국어 낱말 */
  if (Array.isArray(idiom.korean_words) && idiom.korean_words.length) {
    const ko = section('한국어 낱말 풀이');
    ko.append(wordList(idiom.korean_words));
    target.append(ko);
  }

  /* 대응 관용구 */
  const equiv = idiom.swedish_equivalent;
  if (equiv && nonEmpty(equiv.phrase)) {
    const box = section('스웨덴어에서 비슷한 표현');
    const quote = el('div', 'example');
    quote.append(el('p', 'ex-sv', equiv.phrase));
    if (nonEmpty(equiv.literal_korean)) quote.append(el('p', 'ex-ko', `직역: ${equiv.literal_korean}`));
    box.append(quote);
    if (nonEmpty(equiv.note)) box.append(el('p', 'muted small', equiv.note));
    target.append(box);
  }

  /* 예문 */
  if (idiom.example && (nonEmpty(idiom.example.swedish) || nonEmpty(idiom.example.korean))) {
    const box = section('예문');
    const quote = el('div', 'example');
    if (nonEmpty(idiom.example.swedish)) quote.append(el('p', 'ex-sv', idiom.example.swedish));
    if (nonEmpty(idiom.example.korean)) quote.append(el('p', 'ex-ko', idiom.example.korean));
    box.append(quote);
    target.append(box);
  }

  /* 쓰임새 */
  if (nonEmpty(idiom.usage_note)) {
    const box = section('쓰임새');
    box.append(el('p', null, idiom.usage_note));
    target.append(box);
  }

  /* 버튼 */
  const foot = el('div', 'card-foot');
  if (handlers.onCopy) {
    const copy = el('button', 'btn btn-ghost', '복사');
    copy.type = 'button';
    copy.addEventListener('click', () => handlers.onCopy(copy));
    foot.append(copy);
  }
  if (foot.childElementCount) target.append(foot);

  target.hidden = false;
}

/* ── 번역 결과 ─────────────────────────────────────────── */

const LANGUAGE_LABEL = { ko: '한국어', sv: '스웨덴어', other: '그 외' };

/**
 * @param {HTMLElement} target
 * @param {object} result
 * @param {{onCopy?: (btn: HTMLElement) => void}} [handlers]
 */
export function renderTranslation(target, result, handlers = {}) {
  target.replaceChildren();

  const head = el('div');
  const tags = el('p', null);
  tags.style.margin = '0 0 10px';
  const from = LANGUAGE_LABEL[result.source_language] || '알 수 없음';
  const to = LANGUAGE_LABEL[result.target_language] || '알 수 없음';
  tags.append(el('span', 'tag', `${from} → ${to}`));
  head.append(tags);
  head.append(el('p', 'headline-sv', result.translation || ''));
  target.append(head);

  if (nonEmpty(result.caution)) {
    const box = section('짚어 둘 점');
    box.append(el('p', null, result.caution));
    target.append(box);
  }

  if (nonEmpty(result.literal_translation) && result.literal_translation !== result.translation) {
    const box = section('직역');
    box.append(el('p', null, result.literal_translation));
    target.append(box);
  }

  const words = section('낱말 풀이');
  words.append(wordList(result.words));
  target.append(words);

  if (Array.isArray(result.grammar_notes) && result.grammar_notes.filter(nonEmpty).length) {
    const box = section('문법 노트');
    const ul = el('ul', 'list');
    for (const note of result.grammar_notes) {
      if (nonEmpty(note)) ul.append(el('li', null, note));
    }
    box.append(ul);
    target.append(box);
  }

  const alts = Array.isArray(result.alternatives) ? result.alternatives.filter((a) => a && nonEmpty(a.text)) : [];
  if (alts.length) {
    const box = section('다른 번역');
    for (const alt of alts) {
      const quote = el('div', 'example');
      quote.style.marginBottom = '8px';
      quote.append(el('p', 'ex-sv', alt.text));
      if (nonEmpty(alt.note)) quote.append(el('p', 'ex-ko', alt.note));
      box.append(quote);
    }
    target.append(box);
  }

  const foot = el('div', 'card-foot');
  if (handlers.onCopy) {
    const copy = el('button', 'btn btn-ghost', '번역문 복사');
    copy.type = 'button';
    copy.addEventListener('click', () => handlers.onCopy(copy));
    foot.append(copy);
  }
  if (foot.childElementCount) target.append(foot);

  target.hidden = false;
}

/* ── 지난 숙어 ─────────────────────────────────────────── */

/**
 * @param {HTMLElement} target
 * @param {Array<{date: string, idiom: object}>} entries
 * @param {(entry: {date: string, idiom: object}) => void} onSelect
 */
export function renderHistory(target, entries, onSelect) {
  target.replaceChildren();

  if (!entries.length) {
    target.append(el('p', 'empty', '아직 저장된 숙어가 없습니다.'));
    return;
  }

  for (const entry of entries) {
    const item = el('button', 'history-item');
    item.type = 'button';
    item.append(el('div', 'h-date', entry.date));
    item.append(el('div', 'h-ko', (entry.idiom && entry.idiom.korean) || ''));
    item.append(el('div', 'h-sv', (entry.idiom && entry.idiom.swedish) || ''));
    item.addEventListener('click', () => onSelect(entry));
    target.append(item);
  }
}

/* ── 상태 표시 ─────────────────────────────────────────── */

/** 로딩 스피너와 메시지. */
export function showLoading(node, message) {
  node.replaceChildren();
  node.className = 'status';
  node.append(el('span', 'spinner'));
  node.append(el('span', null, message));
  node.hidden = false;
}

export function showError(node, message) {
  node.replaceChildren();
  node.className = 'status is-error';
  node.append(el('span', null, message));
  node.hidden = false;
}

export function hideStatus(node) {
  node.hidden = true;
  node.replaceChildren();
}

/* ── 사용량 표시 ───────────────────────────────────────── */

const METER_ROWS = [
  { key: 'requests', label: '요청', unit: '회' },
  { key: 'inputTokens', label: '입력 토큰', unit: '' },
  { key: 'outputTokens', label: '출력 토큰', unit: '' },
];

/** 값 + 라벨 한 덩어리. 색이 아니라 숫자가 뜻을 전달한다. */
function statTile(label, value, sub) {
  const tile = el('div', 'tile');
  tile.append(el('span', 'tile-label', label));
  tile.append(el('span', 'tile-value', value));
  if (sub) tile.append(el('span', 'tile-sub', sub));
  return tile;
}

/**
 * 한 줄짜리 미터. 채워진 부분이 '쓴 양', 빈 부분이 '남은 양'이다.
 * 심각도는 채움색으로 드러나되, 옆의 숫자가 항상 같은 정보를 글로 말한다.
 */
function meterRow(label, unit, pair, formatValue) {
  const row = el('div', 'meter');
  row.append(el('span', 'meter-label', label));

  const track = el('div', 'meter-track');
  // 남은 양이 음수로 보고되는 일은 없어야 하지만, 표시가 깨지지 않게 막아 둔다.
  const remaining = Math.min(pair.limit, Math.max(0, pair.remaining));
  const used = pair.limit - remaining;
  const percent = Math.min(100, Math.max(0, (used / pair.limit) * 100));
  const fill = el('div', 'meter-fill');
  fill.dataset.severity = severityOf(pair.remaining, pair.limit);
  // 아주 작은 사용량도 보이도록 최소 폭을 준다.
  fill.style.width = percent > 0 && percent < 1.5 ? '1.5%' : `${percent}%`;
  track.append(fill);
  track.setAttribute('role', 'img');
  track.setAttribute(
    'aria-label',
    `${label} 남은 양 ${formatValue(remaining)}${unit}, 한도 ${formatValue(pair.limit)}${unit}`
  );
  row.append(track);

  row.append(
    el('span', 'meter-value', `${formatValue(remaining)}${unit} / ${formatValue(pair.limit)}${unit}`)
  );
  return row;
}

function formatResetTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (seconds <= 0) return '지금 회복됨';
  if (seconds < 60) return `${seconds}초 뒤 회복`;
  return `${Math.ceil(seconds / 60)}분 뒤 회복`;
}

/**
 * @param {HTMLElement} target
 * @param {{model: object, totals: object, rateLimit: object|null}} state
 */
export function renderUsage(target, { model, totals, rateLimit }) {
  target.replaceChildren();

  /* 이번 달 누적 — 이 브라우저에서 보낸 요청만 센 추정치 */
  const tiles = el('div', 'tiles');
  tiles.append(statTile('이번 달 추정 비용', formatUsd(totals.costUsd), totals.month));
  tiles.append(statTile('요청', `${groupedNumber(totals.requests)}회`, model.label));
  tiles.append(statTile('입력 토큰', compactNumber(totals.inputTokens), `$${model.inputPerMTok}/MTok`));
  tiles.append(statTile('출력 토큰', compactNumber(totals.outputTokens), `$${model.outputPerMTok}/MTok`));
  target.append(tiles);

  /* 분당 속도 제한 — 마지막 응답 헤더에서 읽은 실제 값 */
  const limits = el('div', 'meters');
  const heading = el('div', 'meters-head');
  heading.append(el('span', 'sec-title', '분당 한도 · 남은 양'));
  if (rateLimit && rateLimit.at) {
    const resets = METER_ROWS.map((row) => rateLimit[row.key])
      .filter(Boolean)
      .map((pair) => formatResetTime(pair.reset))
      .filter(Boolean);
    if (resets.length) heading.append(el('span', 'muted small', resets[0]));
  }
  limits.append(heading);

  let drew = 0;
  for (const row of METER_ROWS) {
    const pair = rateLimit && rateLimit[row.key];
    if (!pair) continue;
    limits.append(
      meterRow(row.label, row.unit, pair, row.key === 'requests' ? groupedNumber : compactNumber)
    );
    drew += 1;
  }

  if (!drew) {
    limits.append(
      el('p', 'muted small', '아직 요청이 없습니다. 한 번 번역하면 남은 분당 한도가 여기에 표시됩니다.')
    );
  }
  target.append(limits);

  const foot = el('p', 'usage-foot muted small');
  foot.textContent =
    '위 막대는 Anthropic이 매 응답에 실어 주는 분당 속도 제한입니다. ' +
    '월 지출 한도와 실제 청구액은 여기서 알 수 없으니 Anthropic 콘솔에서 확인하세요. ' +
    '비용은 이 브라우저가 보낸 요청만 더한 추정치입니다.';
  target.append(foot);
}
