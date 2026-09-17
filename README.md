# Accurate Translator

스웨덴어와 한국어를 서로 옮기고, 문장 속 **낱말 하나하나의 뜻을 풀어서** 설명하는
학습 사이트입니다. 서버도 빌드 단계도 없어 GitHub Pages 에 그대로 올라갑니다.

**API 키 없이 동작합니다.** 내용은 미리 만들어 둔 `data/entries.json` 에서 옵니다.
번역을 사이트 실행 시점이 아니라 제작 시점에 해 두는 구조라, 방문자가 키를 넣거나
비용을 낼 일이 없습니다.

## 기능

| 탭 | 하는 일 | API 키 |
|---|---|---|
| **오늘의 숙어** | 날짜에 따라 속담을 하나 골라 번역·직역·뜻·낱말 풀이·예문을 보여 줍니다 | 불필요 |
| **모아보기** | 모든 항목을 검색하고 종류별로 걸러 봅니다 | 불필요 |
| **단어장** | 모든 항목에 나온 낱말을 기본형으로 모아 보여 줍니다. 낱말을 누르면 그 낱말이 나온 문장으로 갑니다 | 불필요 |
| **번역기** | 아무 문장이나 새로 번역합니다 | **필요** |

오늘의 숙어는 날짜에서 계산해 고르므로, 같은 날에는 몇 번을 새로고침해도 같은 숙어가
나오고 따로 저장할 것도 없습니다.

## 내용 추가하기

이 사이트의 내용은 **Claude Code 대화에서 채웁니다.** 번역기 탭을 쓰지 않는 한
사이트 자체는 내용을 만들지 않습니다.

> "`lagom` 이랑 `Det var en gång` 단어장에 추가해줘"

라고 하면 `data/entries.json` 에 형식에 맞는 항목이 덧붙습니다. 커밋하고 푸시하면
사이트에 반영됩니다. 형식은 [`data/SCHEMA.md`](data/SCHEMA.md) 에 적어 두었습니다.
손으로 직접 넣어도 됩니다.

지금은 한국어 속담 7개, 스웨덴어 표현 6개, 낱말 2개로 시작합니다.
여기서 뽑은 낱말 51개가 단어장에 들어 있습니다.

### 품질에 관하여

스웨덴어는 원어민 검수를 거치지 않았습니다. 학습용으로 쓰시되, 중요한 자리에 쓸
문장은 따로 확인하시는 편이 좋습니다.

## 로컬에서 실행

모듈 스크립트와 `fetch` 를 쓰기 때문에 `file://` 로는 열리지 않습니다.
정적 서버가 필요합니다.

```bash
python3 -m http.server 8000
# → http://127.0.0.1:8000
```

## 배포 (GitHub Pages)

빌드 단계가 없습니다. 저장소 설정 → Pages 에서 브랜치와 `/ (root)` 를 고르면
그대로 배포됩니다. (`.nojekyll` 이 이미 들어 있습니다.)

## 번역기 탭을 쓰려면 (선택)

아무 문장이나 그 자리에서 번역하고 싶을 때만 필요합니다.

1. <https://platform.claude.com/settings/keys> 에서 Anthropic API 키를 발급받습니다.
   (claude.ai 구독과는 **별개 제품이고 과금도 따로**입니다. GitHub 설정과도 무관합니다.)
2. 사이트 우측 상단 **설정** 에 붙여 넣습니다.

설정에서 모델(Opus 5 / Sonnet 5 / Haiku 4.5)도 고를 수 있고, 키가 등록되면
요청마다 갱신되는 사용량 패널이 화면에 나타납니다.

### 보안에 관하여

사이트를 공개해도 **키가 소스에 들어가지는 않습니다.** 키는 코드 어디에도 없고,
방문자가 각자 자기 브라우저에 자기 키를 넣는 구조입니다.

실제 위험은 이것뿐입니다.

- 내 기기를 쓰는 다른 사람이 개발자 도구로 `localStorage` 를 열어 볼 수 있음
- 악성 브라우저 확장 프로그램이 `localStorage` 를 읽어 감
- 이 사이트에 XSS 취약점이 생기면 훔쳐 갈 수 있음
  (그래서 모든 문자열을 `innerHTML` 없이 `textContent` 로만 넣습니다)

걱정되면 워크스페이스를 따로 만들고 월 지출 한도를 걸어 두세요.
Default Workspace 에는 한도를 걸 수 없습니다.

1. <https://platform.claude.com/settings/workspaces> → **Create workspace**
2. 그 워크스페이스 → **Spend limits** 탭 → 월 상한과 알림 임계값
3. <https://platform.claude.com/settings/keys> 에서 그 워크스페이스로 키 발급

Workspaces 메뉴가 보이지 않으면 조직 전체 한도로 대신할 수 있습니다:
<https://platform.claude.com/settings/billing> → **Spend limits**.

## 구조

```
index.html              화면 구조
css/style.css           스타일 (라이트/다크 모드)

data/entries.json       ← 사이트의 모든 내용
data/SCHEMA.md          그 형식 설명

js/app.js               탭·검색·설정 배선
js/entries.js           데이터 읽기, 날짜별 선택, 검색, 단어장 집계
js/render.js            데이터 → DOM
js/store.js             localStorage 래퍼 (키, 설정)

── 아래는 번역기 탭에서만 쓰입니다 ──
js/api.js               Claude API 호출, 프롬프트, 오류 메시지
js/schemas.js           구조화 출력(JSON Schema) 정의
js/models.js            고를 수 있는 모델과 가격표
js/usage.js             속도 제한 갈무리, 누적 사용량·비용 추정
vendor/anthropic-sdk.js 브라우저용으로 번들한 공식 Anthropic SDK
tools/build-vendor.sh   위 번들을 다시 만드는 스크립트
```

### 기술 메모

- 오늘의 숙어는 날짜를 씨앗으로 나눗셈 나머지를 써서 고릅니다. 무작위가 아니라서
  저장 없이도 하루 동안 값이 고정됩니다.
- 단어장은 모든 항목의 `words` 를 `base` 기준으로 합치고, 스웨덴어 사전 순서
  (`å ä ö` 가 `z` 뒤)로 정렬합니다 — `localeCompare(…, 'sv')`.
- 번역기는 `claude-opus-5` 등에 **구조화 출력**(`output_config.format`)으로
  JSON Schema 를 걸어 응답을 받습니다. 파싱이 깨질 일이 없습니다.
- 사용량 막대는 SDK 의 `.withResponse()` 로 원시 응답을 받아
  `anthropic-ratelimit-*` 헤더를 읽습니다. 이건 **분당** 속도 제한이지 월 지출
  한도가 아닙니다. 월 한도와 실제 청구액은 콘솔에서 봐야 합니다.
- 공식 SDK 를 CDN 에서 불러오지 않고 `vendor/` 에 번들해 두었습니다.
  SDK 버전을 올리려면 `./tools/build-vendor.sh <버전>` 을 실행하세요.
