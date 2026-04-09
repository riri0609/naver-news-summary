# 실시간 뉴스 요약

안녕 반가워
네이버 뉴스 검색 API로 기사를 가져온 뒤, OpenAI로 **요약 · 키워드(중요도) · 맥락 기반 감정 · 카테고리 · 트렌드 인사이트**를 한 번에 보여주는 [Next.js](https://nextjs.org) 웹 앱입니다.

**저장소:** [github.com/riri0609/naver-news-summary](https://github.com/riri0609/naver-news-summary)

## 주요 기능

- **검색 모드**: 키워드 검색 / 오늘 / 이번 주(서울 기준 날짜 필터)
- **AI 분석**: 전체 요약, 핵심 키워드, 전체·기사별 감정, 주제 분류, 트렌드 불릿
- **UI**: 반응형, 기사별 상세(아코디언)

## 기술 스택

- Next.js (App Router) · React · TypeScript
- Tailwind CSS
- 네이버 검색 API (뉴스) · OpenAI Chat Completions API

## 사전 준비

1. [네이버 개발자센터](https://developers.naver.com)에서 애플리케이션 등록 후 **Client ID / Client Secret** 발급 (검색 API 사용)
2. [OpenAI API 키](https://platform.openai.com/api-keys) 발급

## 설치 및 실행

```bash
npm install
```

### 환경 변수 (API 키)

**`.env.local` 파일은 Git에 포함되지 않습니다.** 루트에 직접 만들고 아래 변수를 채우세요.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|------|------|
| `NAVER_CLIENT_ID` | 네이버 애플리케이션 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 애플리케이션 Client Secret |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `OPENAI_MODEL` | (선택) 기본값 `gpt-4o-mini` |

개발 서버:

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 빌드

```bash
npm run build
npm start
```

## API

- `POST /api/news/analyze`  
  - Body: `{ "mode": "keyword" | "today" | "week", "keyword"?: string }`  
  - `keyword` 모드에서는 검색어가 필수입니다.

## 보안 주의

- **API 키는 절대 저장소에 커밋하지 마세요.** (`\.env`, `\.env.local` 등은 `.gitignore`에 포함됨)
- 공개 저장소에 올릴 때는 히스토리에 키가 남지 않았는지 확인하세요.
- 네이버/OpenAI **이용약관·호출 한도**를 준수해야 합니다.

## 라이선스

이 프로젝트는 개인 학습·실험 목적으로 사용할 수 있습니다. 상업적 이용 시 각 API 및 네이버 검색 API 정책을 따르세요.
