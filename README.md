# Accurate Translator

스웨덴어와 한국어를 서로 번역하고, 문장 속 **낱말 하나하나의 뜻을 풀어서** 설명해 주는
정적 웹사이트입니다. 서버가 없어 GitHub Pages 같은 정적 호스팅에 그대로 올릴 수 있습니다.

## 기능

**오늘의 숙어** — 접속한 날짜 기준으로 한국어 숙어·속담을 하나 추천하고, 스웨덴어 번역,
직역, 속뜻, 스웨덴어·한국어 낱말 풀이, 대응하는 스웨덴 관용구, 예문, 쓰임새를 함께 보여 줍니다.
한 번 받아 온 숙어는 그날 안에는 다시 호출하지 않고 저장된 것을 보여 주며,
최근에 나온 표현은 다음 추천에서 제외됩니다. `다른 숙어` 버튼으로 새로 받을 수 있습니다.

**번역기** — 한국어나 스웨덴어를 입력하면 최종 번역문과 함께 직역, 낱말 풀이
(기본형·품사·문맥상의 뜻), 문법 노트, 다른 번역 후보를 보여 줍니다.
방향은 자동 감지하거나 직접 지정할 수 있습니다.

**지난 숙어** — 이 브라우저에 저장된 지난 숙어 기록을 다시 볼 수 있습니다.

**사용량 표시** — 화면 위쪽에 매 요청마다 갱신되는 사용량 패널이 있습니다.
- **분당 한도 막대**: Anthropic이 매 응답 헤더(`anthropic-ratelimit-*`)에 실어 주는
  실제 값입니다. 요청 수, 입력 토큰, 출력 토큰 각각의 남은 양을 보여 줍니다.
- **이번 달 누적**: 응답의 `usage` 를 달 단위로 쌓아 비용을 추정합니다.

> ⚠️ 막대는 **분당** 속도 제한이지 월 지출 한도가 아닙니다. 월 지출 한도와 실제
> 청구액은 API 응답으로 알 수 없으므로 Anthropic 콘솔에서 확인해야 합니다.
> 누적 비용도 이 브라우저가 보낸 요청만 더한 추정치입니다.

**모델 선택** — 설정에서 Opus 5 / Sonnet 5 / Haiku 4.5 를 고를 수 있습니다.
가격 차이가 크니(입력 기준 $5 / $2 / $1 per MTok) 가볍게 쓸 땐 Haiku,
문법 설명이 중요할 땐 Opus 를 권합니다.

## 쓰는 법

