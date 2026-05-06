# META-SITE: 시스템 아키텍처 (architecture.md)

> core.md의 "3. 전체 시스템 아키텍처"를 모듈 구조 / 데이터 흐름 / 배포 토폴로지 / 보안 경계 차원에서 상세화한 문서.
> 후속 MD(`database-schema.md`, `publisher-adapters.md`, `meta-control-spec.md`)의 기반이 된다.
> 이 문서와 core.md가 충돌하면 core.md를 따른다.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ architecture.md            ★ 이 문서 — 시스템의 논리적/물리적 구조
  ├─ database-schema.md         (다음) — Firestore 데이터 모델 상세
  └─ publisher-adapters.md      (그 다음) — 어댑터 레이어 구현 사양
```

이 문서는 "코드를 어디에 어떻게 둘 것인가"의 청사진이다.

---

## 1. 시스템 경계 (System Boundary)

### 1.1 IN — 메타사이트가 직접 소유/운영하는 것

- **메타사이트 자체** (Control Tower) — 운영자 1인 전용 어드민
- **Publisher Adapter Layer** — 자식 사이트로의 발행을 추상화하는 인터페이스 계층
- **자체 도메인 자식 사이트들** — 메타가 생성/배포/운영하는 Next.js 인스턴스들
- **공통 데이터 저장소** — Firestore (메타 + 모든 자식 사이트의 데이터)
- **공통 프롬프트 자산** — 모든 자식 사이트가 공유하는 프롬프트 템플릿 풀

### 1.2 OUT — 외부 의존 (제어 불가, 어댑터로 격리)

- AI API: Anthropic / OpenAI / Google
- 출처 API: YouTube Data / Tavily / Perplexity / NewsAPI
- 외부 호스팅: Tistory / Blogger
- 검색엔진: Google / Bing / Naver (IndexNow / Search Console)
- 분석: GA4
- 알림: Slack / Discord / Email (Resend or SES)
- 배포: Vercel / Cloudflare

### 1.3 경계 원칙

> **"외부 의존은 모두 인터페이스 뒤에 숨긴다."**

AI 회사가 가격 올리거나, Tistory가 API 정책 바꾸거나, YouTube이 쿼터 줄여도 — 인터페이스만 갈아끼우면 된다. 메타의 비즈니스 로직 코드는 외부 변화에 영향 받지 않아야 한다.

---

## 2. 논리적 모듈 구조

### 2.1 메타사이트 모듈 (15개)

| # | 모듈 | 책임 | 주요 의존 |
|---|------|------|-----------|
| M01 | **Auth Module** | 관리자 로그인, 세션, 화이트리스트 검증 | Firebase Auth |
| M02 | **Site Registry** | 자식 사이트 CRUD, 메타데이터 관리 | Firestore `child_sites` |
| M03 | **Site Creation Orchestrator** | 새 사이트 생성 시 6단계 셋업 흐름 조율 | M02, M04, M07, M11 |
| M04 | **Hosting Provisioner** | 도메인/Vercel/티스토리/블로거 셋업 자동화 | Vercel API, DNS |
| M05 | **Source Pool Manager** | 자식 사이트별 출처 풀(RSS/YouTube/검색 등) 관리 + 헬스체크 | YouTube API, RSS 파서 |
| M06 | **Pipeline Orchestrator** | Phase 2의 4단계(Scout/Evaluate/Summarize/Generate) 조율 | M05, M09, M14 |
| M07 | **Authority Builder** | Phase 1 권위 트리 자동 생성 + 일일 발행 스케줄링 + Pillar 자동 생성 | M09, M14 |
| M08 | **Content Queue Manager** | 발행 예정/생성 중/검수 필요/발행됨 4단계 큐 상태 관리 | Firestore |
| M09 | **AI Service Layer** | Writer/Verifier/Editor 3인 체제 호출 + 프롬프트 자산 적용 | Anthropic/OpenAI/Google API |
| M10 | **Comment Bot** | AI 댓글 페르소나 생성 + 시간 분산 발행 | M09 |
| M11 | **SEO Generator** | meta tags / JSON-LD / llms.txt / sitemap / RSS / robots / IndexNow 자동 생성 | IndexNow API |
| M12 | **Internal Linking Engine** | 권위 그물 + 일반 글 자동 링크 삽입 | 임베딩 API |
| M13 | **Duplicate Detector** | 임베딩 유사도 기반 중복 검사 | 임베딩 API, Firestore |
| M14 | **Publisher Dispatcher** | 어댑터 레이어를 통해 실제 발행 트리거 | M09 출력 |
| M15 | **Health Monitor** | 사이트별 발행/출처/AI API/비용 추적 + 알림 | M02 |
| M16 | **Notification Hub** | Slack/Discord/Email 통합 발송 | Resend API 등 |
| M17 | **Analytics Aggregator** | Search Console + GA4 데이터 수집 + 인사이트 생성 | GSC/GA API |
| M18 | **Admin UI** | 컨트롤 타워 화면 (Next.js App Router) | M01~M17 모두 |

> 15개라고 했는데 실제론 18개. 표 짜다보니 늘었다. 18개가 맞다.

### 2.2 어댑터 레이어 모듈 (4개)

| # | 모듈 | 책임 |
|---|------|------|
| A01 | **SitePublisher Interface** | 모든 호스팅의 공통 계약 정의 |
| A02 | **NextjsPublisher** | 자체 도메인 Next.js 사이트로 발행 |
| A03 | **TistoryPublisher** | 쏙튜브 `lib/tistory.ts` 베이스. 어댑터로 리팩토링 |
| A04 | **BloggerPublisher** | 쏙튜브 `lib/blogger.ts` 베이스. 어댑터로 리팩토링 |

상세 사양은 `publisher-adapters.md`에서 정의.

### 2.3 자식 사이트 모듈 (Next.js 호스팅 옵션, 11개)

자체 도메인 자식 사이트는 메타가 자동 생성하는 Next.js 인스턴스. 다음 모듈을 가진다.

| # | 모듈 | 책임 |
|---|------|------|
| C01 | **Magazine Layout** | 사이트 전체 레이아웃 (헤더/푸터/네비게이션) |
| C02 | **Article Renderer** | 마크다운 → HTML 렌더링 + 광고 슬롯 + 내부 링크 |
| C03 | **Pillar Page Renderer** | 권위 통합 가이드 페이지 (Phase 1 종료 시 생성됨) |
| C04 | **AI Comment Display** | 댓글 + AI 라벨 + 사람 댓글 폼 |
| C05 | **Search Module** | 사이트 내 키워드 + 시맨틱 검색 |
| C06 | **Newsletter Subscribe** | 가입 폼 + 자식 사이트별 리스트 분리 |
| C07 | **Ad Slot Renderer** | 표준 슬롯 위치 + 사이트별 ON/OFF + 어필리에이트 분기 |
| C08 | **SEO Meta Renderer** | 페이지별 meta/og/twitter/JSON-LD 렌더링 |
| C09 | **llms.txt Endpoint** | `/llms.txt` 동적 생성 |
| C10 | **sitemap.xml Endpoint** | `/sitemap.xml` 동적 생성 |
| C11 | **RSS Endpoint** | `/rss.xml` 동적 생성 |

티스토리/블로그스팟 자식 사이트는 이 모듈들을 가질 수 없다(호스팅 제약). 그래서 Tistory/Blogger 어댑터는 **글 단위 HTML 변환만** 담당하고, 사이트 단위 기능(검색/뉴스레터/llms.txt 등)은 포기한다.

---

## 3. 모듈 의존성 그래프

```
                       ┌────────────────────────────────┐
                       │     M18: Admin UI (Next.js)    │
                       └───────────────┬────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌─────────────┐                ┌─────────────────┐              ┌─────────────┐
