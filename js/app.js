/**
 * 화면 배선: 탭, 설정, 오늘의 숙어, 번역기, 지난 숙어.
 */

import { apiKey, settings, history } from './store.js';
import { fetchIdiom, translate, describeError, MissingKeyError } from './api.js';
import {
  renderIdiom,
  renderTranslation,
  renderHistory,
  showLoading,
  showError,
  hideStatus,
} from './render.js';

const $ = (selector) => document.querySelector(selector);

/* ── 날짜 ──────────────────────────────────────────────── */

/** 사용자의 현지 시간 기준 YYYY-MM-DD. */
function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDateLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

/* ── 테마 ──────────────────────────────────────────────── */

function applyTheme() {
  const theme = settings.getTheme();
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

function prefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function toggleTheme() {
  const current = settings.getTheme();
  const effective = current === 'auto' ? (prefersDark() ? 'dark' : 'light') : current;
  settings.setTheme(effective === 'dark' ? 'light' : 'dark');
  applyTheme();
}

/* ── 복사 ──────────────────────────────────────────────── */

async function copyToClipboard(text, button) {
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = '복사했습니다';
  } catch {
    button.textContent = '복사하지 못했습니다';
  }
  setTimeout(() => {
    button.textContent = original;
  }, 1600);
}

/* ── 키 배너 ───────────────────────────────────────────── */

function refreshKeyBanner() {
  $('#key-banner').hidden = Boolean(apiKey.get());
}

/* ── 탭 ────────────────────────────────────────────────── */

const TABS = [
  ['#tab-daily', '#panel-daily'],
  ['#tab-translate', '#panel-translate'],
  ['#tab-history', '#panel-history'],
];

function selectTab(tabSelector) {
  for (const [tab, panel] of TABS) {
    const isActive = tab === tabSelector;
    $(tab).classList.toggle('is-active', isActive);
    $(tab).setAttribute('aria-selected', String(isActive));
    $(panel).hidden = !isActive;
  }
  if (tabSelector === '#tab-history') refreshHistory();
}

/* ── 오늘의 숙어 ───────────────────────────────────────── */

let idiomInFlight = false;

function showIdiom(idiom) {
  renderIdiom($('#daily-card'), idiom, {
    onCopy: (button) => {
      const text = [idiom.korean, idiom.swedish, idiom.figurative_meaning].filter(Boolean).join('\n');
      copyToClipboard(text, button);
    },
  });
}

/**
 * @param {{force?: boolean}} [options] force 가 참이면 저장된 값을 무시하고 새로 받아 온다.
 */
async function loadDailyIdiom({ force = false } = {}) {
  if (idiomInFlight) return;

  const date = today();
  $('#daily-date').textContent = formatDateLabel(date);

  const status = $('#daily-status');
  const card = $('#daily-card');

  if (!force) {
    const cached = history.forDate(date);
    if (cached) {
      hideStatus(status);
      showIdiom(cached);
      return;
    }
  }

  if (!apiKey.get()) {
    card.hidden = true;
    showError(status, 'API 키를 등록하면 오늘의 숙어를 받아 옵니다.');
    return;
  }

  idiomInFlight = true;
  $('#daily-refresh').disabled = true;
  card.hidden = true;
  showLoading(status, '오늘의 숙어를 고르는 중입니다…');

  try {
    const idiom = await fetchIdiom({ date, avoid: history.recentKorean() });
    history.save(date, idiom);
    hideStatus(status);
    showIdiom(idiom);
  } catch (error) {
    showError(status, describeError(error));
    if (error instanceof MissingKeyError) refreshKeyBanner();
  } finally {
    idiomInFlight = false;
    $('#daily-refresh').disabled = false;
  }
}

/* ── 번역기 ────────────────────────────────────────────── */

let translateInFlight = false;

async function runTranslation(event) {
  if (event) event.preventDefault();
  if (translateInFlight) return;

  const text = $('#source-text').value.trim();
  const status = $('#translate-status');
  const result = $('#translate-result');

  if (!text) {
    showError(status, '번역할 내용을 입력해 주세요.');
    result.hidden = true;
    return;
  }

  const direction = document.querySelector('input[name="direction"]:checked').value;

  translateInFlight = true;
  $('#translate-btn').disabled = true;
  result.hidden = true;
  showLoading(status, '번역하고 낱말을 풀이하는 중입니다…');

  try {
    const data = await translate({ text, direction });
    hideStatus(status);
    renderTranslation(result, data, {
      onCopy: (button) => copyToClipboard(data.translation || '', button),
    });
  } catch (error) {
    showError(status, describeError(error));
    if (error instanceof MissingKeyError) refreshKeyBanner();
  } finally {
    translateInFlight = false;
    $('#translate-btn').disabled = false;
  }
}

/* ── 지난 숙어 ─────────────────────────────────────────── */

function refreshHistory() {
  renderHistory($('#history-list'), history.all(), (entry) => {
    selectTab('#tab-daily');
    $('#daily-date').textContent = formatDateLabel(entry.date);
    hideStatus($('#daily-status'));
    showIdiom(entry.idiom);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── 설정 ──────────────────────────────────────────────── */

function openSettings() {
  $('#api-key').value = apiKey.get();
  $('#effort-select').value = settings.getEffort();
  $('#settings-dialog').showModal();
}

function saveSettings() {
  const hadKey = Boolean(apiKey.get());
  apiKey.set($('#api-key').value.trim());
  settings.setEffort($('#effort-select').value);
  $('#settings-dialog').close();
  refreshKeyBanner();

  // 키가 방금 등록되었다면 비어 있던 오늘의 숙어를 바로 채운다.
  if (!hadKey && apiKey.get()) loadDailyIdiom();
}

/* ── 초기화 ────────────────────────────────────────────── */

function init() {
  applyTheme();
  refreshKeyBanner();

  for (const [tab] of TABS) {
    $(tab).addEventListener('click', () => selectTab(tab));
  }

  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#open-settings').addEventListener('click', openSettings);
  for (const button of document.querySelectorAll('[data-open-settings]')) {
    button.addEventListener('click', openSettings);
  }
  $('#settings-save').addEventListener('click', saveSettings);
  $('#settings-cancel').addEventListener('click', () => $('#settings-dialog').close());
  $('#clear-key').addEventListener('click', () => {
    apiKey.clear();
    $('#api-key').value = '';
    refreshKeyBanner();
  });

  $('#daily-refresh').addEventListener('click', () => loadDailyIdiom({ force: true }));

  $('#translate-form').addEventListener('submit', runTranslation);
  $('#clear-btn').addEventListener('click', () => {
    $('#source-text').value = '';
    $('#char-count').textContent = '0자';
    hideStatus($('#translate-status'));
    $('#translate-result').hidden = true;
    $('#source-text').focus();
  });
  $('#source-text').addEventListener('input', (event) => {
    $('#char-count').textContent = `${event.target.value.length}자`;
  });
  $('#source-text').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runTranslation();
  });

  $('#history-clear').addEventListener('click', () => {
    if (!window.confirm('저장된 숙어 기록을 모두 지울까요?')) return;
    history.clear();
    refreshHistory();
  });

  loadDailyIdiom();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
