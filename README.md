# 말씀잔치 (Word Feast)

참된평화를만드는사람들 · 주일 말씀 나눔 웹사이트

- 공개 주소: https://ksk0203-oss.github.io/word-feast/
- 빌드 도구 없이 동작하는 정적 사이트 (HTML + CSS + 바닐라 JS + JSON)

## 폴더 구조

```
index.html            루트 진입점 — 최신 연도(2026/)로 이동
2026/
├── index.html        목차 — data/toc.json을 읽어 월별 카드 표시
├── assets/
│   ├── app.js        공통 스크립트 (글씨 크기 · 음성 낭독 · 인쇄 · 스크롤)
│   └── style.css     전체 스타일
├── data/
│   ├── toc.json      목차
│   ├── sermons.json  주일 말씀 본문
│   └── greek.json    헬라어 원어 강해
├── sermon/detail.html   주일 말씀 상세  (?id=01)
└── greek/detail.html    원어 강해 상세  (?id=greek-0802)
```

## 데이터 형식

### `data/toc.json` — 목차 (배열)

| 필드 | 설명 |
| --- | --- |
| `id` | 주일 번호 `"01"` … `"18"`. `sermons.json`의 `id`와 일치해야 함 |
| `month` | `"8"` ~ `"12"`. 목차에서 월별 묶음 기준 |
| `week_label` | `"첫번째주"` 등 (현재 목차 화면은 순서로 자동 생성) |
| `date` | `"2026.8.2"` |
| `scripture` | `"마태복음 14:13-21"` |
| `greek_id` | 원어 강해가 있으면 `"greek-0802"`, 없으면 `null` |

### `data/sermons.json` — 주일 말씀 (배열)

`id`, `month`, `week_label`, `date`, `date_title`, `caption`, `scripture`, `greek_id`,
`scripture_html`(성경 본문 HTML), `sections[]`

`sections[]`의 각 항목은 `{ "title": "신학적 관점", "html": "<p class=\"para\">…</p>" }` 형태이며,
기본 네 관점은 **신학적 / 주석적 / 목회적 / 설교적** 순서입니다.

### `data/greek.json` — 원어 강해 (배열)

`id`, `week`, `scripture`, `verses[]`

`verses[]`의 각 항목은 `num`(절), `greek`(헬라어 원문), `summary`(우리말 풀이),
`note`(문법 주석), `translations[]`(`label` + `text`). 번역본 표시 순서는
`greek/detail.html`의 `TRANS_ORDER`에서 **새번역 → NIV → KJV → ASV** 로 지정합니다.

## 주일 하나 추가하기

1. `data/sermons.json`에 항목 추가 (`sections`의 `html`은 문단마다 `<p class="para">`)
2. `data/toc.json`에 같은 `id`로 항목 추가
3. 원어 강해가 있으면 `data/greek.json`에 추가하고, 양쪽 `greek_id`를 맞춤

`class="para"`, `class="scripture-para"`, `class="greek-summary"`는 스타일뿐 아니라
음성 낭독 대상을 고르는 기준이기도 하므로 빠뜨리지 않아야 합니다.

## 로컬에서 보기

`file://`로 열면 `fetch`가 막혀 목차가 표시되지 않습니다. 반드시 로컬 서버로 열어 주세요.

```bash
npx serve 2026
```

## 배포

`main` 브랜치에 push하면 GitHub Pages가 저장소 루트를 그대로 게시합니다.
새 연도를 추가할 때는 루트 `index.html`의 이동 경로도 함께 바꿔 주세요.