│ M01: Auth   │                │ M02: Site       │              │ M17: Analytics│
│ (Firebase)  │                │ Registry        │              │ Aggregator   │
└─────────────┘                └────────┬────────┘              └─────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
       ┌─────────────────┐     ┌──────────────────┐    ┌─────────────────┐
       │ M03: Site       │     │ M06: Pipeline    │    │ M07: Authority  │
       │ Creation        │     │ Orchestrator     │    │ Builder         │
       │ Orchestrator    │     │ (Phase 2)        │    │ (Phase 1)       │
       └────────┬────────┘     └────────┬─────────┘    └────────┬────────┘
                │                       │                       │
                ▼                       └────────┬──────────────┘
       ┌─────────────────┐                       │
       │ M04: Hosting    │                       ▼
       │ Provisioner     │              ┌─────────────────┐
       └────────┬────────┘              │ M09: AI Service │
                │                       │ Layer           │
                ▼                       │ (Writer/        │
       ┌─────────────────┐              │  Verifier/      │
       │ A01-A04:        │◄─────────────┤  Editor)        │
       │ Publisher       │              └────────┬────────┘
       │ Adapters        │                       │
       └────────┬────────┘                       ▼
                │                       ┌─────────────────┐
                │                       │ M11: SEO Gen    │
                │                       │ M12: Linking    │
                │                       │ M13: Duplicate  │
                │                       └────────┬────────┘
                │                                │
                ▼                                ▼
        [자식 사이트들]                    [Firestore 데이터]
                │                                │
                └────────────┬───────────────────┘
                             ▼
                  ┌─────────────────────┐
                  │ M15: Health Monitor │
                  │ M16: Notification   │
                  │ M10: Comment Bot    │
                  └─────────────────────┘