1. [platform.claude.com](https://platform.claude.com/settings/keys) 에서 Anthropic API 키를 발급받습니다.
   (예전 주소 `console.anthropic.com` 은 여기로 바뀌었습니다. GitHub 설정과는 전혀 다른 사이트입니다.)
2. 사이트 우측 상단 **설정** 을 열고 키를 붙여 넣은 뒤 저장합니다.
3. 끝입니다. 키는 이 브라우저의 `localStorage` 에만 저장됩니다.

### 보안에 관하여

**사이트를 공개해도 키가 소스에 들어가지는 않습니다.** 키는 코드 어디에도 없고,
방문자가 각자 자기 브라우저에 자기 키를 넣는 구조입니다. 내 키는 내 브라우저의
`localStorage` 에만 있습니다.

실제 위험은 이것뿐입니다.

- 내 기기를 쓰는 다른 사람이 개발자 도구로 `localStorage` 를 열어 볼 수 있음
- 악성 브라우저 확장 프로그램이 `localStorage` 를 읽어 감
- 이 사이트에 XSS 취약점이 생기면 훔쳐 갈 수 있음
  (그래서 모델 출력을 `innerHTML` 없이 `textContent` 로만 넣습니다)

즉 **본인 기기에서 혼자 쓰는 용도라면 위험이 크지 않습니다.** 대신 아래를 권합니다.

- 공용 컴퓨터에서는 쓰지 마세요.
- 이 사이트 전용 키를 쓰고, 워크스페이스에 월 지출 한도를 걸어 두세요 (아래 참고).
- 키가 샜다 싶으면 콘솔에서 즉시 삭제하면 그 키는 바로 무효화됩니다.

남들에게 공유할 계획이라면 서버(예: Cloudflare Workers)를 두고 키를 서버
환경변수에 감추는 편이 낫습니다. `js/api.js` 의 호출부만 자체 백엔드
엔드포인트로 바꾸면 됩니다.

### 월 지출 한도 거는 법

Default Workspace 에는 한도를 걸 수 없으므로 워크스페이스를 따로 만들어야 합니다.

1. <https://platform.claude.com/settings/workspaces> → **Create workspace** (예: `Translator`)
2. 그 워크스페이스 → **Spend limits** 탭 → 월 상한과 알림 임계값 설정
3. <https://platform.claude.com/settings/keys> 에서 그 워크스페이스로 키를 발급해 이 사이트에 등록

Workspaces 메뉴가 보이지 않으면(조직 관리자만 만들 수 있음) 조직 전체 한도로
대신할 수 있습니다: <https://platform.claude.com/settings/billing> → **Spend limits**.
자기가 건 한도를 넘으면 HTTP 400 (`You have reached your specified API usage limits`),
티어 자동 상한을 넘으면 HTTP 429 (`enforced_spend_limit_reached`) 가 돌아옵니다.

## 로컬에서 실행

모듈 스크립트를 쓰기 때문에 `file://` 로는 열리지 않습니다. 간단한 정적 서버가 필요합니다.

```bash
python3 -m http.server 8000
# → http://127.0.0.1:8000
```

## 배포 (GitHub Pages)

빌드 단계가 없습니다. 저장소 설정 → Pages 에서 브랜치와 `/ (root)` 를 고르면 그대로 배포됩니다.
(`.nojekyll` 파일이 이미 들어 있습니다.)

## 구조

```
index.html              화면 구조
css/style.css           스타일 (라이트/다크 모드)
js/app.js               탭·설정·이벤트 배선
js/api.js               Claude API 호출, 프롬프트, 오류 메시지
js/schemas.js           구조화 출력(JSON Schema) 정의
js/render.js            응답 → DOM 렌더링
js/store.js             localStorage 래퍼 (키, 설정, 숙어 기록)
js/models.js            고를 수 있는 모델과 가격표
js/usage.js             속도 제한 갈무리, 누적 사용량·비용 추정
vendor/anthropic-sdk.js 브라우저용으로 번들한 공식 Anthropic SDK
tools/build-vendor.sh   위 번들을 다시 만드는 스크립트
```

### 기술 메모

- 모델은 `claude-opus-5` 를 쓰고, 응답은 **구조화 출력**(`output_config.format`)으로
  JSON Schema 에 맞춰 받습니다. 덕분에 파싱이 깨질 일이 없고 렌더링이 단순해집니다.
- 설정의 *응답 품질 / 속도* 는 `output_config.effort` 에 해당합니다.
  기본값은 `medium` 이며, 화면이 응답을 기다리는 구조라 속도와 품질의 균형을 잡은 값입니다.
- 속도 제한 막대는 SDK 의 `.withResponse()` 로 원시 응답을 받아 헤더를 읽습니다.
  `api.anthropic.com` 이 `access-control-expose-headers: *` 를 보내므로 브라우저에서
  읽을 수 있습니다. 429 같은 오류 응답에서도 헤더를 갈무리합니다.
- 미터 색(정상/경고/위험)은 dataviz 팔레트 검증기로 색각 이상 분리도를 확인해
  골랐고, 색만으로 뜻이 전달되지 않도록 항상 숫자와 `aria-label` 을 함께 붙입니다.
- 공식 SDK 를 CDN 에서 불러오지 않고 `vendor/` 에 번들해 두었습니다.
  런타임 외부 의존성이 없고, CDN 이 막힌 망에서도 동작합니다.
  SDK 버전을 올리려면 `./tools/build-vendor.sh <버전>` 을 실행하세요.
- 모델이 돌려준 문자열은 모두 `textContent` 로만 넣습니다 (`innerHTML` 미사용).
