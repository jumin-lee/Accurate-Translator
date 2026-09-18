/**
 * 발음 듣기 — 브라우저에 내장된 음성 합성(Web Speech API)을 쓴다.
 *
 * 외부 API 도 키도 쓰지 않는다. 목소리는 사용자의 운영체제가 제공하므로
 * 기기에 스웨덴어 목소리가 없으면 동작하지 않는다. 그 경우 조용히 실패하지
 * 않고 버튼을 감춘 뒤 안내를 띄운다 — 엉뚱한 언어 목소리로 스웨덴어를
 * 읽어 주면 발음을 배우는 데 해롭기 때문이다.
 */

const LANG = 'sv-SE';

let voices = [];
let swedishVoice = null;
const listeners = new Set();

function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 스웨덴어 목소리를 고른다. 없으면 null. */
function pickVoice(list) {
  const swedish = list.filter((voice) => (voice.lang || '').toLowerCase().startsWith('sv'));
  if (!swedish.length) return null;
  // 기기에 딸려 오는 목소리(localService)가 대개 더 빠르고 안정적이다.
  return swedish.find((voice) => voice.localService) || swedish[0];
}

function refreshVoices() {
  if (!supported()) return;
  voices = window.speechSynthesis.getVoices() || [];
  const next = pickVoice(voices);
  const changed = (next && next.name) !== (swedishVoice && swedishVoice.name);
  swedishVoice = next;
  if (changed) for (const listener of listeners) listener();
}

if (supported()) {
  refreshVoices();
  // 목소리 목록은 비동기로 채워진다. 첫 호출에 빈 배열이 오는 브라우저가 많다.
  window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

/** 스웨덴어를 읽어 줄 수 있는 상태인가. */
export function canSpeak() {
  return supported() && swedishVoice !== null;
}

/** 목소리가 준비되거나 바뀌면 알려 준다. 화면이 버튼을 다시 그리는 데 쓴다. */
export function onVoiceChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 지금 쓰고 있는 목소리 이름. 설정 화면에 보여 준다. */
export function voiceName() {
  return swedishVoice ? `${swedishVoice.name} (${swedishVoice.lang})` : '';
}

/** 기기가 가진 목소리가 몇 개인지 — 진단용. */
export function voiceCount() {
  return voices.length;
}

export function stop() {
  if (supported()) window.speechSynthesis.cancel();
}

/**
 * 읽어 준다.
 * @param {string} text
 * @param {{rate?: number, onStart?: () => void, onEnd?: () => void}} [options]
 */
export function speak(text, options = {}) {
  if (!canSpeak() || !text) return false;

  // 앞의 것이 남아 있으면 겹쳐 들린다. 항상 끊고 시작한다.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = swedishVoice;
  utterance.lang = swedishVoice.lang || LANG;
  utterance.rate = options.rate || 1;

  if (options.onStart) utterance.addEventListener('start', options.onStart);
  if (options.onEnd) {
    utterance.addEventListener('end', options.onEnd);
    utterance.addEventListener('error', options.onEnd);
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

/** 배우는 사람이 따라 하기 좋은 느린 속도. */
export const SLOW_RATE = 0.65;