```

### 핵심 흐름 4가지

1. **사이트 생성 흐름:** M18 → M03 → M04 → A01-A04 (호스팅 셋업) → M02 (등록) → M07 (Phase 1 시작)
2. **Phase 1 발행 흐름:** M07 → M09 → (M11, M12, M13) → A01-A04 → 자식 사이트 → M15 (로그)
3. **Phase 2 발행 흐름:** M06 → M05 → M09 → (M11, M12, M13) → A01-A04 → 자식 사이트 → M10 → M15
4. **모니터링 흐름:** 모든 모듈 → M15 → M16 → 운영자

---

## 4. 데이터 흐름 다이어그램 (End-to-End)

### 4.1 Phase 2 일반 발행 — 한 편의 글이 만들어져 발행되는 전체 경로

```
                        [출처 풀 (RSS/YouTube/검색)]
                                    │
                                    │ ① Scout: 후보 수집
                                    ▼
                       ┌─────────────────────────────┐
                       │ Firestore                   │
                       │ sites/{id}/ai_scout_queue/  │
                       └─────────────┬───────────────┘
                                     │
                                     │ ② Evaluate: AI 2~3인 평가
                                     ▼
                       ┌─────────────────────────────┐
                       │ M09 AI Service Layer        │
                       │   - Verifier #1 (GPT-5)     │
                       │   - Verifier #2 (Gemini)    │
                       └─────────────┬───────────────┘
                                     │
                                     ▼
                       ┌─────────────────────────────┐
                       │ Firestore                   │
                       │ sites/{id}/ai_evaluate_queue│
                       └─────────────┬───────────────┘
                                     │
                                     │ ③ Summarize: 1위 후보 심층 요약
                                     ▼
                       ┌─────────────────────────────┐
                       │ M09 AI Service Layer        │
                       │   - Summarizer (Claude S4.6)│
                       └─────────────┬───────────────┘
                                     │
                                     ▼
                       ┌─────────────────────────────┐
                       │ Firestore                   │
                       │ sites/{id}/saved_summaries/ │
                       └─────────────┬───────────────┘
                                     │
                                     │ ④ Generate Post: 매거진 글 작성
                                     ▼
              ┌─────────────────────────────────────────────┐
              │ M09 AI Service Layer (3인 체제)             │
              │                                             │
              │   Writer (Claude Opus 4.7) ──┐             │
              │                              ▼              │
              │   Verifier (GPT-5) ──→ 사실/출처 검증        │
              │                              │              │
              │                              ▼              │
              │   Editor → SEO/가독성/내부링크 마커          │
              │                              │              │
              │                              ▼              │
              │   Final Integrator → 통합본                  │
              └─────────────┬───────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────────────────────┐
              │ M13 Duplicate Detector                      │
              │   - 임베딩 → 최근 90일 글과 코사인 유사도    │
              │   - 임계값 ≥0.90 → 재생성 또는 스킵          │
              └─────────────┬───────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────────────────────┐
              │ M11 SEO Generator                           │
              │   - meta/og/twitter/JSON-LD                 │
              │   - canonical / hreflang (필요 시)          │
              └─────────────┬───────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────────────────────┐
              │ M12 Internal Linking Engine                 │
              │   - 권위 트리 매칭 → 링크 삽입              │
              │   - 최근 글 매칭 → 양방향 링크              │
              └─────────────┬───────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────────────────────┐
              │ Firestore                                   │
              │ sites/{id}/curated_posts/                   │
              │   status: "draft" or "published"            │
              └─────────────┬───────────────────────────────┘
                            │
                            │ ⑤ Publish: autoPublish=true면 즉시
                            ▼
              ┌─────────────────────────────────────────────┐
              │ M14 Publisher Dispatcher                    │
              │   → A02/A03/A04 어댑터 선택                 │
              └──┬──────────────┬──────────────┬───────────┘
                 │              │              │
                 ▼              ▼              ▼
          ┌──────────┐   ┌──────────┐   ┌──────────┐
          │ Next.js  │   │ Tistory  │   │ Blogger  │
          │ 자식사이트│   │ API     │   │ API      │
          └──┬───────┘   └──┬───────┘   └──┬───────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                            │ ⑥ 발행 후 부가 작업 (병렬)
                            ▼
   ┌────────────────────┬────────────────────┬─────────────────────┐
   ▼                    ▼                    ▼                     ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ M11: sitemap│  │ M11: IndexNow│  │ M10: AI 댓글 │  │ M15: 발행 로그   │
