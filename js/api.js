/**
 * Claude API 호출 계층.
 *
 * 서버가 없는 정적 사이트라 브라우저에서 바로 Messages API 를 부른다.
 * 공식 TypeScript SDK 를 브라우저용으로 번들해 vendor/ 에 넣어 두었고,
 * 브라우저 실행은 dangerouslyAllowBrowser 로 명시적으로 허용한다.
 */

import { Anthropic } from '../vendor/anthropic-sdk.js';
import { apiKey, settings } from './store.js';
import { IDIOM_SCHEMA, TRANSLATION_SCHEMA } from './schemas.js';

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;

export class MissingKeyError extends Error {
  constructor() {
    super('API 키가 등록되지 않았습니다.');
    this.name = 'MissingKeyError';
  }
}

function client() {
  const key = apiKey.get();
  if (!key) throw new MissingKeyError();
  return new Anthropic({
    apiKey: key,
    // 서버가 없는 구조라 키가 브라우저에 노출된다. 설정 화면에서 그 점을 안내한다.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

/**
 * 구조화 출력으로 한 번 호출하고 파싱된 객체를 돌려준다.
 * @param {{system: string, user: string, schema: object}} options
 */
async function ask({ system, user, schema }) {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: {
      effort: settings.getEffort(),
      format: { type: 'json_schema', schema },
    },
    system,
    messages: [{ role: 'user', content: user }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('모델이 이 요청에 대한 응답을 거부했습니다. 입력 내용을 바꿔서 다시 시도해 주세요.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('응답이 너무 길어 중간에 잘렸습니다. 원문을 짧게 나누어 다시 시도해 주세요.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text.trim()) throw new Error('모델이 빈 응답을 돌려주었습니다. 다시 시도해 주세요.');

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('응답을 해석하지 못했습니다. 다시 시도해 주세요.');
  }
}

/* ── 오늘의 숙어 ───────────────────────────────────────── */

const IDIOM_SYSTEM = `당신은 한국어와 스웨덴어를 모두 모어 수준으로 구사하는 언어 교사입니다.
스웨덴어를 배우는 한국어 화자에게 매일 한국어 숙어를 하나씩 소개합니다.

지켜야 할 것:
- 한국인이 실제로 쓰는 속담·관용구를 고릅니다. 사전에만 있고 아무도 쓰지 않는 표현은 피합니다.
- 스웨덴어 번역은 스웨덴 사람이 읽었을 때 자연스러워야 합니다. 한국어 어순을 그대로 옮기지 마세요.
- 직역(swedish_literal)은 따로 제공하되, 어색해도 괜찮습니다. 학습자가 구조를 보도록 하는 것이 목적입니다.
- 스웨덴어 명사는 성(en/ett)과 복수형을, 동사는 원형을 base_form 에 적습니다.
  품사 표기 예: "명사 (en-단어, 복수 -ar)", "동사 (부정형)", "전치사".
- 뜻이 통하는 스웨덴 고유 관용구가 있으면 반드시 소개하고, 없으면 phrase 를 빈 문자열로 둡니다.
- 설명은 모두 한국어로 씁니다. 스웨덴어 예문만 스웨덴어로 씁니다.`;

/**
 * 오늘의 숙어를 새로 받아 온다.
 * @param {{date: string, avoid?: string[]}} options
 */
export function fetchIdiom({ date, avoid = [] }) {
  const avoidBlock = avoid.length
    ? `\n\n최근에 이미 다룬 표현이니 이번에는 다른 것을 고르세요:\n${avoid.map((s) => `- ${s}`).join('\n')}`
    : '';

  return ask({
    system: IDIOM_SYSTEM,
    schema: IDIOM_SCHEMA,
    user:
      `오늘은 ${date} 입니다. 오늘 소개할 한국어 숙어를 하나 골라 주세요.\n` +
      '난이도는 중급 학습자에게 맞추고, 일상 대화에서 실제로 쓰이는 표현으로 골라 주세요.' +
      avoidBlock,
  });
}

/* ── 자유 번역 ─────────────────────────────────────────── */

const TRANSLATE_SYSTEM = `당신은 한국어와 스웨덴어를 모두 모어 수준으로 구사하는 번역가이자 언어 교사입니다.
번역문만 주는 것이 아니라, 학습자가 왜 그렇게 번역되는지 알 수 있도록 낱말을 하나씩 풀어 줍니다.

지켜야 할 것:
- translation 은 목표 언어 화자가 실제로 쓸 법한 자연스러운 문장이어야 합니다.
- literal_translation 은 원문의 구조를 드러내는 직역입니다. 자연스러운 번역과 같아도 무방합니다.
- words 는 translation 에 실제로 쓰인 낱말을 나온 순서대로 담습니다. 원문의 낱말이 아닙니다.
- 스웨덴어 명사는 성(en/ett)과 복수형을, 동사는 원형과 시제를 밝힙니다.
  품사 표기 예: "명사 (ett-단어, 복수 -n)", "동사 (현재형, 원형 vara)", "부사".
- 관용구나 굳어진 표현은 낱말을 쪼개지 말고 덩어리째 한 항목으로 설명하고, note 에 그 사실을 적습니다.
- grammar_notes 에는 학습자가 헷갈릴 만한 어순·격·관사·후치 정관사 같은 것을 짚어 줍니다.
- 원문이 이미 목표 언어라면 그대로 두지 말고, 요청된 방향에 맞게 번역합니다.
- 설명은 모두 한국어로 씁니다.`;

const DIRECTION_HINT = {
  'ko-sv': '원문은 한국어입니다. 스웨덴어로 번역해 주세요.',
  'sv-ko': '원문은 스웨덴어입니다. 한국어로 번역해 주세요.',
  auto:
    '원문의 언어를 먼저 판단하세요. 한국어면 스웨덴어로, 스웨덴어면 한국어로 번역합니다. ' +
    '둘 다 아니면 source_language 를 "other" 로 두고 스웨덴어와 한국어 중 더 알맞은 쪽으로 번역한 뒤 caution 에 그 사실을 적으세요.',
};

/**
 * 임의의 문장을 번역하고 낱말을 풀이한다.
 * @param {{text: string, direction: 'auto'|'ko-sv'|'sv-ko'}} options
 */
export function translate({ text, direction }) {
  return ask({
    system: TRANSLATE_SYSTEM,
    schema: TRANSLATION_SCHEMA,
    user: `${DIRECTION_HINT[direction] || DIRECTION_HINT.auto}\n\n원문:\n"""\n${text}\n"""`,
  });
}

/* ── 오류 메시지 ───────────────────────────────────────── */

/** API 오류를 사용자에게 보여 줄 한국어 문장으로 바꾼다. */
export function describeError(error) {
  if (error instanceof MissingKeyError) return error.message;

  const status = error && error.status;
  if (status === 401) return 'API 키가 올바르지 않습니다. 설정에서 키를 다시 확인해 주세요.';
  if (status === 403) return '이 API 키로는 접근할 수 없습니다. 키의 권한을 확인해 주세요.';
  if (status === 429) return '요청이 너무 잦습니다. 잠시 뒤에 다시 시도해 주세요.';
  if (status === 400 && /credit|balance/i.test(error.message || '')) {
    return '계정 잔액이 부족합니다. Anthropic 콘솔에서 결제 정보를 확인해 주세요.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Anthropic 서버에 일시적인 문제가 있습니다. 잠시 뒤에 다시 시도해 주세요.';
  }
  if (error && error.name === 'APIConnectionError') {
    return '네트워크에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.';
  }
  return (error && error.message) || '알 수 없는 오류가 발생했습니다.';
}