│ /RSS 갱신   │  │ 호출 (구글/빙)│  │ 시간 분산 시작│  │ magazine_logs    │
│             │  │              │  │              │  │                  │
│ M11: llms.  │  │              │  │              │  │ 실패 시 → M16    │
│ txt 갱신    │  │              │  │              │  │ 알림             │
└─────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘
```

### 4.2 사이트 생성 흐름 (별도)

```
[운영자: 6단계 폼 제출]
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ M03 Site Creation Orchestrator                      │
│   "T+0 ~ T+18d 시퀀스 시작"                         │
└─┬───────────────────────────────────────────────────┘
  │
  ├─→ M04: 호스팅 셋업
  │      ├─ "nextjs": Vercel 새 프로젝트 + 도메인 + 환경변수
  │      ├─ "tistory": 토큰 검증 + 카테고리 검증
  │      └─ "blogger": Service Account 검증 + Blog ID 검증
  │
  ├─→ M02: child_sites/{siteId} 문서 생성
  │      └─ 하위 컬렉션 초기화 (saved_summaries, curated_posts 등)
  │
  ├─→ M11: 초기 SEO 인프라 생성
  │      ├─ /llms.txt (사이트 정체성 명시)
  │      ├─ /robots.txt
  │      ├─ /sitemap.xml (빈 상태)
  │      └─ /about, /privacy, /contact 페이지
  │
  └─→ M07 Authority Builder: Phase 1 시작
         │
         └─→ AI에게 주제 → 28~42편 목차 생성 (M09)
                │
                └─→ Firestore sites/{id}/authority_outline/ 저장
                       │
                       └─→ M16: 운영자에게 "목차 검토 요청" 알림
                              │
                              └─→ [운영자 승인 시]
                                     │
                                     └─→ Vercel Cron 자식 사이트별 동적 등록
                                            └─→ 첫 글 작성 시작
```

---

## 5. 배포 토폴로지 (Physical Architecture)

### 5.1 Vercel 프로젝트 구조

```
Vercel Account (Pro Plan)
│
├── meta-control-tower/              ★ 메타사이트
│   ├── 도메인: meta.example.com (운영자 전용)
│   ├── Cron Jobs: 
│   │   ├─ 매시간 헬스체크
│   │   ├─ 매일 09:00 일일 리포트
│   │   └─ 자식 사이트별 동적 Cron들 ← 사이트 생성 시 추가
│   └── 환경변수: 메타 + 모든 자식 사이트의 토큰들
│
├── child-travel-kr/                 ★ 자식 사이트 (Next.js 옵션)
│   ├── 도메인: travel-kr.com
│   ├── Cron: 없음 (메타가 트리거 보냄)
│   └── 환경변수: SITE_ID + Firestore 접근 키
│
├── child-travel-en/                 ★ 자식 사이트 (Next.js 옵션)
│   ├── 도메인: travel-en.com
│   └── ...
│
└── (티스토리/블로거 자식은 Vercel 프로젝트 없음)
```

### 5.2 Firebase 프로젝트 구조

**옵션 A — 단일 Firebase 프로젝트 (권장, 초기)**

```
firebase-meta-site/
├── Firestore: 모든 메타 + 자식 데이터 (네임스페이스로 분리)
├── Storage: 모든 자식 사이트 이미지
├── Auth: 운영자 1명
└── Functions: 비동기 작업용 (Vercel Functions로 충분하면 미사용)
```

장점: 비용 효율적, 백업 단일화. 단점: 한 프로젝트 장애 시 전체 영향.

**옵션 B — 메타 + 자식별 Firebase 프로젝트 분리 (자산 가치 높아질 때)**

```
firebase-meta/                       ← 메타 데이터만
firebase-travel-kr/                  ← travel-kr 자식 데이터
firebase-travel-en/                  ← travel-en 자식 데이터
...
```

장점: 자식 사이트 분리/매각 용이. 단점: 비용 증가, 관리 복잡.

> **결정:** 처음에는 옵션 A. 자식 사이트 수익이 충분히 나서 분리할 가치가 생기면 옵션 B로 마이그레이션. core.md "2.1 메타가 사라져도 자식은 산다" 원칙에 따라, 마이그레이션 출구는 처음부터 데이터 모델에 반영되어 있어야 한다(컬렉션 prefix를 그대로 쓰면 분리 가능).

### 5.3 도메인 / DNS 구조

```
meta.example.com           → Vercel meta-control-tower
travel-kr.com              → Vercel child-travel-kr
travel-en.com              → Vercel child-travel-en
ai-kr.tistory.com          → Tistory (도메인 매핑 안 함, 서브도메인 그대로)
ai-en.blogspot.com         → Blogger
insurance-kr.com           → Vercel child-insurance-kr
```

### 5.4 환경 변수 분포

```
[메타사이트 Vercel 프로젝트]
- 모든 AI API 키
- 모든 외부 서비스 키 (Vercel, GSC, GA)
- 자식 사이트별 토큰 (TISTORY_TOKEN_AIKR, BLOGGER_BLOG_ID_AIEN, ...)
- CRON_SECRET, ADMIN_EMAILS

[자식 사이트 Vercel 프로젝트들]
- SITE_ID
- Firebase 읽기 전용 접근 키 (자기 네임스페이스만)
- AdSense ID, GA ID
- 어필리에이트 풀 ID
```

자식 사이트는 AI API 키를 가지지 않는다. AI 호출은 메타사이트에서만 발생하고, 결과만 자식 사이트로 전달된다(또는 자식 사이트가 Firestore에서 읽음).

---

## 6. 외부 시스템 인터페이스

### 6.1 외부 의존 전체 표

| 카테고리 | 서비스 | 역할 | 인증 | 비용 모델 | 폴백 |
|---------|--------|------|------|-----------|------|
| AI | Anthropic Claude | Writer, Editor | API Key | Token 기반 | OpenAI |
| AI | OpenAI GPT | Verifier, 임베딩 | API Key | Token 기반 | Gemini |
| AI | Google Gemini | Verifier 백업, Generate Post | API Key | Token 기반 | Claude |
| 출처 | YouTube Data API | 영상 메타/자막 | API Key | 일일 쿼터 | (없음, 필수) |
| 출처 | Tavily Search | 출처 실재 검증 | API Key | 월정액 + 종량 | Perplexity |
| 출처 | Perplexity | 출처 검증 백업 | API Key | 월정액 | Tavily |
| 출처 | RSS Feed | 다양한 매체 RSS | 없음 | 무료 | (개별) |
| 호스팅 | Vercel | 메타 + 자체 자식 | Token | Pro 플랜 | Cloudflare Pages |
| 호스팅 | Tistory | 자식 사이트 | OAuth Token | 무료 | (없음) |
| 호스팅 | Blogger | 자식 사이트 | Service Account | 무료 | (없음) |
| 데이터 | Firebase | DB + Storage + Auth | Service Account | 종량 | (없음, 필수) |
| 분석 | Google Search Console | 검색 성과 | Service Account | 무료 | (없음) |
| 분석 | Google Analytics 4 | 트래픽 분석 | Service Account | 무료 | Vercel Analytics |
| 색인 | IndexNow API | 즉시 색인 요청 | API Key | 무료 | (자연 색인 대기) |
| 알림 | Slack/Discord | 헬스 알림 | Webhook URL | 무료 | Email |
| 알림 | Resend (or SES) | 이메일 발송 | API Key | 종량 | 다른 SMTP |

### 6.2 인터페이스 어댑터 책임

각 외부 서비스 호출은 메타 코드 어딘가에서 직접 호출하지 않고, **어댑터를 통해서만** 호출한다.

```typescript
// ❌ 나쁜 예
import Anthropic from '@anthropic-ai/sdk'
const result = await anthropic.messages.create({...})

// ✅ 좋은 예
import { aiService } from '@/lib/ai-service'
const result = await aiService.write({ persona, prompt, model: 'auto' })
```

이렇게 하면:
- 모델 교체가 한 곳에서 끝남
- 비용/지연 측정이 한 곳에서 됨
- 폴백 로직이 한 곳에 있음
- 테스트 시 mock 주입이 쉬움

---

## 7. 인증과 보안 경계

### 7.1 보안 영역 4계층

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: 메타사이트 어드민                                │
│ - Firebase Auth (이메일/패스워드 또는 Google OAuth)        │
│ - ADMIN_EMAILS 화이트리스트 검증 (서버사이드)              │
│ - 세션 만료 24시간                                        │
│ - 모든 어드민 작업 audit log 기록                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Layer 2: 메타사이트 ↔ 자식 사이트 통신                    │
│ - 메타가 자식 사이트의 Firestore에 직접 쓰는 방식          │
│ - 자식 사이트는 자기 네임스페이스만 읽기 가능              │
│ - HTTP 호출이 필요한 경우 X-Internal-Token 헤더           │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Vercel Cron 인증                                │
│ - CRON_SECRET 헤더 검증                                  │
│ - Vercel만 호출 가능한 vercel-id 헤더 추가 검증            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Layer 4: 자식 사이트 (공개)                               │
│ - 모든 페이지 공개 (검색엔진/사용자)                       │
│ - 댓글 작성/뉴스레터 가입은 reCAPTCHA로 봇 차단            │
│ - 어드민 페이지 없음 (메타에서 모두 제어)                  │
└─────────────────────────────────────────────────────────┘
```

### 7.2 토큰 관리 정책

- **티스토리 토큰** — 만료 없음. Vercel 환경변수에 저장. 사이트별 prefix로 구분.
- **블로거 Service Account JSON** — Vercel 환경변수에 base64 인코딩 저장.
- **AI API 키** — 메타사이트에만 존재. 자식 사이트에 절대 노출 안 함.
- **Firebase Admin SDK 키** — 메타사이트에만 존재. 자식 사이트는 클라이언트 SDK + 자기 네임스페이스 권한만.

### 7.3 Firestore 보안 규칙 (개념)

```
match /child_sites/{siteId} {
  // 메타사이트 어드민만 쓰기 가능
  allow write: if request.auth.token.email in admin_emails;
  
  // 클라이언트 측에서는 자기 사이트의 발행된 글만 읽기 가능
  allow read: if resource.data.status == 'published';
}

match /sites/{siteId}/curated_posts/{postId} {
  allow read: if resource.data.status == 'published';
  allow write: if request.auth.token.email in admin_emails;
}
```

상세 규칙은 `database-schema.md`에서 정의.

---

## 8. 캐싱 전략

| 대상 | 위치 | 갱신 트리거 |
|------|------|------------|
| 자식 사이트 글 페이지 | Vercel CDN (ISR, revalidate=300s) | 새 글 발행 시 on-demand revalidate |
| 자식 사이트 홈/카테고리 | Vercel CDN (ISR, revalidate=600s) | 새 글 발행 시 on-demand revalidate |
| Pillar Page | Vercel CDN (ISR, revalidate=3600s) | 권위 글 추가/수정 시 |
| llms.txt / sitemap.xml / RSS | Vercel CDN (revalidate=3600s) | 새 글 발행 시 on-demand revalidate |
| 글 임베딩 | Firestore (영구) | 한 번 생성 후 변경 없음 |
| 출처 RSS 파싱 결과 | 메모리 + Firestore (TTL 1h) | Cron Scout 단계에서 재수집 |
| AI API 응답 | 캐싱 안 함 | 매번 새 호출 |
| 메타 어드민 페이지 | 캐싱 안 함 (실시간) | - |

### 8.1 ISR On-Demand Revalidation

새 글 발행 시 메타사이트가 자식 사이트의 revalidation 엔드포인트를 호출:

```
POST https://travel-kr.com/api/revalidate
Headers: { 'X-Internal-Token': '...' }
Body: { paths: ['/articles/abc-123', '/sitemap.xml', '/rss.xml', '/'] }
```

자식 사이트가 해당 경로들을 즉시 갱신.

---

## 9. 비동기 처리 전략

### 9.1 작업 분류

| 작업 | 실행 위치 | 시간 |
|------|----------|------|
| Scout (출처 수집) | Vercel Cron / Function | ≤60초 |
| Evaluate (AI 평가) | Vercel Function | ≤120초 |
| Summarize (요약) | Vercel Function | ≤120초 |
| Generate Post (3인 체제) | Vercel Function | ≤180초 (긴 작업) |
| 헬스체크 | Vercel Cron | ≤30초 |
| 발행 후 부가 작업 (sitemap/IndexNow/댓글) | Vercel Function (병렬) | ≤60초 |
| 임베딩 인덱싱 | Vercel Function | ≤30초 |

### 9.2 Vercel Function 시간 한계

- Pro 플랜: 함수당 최대 300초 (5분)
- Generate Post가 가장 오래 걸림. 3인 체제 + 검증 외부 호출 + 내부 링크 매칭 → 180~250초.
- 한계 도달 시 작업 분할: Generate Post를 Stage A(작성) / Stage B(검증) / Stage C(편집+발행) 3단계로 분할하고, 각 단계가 다음 단계를 트리거.

### 9.3 큐 기반 작업 (대량 처리)

자식 사이트가 N개 늘어나면 단일 Cron이 모든 사이트를 순차 처리하기 힘들어짐.

**해결책: 메타사이트가 디스패처 역할**

```
[Vercel Cron]
   ↓ (KST 06:00 단일 호출)
[Meta Dispatcher]
   ↓ Firestore에서 활성 자식 사이트 목록 조회
   ↓ 각 사이트별로 Cloud Tasks 또는 Vercel Function 비동기 호출
   ├─ site-1 Scout 트리거
   ├─ site-2 Scout 트리거
   ├─ site-3 Scout 트리거
   └─ ...
```

Cloud Tasks 사용 시 자식 사이트 100개까지 무리 없이 처리 가능.

### 9.4 실패 재시도 정책

```
Tier 1 — 일시 오류 (네트워크/Rate Limit)
  → 즉시 재시도 (최대 3회, exponential backoff)
  → 모두 실패 시 Tier 2로

Tier 2 — 처리 가능 오류 (출처 일시 다운)
  → 1시간 후 재시도 (Cron으로 자동)
  → 24시간 동안 실패 누적되면 Tier 3로

Tier 3 — 처리 불가 오류 (출처 영구 다운, 토큰 만료)
  → M16 알림 발송
  → 해당 출처/사이트를 자동 비활성화
```

상세는 `monitoring-health.md` 참조.

---

## 10. 장애 격리 (Fault Isolation)

### 10.1 격리 원칙

> **"한 사이트의 문제가 다른 사이트로 전파되지 않는다."**

- 자식 사이트 A의 발행 실패 → 자식 사이트 B에 영향 없음.
- 자식 사이트 A의 호스팅 다운 → 메타사이트 어드민 정상 작동.
- AI 회사 1곳 다운 → 다른 AI로 자동 폴백.
- 출처 1개 다운 → 그 출처만 비활성화, 다른 출처 정상.

### 10.2 격리 메커니즘

| 격리 단위 | 격리 방법 |
|----------|-----------|
| 자식 사이트별 | Vercel 별도 프로젝트, Firestore 네임스페이스, 독립 Cron |
| AI 호출별 | 폴백 모델 체인 (Claude → GPT → Gemini → 일반 출력) |
| 출처별 | 헬스체크 실패 N회 누적 시 자동 비활성화 |
| 어댑터별 | Tistory 발행 실패가 메인 자식 사이트 발행을 막지 않음 (`magazine.md` 7장 패턴) |

### 10.3 Critical Path

다음 컴포넌트는 단일 장애점이며, 다운되면 시스템 전체가 멈춘다.

- Firebase (Firestore + Auth) — 단일 장애점
- Vercel (메타사이트 호스팅) — 단일 장애점
- Anthropic + OpenAI 동시 다운 — 폴백 체인이 모두 끊어짐

이 셋이 동시에 다운될 확률은 낮지만, 각 SLA를 정기 점검하고, Firebase는 자동 백업을 통해 데이터 손실만은 방지.

---

## 11. 확장성 한계 추정

### 11.1 자식 사이트 수 N에 따른 부하

| N (자식 사이트 수) | 일일 발행 수 | Vercel Function 호출 수 | Firestore 읽기/쓰기 | AI API 비용 추정 |
|-------------------|-------------|------------------------|---------------------|-----------------|
| 1 | 3편 | ~50회 | ~1k r/w | ~$0.50 |
| 6 (현재 목표) | 18편 | ~300회 | ~6k r/w | ~$3 |
| 20 | 60편 | ~1k회 | ~20k r/w | ~$10 |
| 100 | 300편 | ~5k회 | ~100k r/w | ~$50 |

### 11.2 한계점

- **Vercel Pro 플랜**: 함수 호출/시간 limit 도달은 자식 사이트 ~50개부터 의식해야 함. 그 이상은 Enterprise 또는 Cloudflare Workers 이전.
- **Firestore**: 읽기/쓰기 비용은 사이트 수에 거의 비례. 100개 사이트 시 월 $50~100 추정.
- **AI API**: 가장 큰 비용. 자식 사이트별 일일 예산 한도 + 글 길이 제한이 필요.
- **사람의 검수 한계**: 자식 사이트 N=10 넘어가면 운영자 1인이 모든 글을 검수 못 함. autoPublish 정책 + 자동 품질 게이트가 필수.

### 11.3 권장 페이스

```
1단계 (1~2개월): 자식 사이트 1~2개로 검증
2단계 (3~6개월): 자식 사이트 3~6개로 확장 (현재 목표)
3단계 (6~12개월): 잘 되는 사이트는 자체 자산화, 약한 사이트는 종료
4단계 (12개월~): 성공 패턴 자식 사이트 10~20개까지 확장
```

---

## 12. 보안 위협 모델

### 12.1 위협 시나리오

| # | 위협 | 영향 | 방어 |
|---|------|------|------|
| T1 | 메타 어드민 토큰 탈취 | 모든 자식 사이트 통제 상실 | 2FA 필수, IP 제한, 세션 만료 |
| T2 | 자식 사이트 어댑터 토큰 탈취 (Tistory/Blogger) | 해당 자식 사이트만 영향 | Vercel Secret 사용, 정기 회전, 토큰별 권한 최소화 |
| T3 | AI가 가짜 출처 생성 | SEO 권위 추락, 신뢰도 하락 | 검증자 단계 + 검색 API 실재 확인 (core.md 6.2) |
| T4 | 검색엔진 패널티 (중복/저품질) | 트래픽 0 | 임베딩 유사도 검사 + 품질 게이트 + 사람 검수 큐 |
| T5 | AdSense 정책 위반 | 광고 계정 정지 | 정책 위반 키워드 필터, 콘텐츠 사전 분류 |
| T6 | AI 댓글이 발각되어 신뢰 추락 | 사이트 평판 추락 | 🤖 AI 라벨 명시 (core.md 7.2) |
| T7 | Firebase 비용 폭주 | 운영 비용 급증 | 일일 쿼터 알림, 자식 사이트별 예산 한도 |
| T8 | AI API 비용 폭주 | 운영 비용 급증 | 자식 사이트별 일일 토큰 한도, 모델 자동 다운그레이드 |

상세 대응은 `monitoring-health.md`와 `seo-automation.md`에서 정의.

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 18개 메타 모듈 + 4개 어댑터 모듈 + 11개 자식 사이트 모듈
- ✅ 모듈 간 의존성 그래프
- ✅ Phase 2 발행의 End-to-End 데이터 흐름
- ✅ Vercel/Firebase 배포 토폴로지 (단일 → 분리 마이그레이션 경로)
- ✅ 외부 의존 16종 + 어댑터 격리 원칙
- ✅ 4계층 보안 경계 + 토큰 관리 정책
- ✅ 캐싱 / 비동기 / 격리 / 확장성 / 위협 모델

이 문서가 정의하지 않은 것 (다음 문서들에서):
- ❌ Firestore 컬렉션 / 필드 / 인덱스 / 보안 규칙 상세 → `database-schema.md`
- ❌ Publisher 어댑터 인터페이스 시그니처와 구현 코드 가이드 → `publisher-adapters.md`
- ❌ 메타 어드민 UI 페이지별 와이어프레임과 컴포넌트 구조 → `meta-control-spec.md`
- ❌ 새 사이트 생성 6단계 폼의 필드 정의와 검증 규칙 → `site-creation-flow.md`
- ❌ Phase 1 권위 트리 자동 생성 알고리즘 → `authority-building.md`
- ❌ AI 3인 체제의 프롬프트 템플릿 전체 → `ai-roles-and-prompts.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md v1.0 기준. |

---

*이 문서는 메타사이트의 시스템 아키텍처를 정의한다. 모든 후속 구현 결정은 이 구조를 따른다.*

*다음 문서: `database-schema.md` (Tier A 2번)*
