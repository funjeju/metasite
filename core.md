# META-SITE: AI 자동 발행 메타사이트 시스템 — CORE 명세서

> 모든 후속 문서의 기준점. 이 문서가 진실이다.
> 후속 MD에서 충돌이 있으면 core.md를 따른다.

---

## 0. 이 문서의 위치와 역할

이 문서(`core.md`)는 메타사이트 전체 시스템의 단일 진실 공급원(Single Source of Truth)이다.

- 모든 후속 MD는 이 문서를 확장/상세화한다.
- 이 문서는 **WHAT**(무엇을 만드는가)과 **WHY**(왜)를 정의한다.
- 후속 MD는 **HOW**(어떻게 구현하는가)를 정의한다.
- 이 문서의 데이터 모델/필드명/용어는 모든 후속 문서와 코드에서 그대로 사용한다.
- 클로드 코드(Claude Code)는 이 문서를 먼저 읽고, 작업 대상 후속 MD를 골라서 구현한다.

이 시스템은 **쏙튜브(SSOKTUBE)에서 검증된 AI 매거진 자동 발행 시스템**을 베이스로 하여, **다중 자식 사이트를 발행/관리하는 메타사이트**로 확장한 구조다. 즉 쏙튜브 단일 사이트의 검증된 4단계 파이프라인(Scout → Evaluate → Summarize → Generate Post)을 N개 자식 사이트에 적용 가능하도록 어댑터 레이어와 권위 구축 시스템을 추가한 형태다.

---

## 1. 프로젝트 개요

### 1.1 한 문장 정의

> 메타사이트는 **나 혼자 쓰는 컨트롤 타워**로, 블로그 형태의 SEO 최적화 자식 사이트를 양산하고, 각 자식 사이트는 독립 도메인/독립 SEO/독립 권위를 가진 채로 자동 발행 루틴을 영구 가동시킨다.

### 1.2 SaaS가 아니다

- 외부 사용자에게 제공하는 서비스가 아니다.
- 다중 사용자/결제/권한 시스템 불필요.
- 단일 운영자(나) 전용 어드민. 인증은 단순 관리자 로그인 1개.

### 1.3 자식 사이트의 정체성

각 자식 사이트는:
- 독자적인 도메인을 가진다 (또는 티스토리/블로그스팟 서브도메인).
- 독자적인 `<title>`, `meta description`, `og:image`, `JSON-LD`, `llms.txt`, `robots.txt`, `sitemap.xml`을 가진다.
- 검색 로봇 시점에서 **완전히 독립된 사이트**로 인식되어야 한다.
- 메타사이트는 자식 사이트의 콘텐츠/설정을 **외부에서 제어**할 뿐, 검색엔진/사용자 시점에서는 보이지 않는다.

### 1.4 콘텐츠 전략의 두 단계

| 단계 | 기간 | 역할 | 출처 의존도 |
|------|------|------|-------------|
| **Phase 1: 권위 구축** | 사이트 생성 후 2~3주 (28~42편) | 원론적 기초 지식의 그물 구축. SEO 권위의 토대. | 낮음 (AI 내부 지식 위주, 가짜 출처 금지) |
| **Phase 2: 지속 발행** | Phase 1 종료 후 무기한 | 시의성 있는 출처 기반 콘텐츠 + AI 토론/검증 | 높음 (실시간 출처 + 다층 검증) |

이 두 단계 모델이 메타사이트의 핵심 차별점이다.

### 1.5 언어 전략

- **한국어/영어 사이트는 별도 자식 사이트로 운영한다.**
- 자동 번역 기능 없음. 같은 주제라도 출처를 분리해서 독립적으로 글을 생성한다.
- 이유: (1) 검색 의도가 언어별로 다름 (2) 중복 콘텐츠 패널티 회피 (3) hreflang 복잡도 제거 (4) 각 사이트 독립 권위 누적.

---

## 2. 핵심 철학 및 설계 원칙

### 2.1 "메타가 사라져도 자식은 산다"

자식 사이트는 메타사이트 없이도 독립적으로 운영 가능해야 한다. 즉:
- 자식 사이트의 데이터는 자식 사이트 영역에 자체 보관(Firestore 또는 자체 DB).
- 메타사이트는 어디까지나 "리모트 컨트롤". 자식 사이트의 본체가 아니다.
- 자식 사이트가 잘 되면 메타에서 분리해서 별도 운영할 수 있어야 한다(마이그레이션 출구 설계).

### 2.2 "검증된 시스템 위에 쌓는다"

쏙튜브 시스템(`magazine.md` 가이드 참조)은 이미 작동하고 있다. 메타사이트는 이걸 처음부터 다시 만드는 것이 아니라 **추상화하고 확장**한다.

- 쏙튜브의 `Scout/Evaluate/Summarize/GeneratePost` 4단계는 그대로 살린다.
- 쏙튜브의 Firestore 컬렉션 구조(`saved_summaries`, `curated_posts`, `magazine_logs` 등)는 자식 사이트별 네임스페이스로 확장한다.
- 쏙튜브의 Tistory/Blogger 어댑터 코드(`lib/tistory.ts`, `lib/blogger.ts`)는 그대로 메타사이트의 Publisher Adapter로 들어간다.
- 쏙튜브의 Vercel Cron 3회 스케줄은 자식 사이트별 독립 Cron으로 확장한다.

### 2.3 "SEO 권위를 위한 모든 것"

모든 설계 결정은 다음 질문에 답해야 한다:
> "이 결정이 검색엔진(구글/빙/네이버)이 이 자식 사이트를 권위 있는 사이트로 인식하는 데 도움이 되는가?"

도움이 안 되면 후순위. 도움이 되면 우선순위.

### 2.4 "자동화를 자동화한다"

- 사이트 생성도 자동화(클릭 한 번 → 도메인 연결 + Vercel 배포 + Firebase 프로젝트 + 초기 설정).
- 권위 구축도 자동화(주제 입력 → 28~42편 목차 자동 생성 → AI 3인 체제 자동 작성/검증/편집 → 자동 발행).
- 일반 발행도 자동화(출처 수집 → AI 평가 → 요약 → 글 생성 → 발행).
- 모니터링도 자동화(실패 알림, 헬스체크, 중복 방지).
- 사람의 개입은 "시작 버튼", "긴급 정지", "검수 인터페이스"의 3가지뿐.

---

## 3. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      META-SITE (컨트롤 타워)                     │
│                 — meta.example.com (나만 접속)                   │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 사이트 생성 │ │ 콘텐츠 큐    │ │ 헬스 모니터  │ │ 검색콘솔  │ │
│  │ /관리       │ │ /검수        │ │ /알림        │ │ /애널리틱스│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 프롬프트    │ │ 출처 풀      │ │ 광고/어필   │ │ 이메일    │ │
│  │ 자산 관리   │ │ 관리         │ │ 슬롯 관리    │ │ 리스트    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │  Site Config + Pipeline Trigger
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PUBLISHER ADAPTER LAYER                        │
│                                                                 │
│   ┌────────────────────┐ ┌────────────┐ ┌──────────────────┐    │
│   │ NextjsPublisher    │ │ TistoryPub │ │ BloggerPublisher │    │
│   │ (자체 도메인+Vercel)│ │  (Tistory)│ │  (Blogspot)      │    │
│   └────────────────────┘ └────────────┘ └──────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼─────────────────┬──────────────────┐
        ▼                    ▼                 ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ travel.com   │   │ aikr.tistory │   │ ai-en.blog   │   │ insurance.com│
│ (Next.js)    │   │ (Tistory)    │   │ (Blogspot)   │   │ (Next.js)    │
│ 한국어 여행  │   │ 한국어 AI    │   │ 영어 AI      │   │ 한국어 보험  │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                             │
                             │  자동 발행 루틴 가동
                             ▼
                     [Phase 1: 권위 구축 → Phase 2: 지속 발행]
```

### 3.1 메타사이트 (Control Tower)

- **호스팅:** Vercel + Next.js (App Router)
- **데이터:** Firebase (Firestore + Storage + Functions)
- **인증:** 관리자 1명 (Firebase Auth + 단일 이메일 화이트리스트)
- **역할:** 자식 사이트 CRUD, 파이프라인 트리거, 모니터링, 통합 분석

### 3.2 Publisher Adapter Layer

자식 사이트의 호스팅 방식을 추상화하는 인터페이스 계층.

```typescript
interface SitePublisher {
  publish(post: GeneratedPost): Promise<PublishResult>
  updateSiteSettings(settings: SiteConfig): Promise<void>
  getStats(): Promise<SiteStats>
  healthCheck(): Promise<HealthStatus>
}
```

세 구현체:
- `NextjsPublisher` — Vercel API + Firestore 저장 + 자체 도메인
- `TistoryPublisher` — 쏙튜브의 `lib/tistory.ts` 그대로 활용
- `BloggerPublisher` — 쏙튜브의 `lib/blogger.ts` 그대로 활용

추후 확장 가능: `WordPressPublisher`, `MediumPublisher`, `BrunchPublisher` 등.

### 3.3 자식 사이트

각 자식 사이트의 호스팅 옵션과 적합 주제는 `4. 자식 사이트 호스팅 어댑터` 참조.

---

## 4. 자식 사이트 호스팅 어댑터

### 4.1 세 가지 호스팅 옵션

| 호스팅 | 장점 | 단점 | 적합한 주제 |
|--------|------|------|-------------|
| **자체 도메인 (Next.js + Vercel)** | 완전 통제, 도구 결합 자유, 광고 자유, 디자인 자유, 데이터 완전 소유 | 초기 SEO 권위 0부터, Vercel 비용 | 메인 자산, 도구 결합 핵심 주제 (여행/세무 계산기/보험 비교 등) |
| **티스토리** | 한국 검색 빠른 색인, 무료, 카카오 트래픽 | 광고 제약, 도구 결합 불가, 디자인 제약, 데이터 회수 어려움 | 한국어 정보성 콘텐츠, 빠른 검증, 백링크 자산 |
| **블로그스팟** | 글로벌(특히 영어) 색인 빠름, 구글 자산, 무료 | 디자인 제약, 도구 결합 불가, 한국 검색 약함 | 영어 정보성 콘텐츠, 빠른 검증, 백링크 자산 |

### 4.2 호스팅 선택 매트릭스 (예시)

```
여행 한국어 (메인 자산)        → 자체 도메인 (Next.js)
여행 영어 (메인 자산)          → 자체 도메인 (Next.js)
AI 한국어 (권위 구축 + 검증)   → 티스토리
AI 영어 (권위 구축 + 검증)     → 블로그스팟
보험 한국어 (정보성)           → 티스토리
보험 영어 (정보성)             → 블로그스팟
```

### 4.3 메타에서 사이트 생성 시 UI 흐름

```
[+ 새 자식 사이트 만들기]

1단계: 기본 정보
  - 사이트 이름: ___________
  - 주제 카테고리: [여행 / AI / 보험 / 건강 / ...] (커스텀 가능)
  - 언어: [한국어 / 영어 / 일본어 / ...]
  - 톤/페르소나: [전문가형 / 친근형 / 학술형 / ...]

2단계: 호스팅 방식 선택
  ○ 자체 도메인 + Vercel 배포
  ○ 티스토리 블로그
  ○ 블로그스팟

3단계: 호스팅별 추가 입력
  [자체 도메인]   → 도메인 입력 + Vercel 토큰 + Firebase 프로젝트 ID
  [티스토리]      → 블로그 이름 + Access Token + 카테고리 ID
  [블로그스팟]    → Blog ID + Service Account JSON

4단계: 콘텐츠 전략 설정
  - 권위 구축 단계: ON / OFF (보통 ON)
    └ 주제 입력 → AI가 28~42편 목차 자동 생성 → 사용자 승인 또는 재생성
  - 일반 발행 섹션: 3~4개 정의
    └ 섹션별 출처 풀 / 발행 빈도 / 톤 / 광고 슬롯 설정
  - AI 댓글 시스템: ON / OFF + 댓글봇 페르소나 5종 선택

5단계: SEO/광고/이메일
  - GA 추적 ID, Search Console 인증
  - AdSense ID, 어필리에이트 링크 풀
  - 뉴스레터 사용 여부 + 발신자 정보

6단계: 검토 및 [생성 시작]
  → 자동으로:
    1) 도메인/호스팅 셋업
    2) Firestore 자식 사이트 네임스페이스 생성
    3) 초기 페이지(About, Privacy, Contact, llms.txt 등) 자동 생성
    4) Phase 1 권위 구축 루틴 가동 (즉시)
```

자세한 흐름은 `site-creation-flow.md`에서 정의.

---

## 5. 콘텐츠 파이프라인 — 쏙튜브 시스템 기반 확장

### 5.1 두 단계 발행 모델

```
[사이트 생성]
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: 권위 구축 (Authority Building, 0~3주)          │
│                                                         │
│ - 주제 트리 자동 생성 (28~42편 목차)                      │
│ - AI 3인 체제로 글 작성 (작성/검증/편집)                  │
│ - 시의성 무관, 원론적/역사적/이론적 콘텐츠 위주             │
│ - 출처 없어도 OK, 단 가짜 출처 절대 금지                   │
│ - 하루 2~3편 발행, 28~42편 완료까지 약 2~3주               │
│ - 28~42편이 서로 깊이 연결된 내부 링크 그물 형성             │
│ - 마지막에 통합 pillar page 자동 생성                     │
└─────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: 지속 발행 (Ongoing Publishing, 3주~∞)          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 쏙튜브 4단계 파이프라인을 그대로 사용                  │ │
│ │                                                     │ │
│ │  ① Scout      후보 수집 (RSS, YouTube, 검색 등)      │ │
│ │  ② Evaluate   AI 2~3인 심사 → 최적 후보 결정          │ │
│ │  ③ Summarize  심층 요약 + 댓글/주변 정보 수집          │ │
│ │  ④ Generate   AI 3인 체제로 매거진 글 생성 + 발행     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ - 섹션별로 독립 운영 (3~4개 섹션 = 3~4개 파이프라인)        │
│ - 권위 구축 글들로 자동 내부 링크                         │
│ - AI 토론/검증으로 단순 요약 이상의 깊이 확보               │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Phase 1: 권위 구축 단계 상세

#### 5.2.1 흐름

```
[1] 사이트 생성 시 입력된 주제 (예: "AI 활용법") 받음
   ↓
[2] AI가 해당 주제의 권위 구축용 목차 자동 생성
   - 28~42편 (카테고리 깊이에 따라 조정)
   - 기초 → 심화 → 응용 순으로 의존성 그래프 구축
   - 각 글은 다른 글들과 어떻게 연결되는지 메타데이터 포함
   ↓
[3] 운영자(나)가 목차 검토 → 승인 또는 재생성 요청
   ↓
[4] 승인된 목차의 첫 글부터 순차 작성 시작
   - 하루 2~3편 페이스 (Vercel Cron으로 자동)
   - 각 편마다 AI 3인 체제 (작성자/검증자/편집자)
   - 권위 출처 풀이 있으면 인용, 없으면 일반론으로 서술
   - 절대 가짜 출처 인용 금지 (검증자 단계에서 차단)
   ↓
[5] 발행 시 자동으로:
   - SEO 메타 / JSON-LD / llms.txt 갱신
   - 사이트맵 / RSS / IndexNow 알림
   - 이전에 발행된 권위 글들 본문에 새 글 링크 자동 삽입
   - 새 글 본문에 관련된 이전 글들 링크 자동 삽입
   ↓
[6] 28~42편 모두 발행 완료 시:
   - 통합 pillar page 자동 생성 ("OO 완전 가이드")
   - 모든 권위 글이 pillar page를 통해 그물처럼 연결됨
   - 사이트가 Phase 2로 자동 전환
```

#### 5.2.2 주제 트리 자동 생성

운영자가 입력하는 것: **사이트 주제 1개** (예: "AI 활용법")

AI가 출력하는 것:
```yaml
authority_outline:
  topic: "AI 활용법"
  total_articles: 36
  expected_duration_days: 18  # 하루 2편 기준
  
  tiers:
    - tier: 1
      label: "기초"
      articles:
        - id: "auth-001"
          title: "AI란 무엇인가 — 정의와 역사"
          depends_on: []
          links_to: ["auth-002", "auth-003", "auth-007"]
          target_keyword: "AI 정의"
        - id: "auth-002"
          title: "머신러닝 vs 딥러닝 vs 신경망"
          depends_on: ["auth-001"]
          links_to: ["auth-001", "auth-008"]
          ...
    - tier: 2
      label: "심화"
      ...
    - tier: 3
      label: "응용"
      ...
  
  pillar_page:
    title: "AI 활용법 완전 가이드 — 처음부터 끝까지"
    auto_generated_after: "auth-036"
    structure: "3-tier table of contents with all 36 articles"
```

이 트리가 곧 **권위 구축 글들의 내부 링크 그물의 설계도**다.

상세는 `authority-building.md` 참조.

### 5.3 Phase 2: 지속 발행 단계 상세

#### 5.3.1 쏙튜브 4단계의 메타사이트 매핑

| 쏙튜브 단계 | 메타사이트 확장 | 출처 타입 |
|-------------|-----------------|-----------|
| Scout | 자식 사이트별 출처 풀에서 후보 수집 | YouTube, RSS, 뉴스 API, 검색 API, 학술 DB 등 |
| Evaluate | AI 2~3인이 후보 점수 매김 | (변경 없음, 평가 프롬프트만 사이트별 차별화) |
| Summarize | 심층 요약 + 주변 맥락 (댓글, 관련 자료) | (변경 없음) |
| Generate Post | **AI 3인 체제로 매거진 글 생성** + 권위 글들로 내부 링크 + 발행 | 작성자/검증자/편집자 분리 |

#### 5.3.2 섹션 구조

각 자식 사이트는 3~4개의 섹션을 가진다. 섹션 = 독립 파이프라인.

예시 (AI 한국어 사이트):
```
섹션 1: AI 뉴스
  - 출처: 테크크런치 RSS, 한국 IT 매체 RSS, 네이버 IT 뉴스
  - 발행 주기: 매일 1편
  - 톤: 빠르고 객관적인 보도형
  - 광고 슬롯: 본문 중간 + 하단

섹션 2: AI 도구 리뷰
  - 출처: 유튜브 도구 리뷰 채널, Product Hunt API
  - 발행 주기: 주 3편
  - 톤: 실용형 비교 분석
  - 광고 슬롯: 어필리에이트 링크 풍부

섹션 3: AI 활용 사례
  - 출처: 케이스 스터디 사이트, 비즈니스 매체
  - 발행 주기: 주 2편
  - 톤: 깊이 있는 분석 + 인사이트

섹션 4: AI 입문 가이드 (Phase 1 권위 글들의 업데이트 섹션)
  - 권위 글 중 시의성이 추가된 부분 갱신
  - 발행 주기: 주 1편
```

각 섹션은 메타사이트에서 ON/OFF 가능, 출처 추가/삭제, 발행 빈도 조정.

#### 5.3.3 Vercel Cron 스케줄

쏙튜브의 3회/일 모델을 자식 사이트별로 확장:

```
KST 06:00 → 사이트 A 섹션 1 파이프라인
KST 09:00 → 사이트 A 섹션 2 파이프라인
KST 12:00 → 사이트 B 섹션 1 파이프라인
KST 14:00 → 사이트 A 섹션 3 파이프라인
KST 17:00 → 사이트 B 섹션 2 파이프라인
KST 22:00 → 사이트 A 섹션 4 + 사이트 B 섹션 3
...
```

상세는 `vercel-cron-spec.md` 참조.

---

## 6. AI 3인 체제 (작성자/검증자/편집자)

### 6.1 역할 분담

```
📚 작성자 (Writer)
   - 모델: Claude Opus 4.7 (또는 사이트별 설정)
   - 역할: 초안 작성. 깊이 있는 설명. 페르소나 일관성.
   - 출력: 마크다운 본문 + 메타데이터 초안

🔍 검증자 (Verifier)
   - 모델: GPT-5 또는 Gemini 2.5 Pro (작성자와 다른 회사)
   - 역할:
     1) 사실 오류 검증 (날짜/숫자/이름)
     2) 출처 실재 확인 ("Smith 2018"이 실재 논문인지 검색)
     3) 가짜 출처 탐지 → 발견 시 차단 또는 일반론 변환
     4) 논리적 일관성 검증
   - 출력: 수정 지시 리스트 (구조화된 JSON)

✏️ 편집자 (Editor)
   - 모델: 별도 모델 (또는 작성자와 같은 모델 다른 프롬프트)
   - 역할:
     1) SEO 최적화 (제목, H2/H3, 키워드 밀도, 메타 디스크립션)
     2) 가독성 (문단 길이, 문장 길이, 인포그래픽 표현)
     3) 내부 링크 삽입 (권위 글들 + 관련 글들)
     4) 광고 슬롯 마커 삽입
   - 출력: 최종 발행본

🎯 최종 통합
   - 작성자가 검증자/편집자 피드백을 반영해서 최종본 생성
   - 또는 별도 통합 모델이 셋의 출력을 병합
```

### 6.2 가짜 출처 방지 (Critical)

권위 구축 단계는 출처 없어도 되지만, **AI가 가짜 출처를 만들어내는 환각**을 절대 차단해야 한다.

#### 방어선 3중 구조

1. **프롬프트 차원**
   - 작성자 프롬프트에 명시: "출처를 인용할 때는 반드시 실제 존재하는 출처만. 확신이 없으면 일반론으로 서술하고 인용 안 함."
   - 권위 구축 글에서는 인용 형식 자체를 금지하고 "일반적으로 알려진 바에 따르면" 식으로 표현 권장.

2. **검증자 차원**
   - 본문에 인용된 모든 출처를 검색 API(Tavily, Perplexity, Google Search API 등)로 실재 확인.
   - 1차 통과 못 하면 작성자에게 재작성 지시 또는 인용 제거.

3. **편집자 차원**
   - 최종 발행 직전 한 번 더 출처 패턴 검사 ("(저자명 연도)" 패턴 등).
   - 의심 패턴 발견 시 발행 차단 + 운영자 알림.

상세 프롬프트는 `ai-roles-and-prompts.md` 참조.

### 6.3 사이트별 페르소나/톤

각 자식 사이트는 고유의 작성자 페르소나를 가진다.

```yaml
site_persona:
  travel_kr:
    voice: "20년차 자유 여행자. 친근하지만 정보의 깊이는 절대 양보 안 함."
    forbidden_words: ["완전", "정말", "꿀팁", "혜자"]  # 클리셰 방지
    citation_style: "출처를 본문 자연스럽게 녹여서, 각주는 안 씀"
    emoji_usage: "minimal"
  
  ai_kr:
    voice: "AI 분야 박사 학위급 깊이, 그러나 학부생도 이해할 수 있게."
    forbidden_words: ["혁신적", "획기적"]
    citation_style: "기술 논문/공식 블로그 명시 인용"
    emoji_usage: "none"
```

페르소나는 메타사이트에서 편집 가능하고 버전 관리된다(v1, v2, v3).

---

## 7. AI 댓글 시스템

### 7.1 목적

- 빈 댓글창은 사이트 신뢰도를 깎는다.
- 잘 만든 AI 토론은 글 자체보다 깊은 인사이트를 줄 수 있다.
- 체류시간/페이지 다양성/롱테일 키워드 → SEO 시그널 강력.

### 7.2 안전 설계 5원칙

1. **공개 명시:** 모든 AI 댓글에 `🤖 AI 토론` 라벨 부착. 속이는 게 아니라 "이 주제로 AI들이 토론한 결과" 콘텐츠 포지셔닝.
2. **페르소나 다양화:** 사이트별 5종 페르소나 등록 (예: 회의적인 회계사 / 호기심 많은 학생 / 경험 많은 실무자 / 비판적 학자 / 낙관적 마케터). 각 페르소나는 다른 모델로 돌림 (Claude / GPT / Gemini).
3. **글자수 변주:** 5~12개 댓글 사이로 다양화. 짧은 한 줄("동의합니다") 도 섞기.
4. **시간 분산:** 글 발행 직후 와르르 X. 첫 1시간 1개 → 다음 6시간 2~3개 → 다음 24시간 잔여분.
5. **사람 댓글 우선:** 사람 댓글이 달리면 페르소나가 그것에 반응하는 형태로 자연스럽게 전환.

### 7.3 사이트별 ON/OFF

- 메타사이트 어드민에서 자식 사이트별 AI 댓글 시스템 ON/OFF 가능.
- 사이트별 댓글 톤 다르게 설정 (보험 사이트 ≠ AI 사이트).
- 댓글 시스템이 외부 도구(Disqus 등)에 의존하지 않음. 자체 구현.

상세는 `ai-comment-system.md` 참조.

---

## 8. SEO 자동화 시스템

### 8.1 글 발행 시 자동 생성 항목

발행 트리거 시 자동으로 생성/갱신:

- `<title>`: 60자 이내, 키워드 앞쪽
- `<meta name="description">`: 155자 이내
- Open Graph 태그 (og:title, og:description, og:image, og:type)
- Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image)
- JSON-LD 스키마: `Article`, `BreadcrumbList`, `FAQPage` (해당하는 경우)
- `canonical` URL
- `hreflang` (필요 시. 한/영 사이트 분리 운영이라 보통 불필요)

### 8.2 사이트 단위 자동 생성 항목

자식 사이트 생성 시 또는 글 추가 시 자동 갱신:

- `sitemap.xml` (글 발행 시마다 자동 갱신)
- RSS Feed (`/rss.xml`)
- `robots.txt` (사이트별 자동 생성)
- `llms.txt` (2026년 핵심: AI 크롤러 최적화. 사이트 요약 + 주요 글 리스트 + 권위 영역 명시)
- IndexNow 프로토콜 자동 호출 (구글/빙에 즉시 색인 요청)
- Google Search Console 사이트 자동 등록 (API 사용)
- Google Analytics 4 자동 연결

### 8.3 llms.txt 구조 예시

```
# travel-kr.com — 자유 여행자를 위한 깊이 있는 가이드

이 사이트는 20년차 자유 여행자가 작성한 깊이 있는 한국어 여행 콘텐츠를 제공합니다.
모든 글은 실제 방문 경험과 검증된 출처를 기반으로 합니다.

## 권위 가이드 (Pillar Pages)
- /guide/europe-complete - 유럽 자유여행 완전 가이드
- /guide/southeast-asia - 동남아 자유여행 완전 가이드

## 최신 글 섹션
- /news - 여행 뉴스
- /tools - 여행 도구 리뷰
- /destinations - 여행지 깊이 분석

## 인용 정책
이 사이트의 콘텐츠를 AI가 인용할 때는 출처 표기와 함께 원문 링크를 포함해주세요.
```

상세는 `seo-automation.md` 참조.

---

## 9. 내부 링크 그물 + Pillar Page

### 9.1 권위 구축 글들의 내부 링크 그물

Phase 1에서 만들어진 28~42편은 단순 시리즈가 아니라 **위키피디아처럼 서로 깊이 연결된 그물**이어야 한다.

```
1편 "AI란 무엇인가" 본문에:
  - "신경망이란 [7편 참조]"
  - "딥러닝의 정의는 [9편 참조]"
  - "AI의 역사는 [3편 참조]"

7편 "신경망" 본문에:
  - "AI에 대한 일반적 설명은 [1편 참조]"
  - "역전파 알고리즘은 [12편 참조]"
  - "CNN/RNN 구조는 [15, 16편 참조]"
```

### 9.2 자동 링크 삽입 메커니즘

```
[새 글 X 발행]
   ↓
[X의 본문에서 권위 트리의 다른 개념 언급 자동 탐지]
   ↓
[해당 개념을 다루는 권위 글 Y의 링크를 X 본문에 삽입]
   ↓
[Y의 본문에 X로의 역링크가 적절하면 추가]
   ↓
[Pillar page 갱신: X가 어느 카테고리/티어에 속하는지]
```

탐지 방식:
- 키워드 매칭 (각 권위 글에 등록된 `target_keyword` + `aliases` 배열 사용)
- 임베딩 유사도 매칭 (의미 기반)
- 링크는 자연스러운 위치에만 (문단당 최대 1개, 전체 본문 대비 최대 5%)

### 9.3 Pillar Page

Phase 1 종료 시 자동 생성되는 통합 가이드 페이지.

```
URL: /guide/[topic]-complete

구조:
  - Hero: "AI 활용법 완전 가이드 — 처음부터 끝까지"
  - 인트로 (사이트 정체성 + 이 가이드의 가치)
  - 티어별 목차
    Tier 1: 기초 (8편)
    Tier 2: 심화 (16편)
    Tier 3: 응용 (12편)
  - 각 글의 1~2줄 요약 + 클릭 시 해당 글
  - 마지막: "이제 시작해보기" CTA
```

이 pillar page는 사이트의 SEO 자산 1순위. 모든 일반 발행 글에서 거꾸로 링크되어야 함.

상세는 `internal-linking.md` 참조.

---

## 10. 광고 슬롯 및 어필리에이트

### 10.1 표준 슬롯 위치

모든 자식 사이트는 동일한 슬롯 ID 체계를 사용 (메타에서 통합 관리):

```
ad-slot-header        : 헤더 바로 밑
ad-slot-top           : 글 상단 (제목 아래)
ad-slot-mid           : 본문 중간 (자동 위치 계산: H2 사이)
ad-slot-bottom        : 글 하단 (FAQ 위 또는 아래)
ad-slot-sidebar-1     : 사이드바 상단
ad-slot-sidebar-2     : 사이드바 하단 (스티키)
ad-slot-inline-cta    : 본문 내 CTA 박스 (어필리에이트 권장 위치)
```

### 10.2 사이트별 ON/OFF + 카테고리별 어필리에이트

```yaml
site_monetization:
  travel_kr:
    adsense_id: "ca-pub-..."
    slots_enabled: [header, top, mid, bottom, sidebar-1, sidebar-2, inline-cta]
    affiliate_pools:
      hotels: ["agoda_id_xxx", "booking_id_yyy"]
      flights: ["skyscanner_id_zzz"]
      tools: ["wifi_egg_partner"]
    
  insurance_kr:
    adsense_id: "ca-pub-..."
    slots_enabled: [top, mid, bottom, inline-cta]  # 사이드바 OFF
    affiliate_pools:
      insurance: ["partner_a", "partner_b", "partner_c"]
```

### 10.3 글 카테고리 매칭

글이 발행될 때 카테고리에 맞는 어필리에이트 풀에서 자동으로 inline-cta 박스 선택.

상세는 `monetization.md` 참조.

---

## 11. 헬스 모니터링 및 큐 관리

### 11.1 모니터링 대상

- 각 자식 사이트의 발행 성공/실패율
- 출처 헬스체크 (RSS 죽으면 24h 내 알림)
- 빌드 실패 시 메타에 즉시 알림 (Slack/Discord/이메일 webhook)
- AI API 호출 실패율 + 비용 추적
- Vercel 함수 실행 시간 추적
- Firestore 비용 추적

### 11.2 콘텐츠 큐 4단계

```
[발행 예정] → [생성 중] → [검수 필요 / 자동 발행] → [발행됨]
              │              │
              │              └─ autoPublish OFF면 검수 단계 진입
              │                  운영자가 메타에서 승인/거부 가능
              │
              └─ AI 작성/검증/편집 진행 중
                 실패 시 [실패] 상태로 격리, 알림
```

### 11.3 출처별 빈도 조절

한 출처에 발행이 편중되지 않도록:
- 출처별 최근 N일 발행 횟수 추적
- 발행 횟수 많은 출처는 가중치 감소 (Scout 단계에서 부드럽게 우선순위 하향)
- 출처 다양성 점수 = 일정 수준 이상 유지

상세는 `monitoring-health.md` 참조.

---

## 12. 중복 방지 시스템

### 12.1 임베딩 유사도 검사

```
[새 글 후보 본문 생성]
   ↓
[OpenAI / Voyage / Cohere 임베딩 API로 벡터화]
   ↓
[같은 자식 사이트의 최근 90일 글 벡터들과 코사인 유사도 비교]
   ↓
유사도 ≥ 0.90 → 재생성 (다른 각도로) 또는 스킵
유사도 0.80~0.90 → 검증자에게 차별화 피드백 요청
유사도 < 0.80 → 통과
```

### 12.2 자식 사이트 간 중복도 모니터링

같은 주제 한/영 사이트가 출처 분리되어도 우연히 비슷해질 수 있음. 메타사이트 대시보드에 사이트 간 유사도 히트맵 표시.

### 12.3 같은 출처 중복 발행 방지

쏙튜브의 `postedToMagazine: true` 마킹 메커니즘을 그대로 활용. 자식 사이트별 네임스페이스로 확장.

상세는 `duplicate-prevention.md` 참조.

---

## 13. 검색 / 이메일 / 검색 콘솔 통합

### 13.1 사이트 내 검색

- 각 자식 사이트는 `/search` 페이지 자동 보유.
- Firestore에 글 임베딩 저장 → 시맨틱 검색 (쏙튜브에 이미 구현되어 있는 패턴).
- 글 50편 미만이면 키워드 검색만, 50편 이상이면 시맨틱 검색 추가.

### 13.2 이메일 수집

- 각 자식 사이트는 뉴스레터 가입 폼 보유 (옵션).
- 발신: 자식 사이트 이름으로. 메타 이름은 노출 안 됨.
- 이메일 리스트는 자식 사이트별 분리.
- 새 글 발행 시 자동 뉴스레터 옵션 (사이트별 ON/OFF).
- 알고리즘 변화에 흔들리지 않는 직접 채널.

### 13.3 Google Search Console 통합

- 사이트 생성 시 자동 등록 (Search Console API).
- 메타사이트 대시보드에서 모든 자식 사이트의 검색 성과 통합 조회.
- 키워드별 클릭률/노출 → "이 사이트는 OO 키워드로 강하다" 자동 인사이트.
- 다음 글 주제 추천에 반영 (선순환).

상세는 `search-and-email.md`, `analytics-integration.md` 참조.

---

## 14. 기술 스택

### 14.1 메타사이트 스택

- **프레임워크:** Next.js 15+ (App Router)
- **호스팅:** Vercel (Pro 플랜 이상 — 다중 Cron 위해)
- **데이터:** Firebase (Firestore + Storage + Functions)
- **인증:** Firebase Auth (관리자 1명)
- **UI:** Tailwind CSS + shadcn/ui
- **상태:** Zustand 또는 React Server Components 위주

### 14.2 자식 사이트 스택 (자체 도메인 옵션)

- **프레임워크:** Next.js 15+ (App Router) — 메타가 자동 생성
- **호스팅:** Vercel (자식 사이트별 별도 프로젝트)
- **데이터:** Firestore (자식 사이트별 컬렉션 네임스페이스)
- **CDN/이미지:** Vercel + Next.js Image
- **분석:** GA4 + Search Console + Vercel Analytics

### 14.3 AI 모델

- **작성자(Writer):** Claude Opus 4.7 (Anthropic API)
- **검증자(Verifier):** GPT-5 또는 Gemini 2.5 Pro (다른 회사로 교차 검증)
- **편집자(Editor):** Claude Opus 4.7 또는 Sonnet 4.6 (별도 프롬프트)
- **요약(Summarize):** Claude Sonnet 4.6 (쏙튜브와 동일)
- **글 생성(Generate Post):** Gemini 2.5 Flash (쏙튜브와 동일, 옵션)
- **임베딩:** OpenAI text-embedding-3-large 또는 Voyage AI

### 14.4 출처 및 외부 API

- YouTube Data API (쏙튜브와 동일)
- Tavily / Perplexity Search API (출처 검증)
- Google Search Console API
- Google Analytics 4 Data API
- IndexNow API (구글/빙)
- Tistory API (어댑터)
- Blogger API v3 (어댑터)
- Vercel API (자식 사이트 자동 배포)

---

## 15. Firestore 데이터 구조 (확장)

쏙튜브의 컬렉션을 자식 사이트 네임스페이스로 확장.

```
Firestore
│
├── meta_sites/                       ★ 메타사이트 자체 메타데이터
│   └── {metaConfigId}
│       ├── adminEmails[]
│       ├── globalSettings{}
│       └── createdAt
│
├── child_sites/                      ★ 자식 사이트 등록부
│   └── {siteId}
│       ├── name, slug, language
│       ├── topic, persona, tone
│       ├── hostingType: "nextjs" | "tistory" | "blogger"
│       ├── hostingConfig{} (도메인, 토큰 등)
│       ├── currentPhase: "authority" | "ongoing"
│       ├── sections[] (Phase 2 섹션 정의)
│       ├── monetization{}
│       ├── seoConfig{}
│       ├── healthStatus{}
│       └── createdAt, lastActivityAt
│
├── sites/{siteId}/authority_outline/  ★ Phase 1 권위 트리
│   └── {outlineId}
│       ├── topic, total_articles
│       ├── tiers[] (각 글의 메타데이터)
│       ├── pillar_page_id (Phase 1 종료 시 채워짐)
│       └── status: "draft" | "approved" | "in_progress" | "complete"
│
├── sites/{siteId}/ai_scout_queue/     ← 쏙튜브 동일 구조
├── sites/{siteId}/ai_evaluate_queue/  ← 쏙튜브 동일 구조
├── sites/{siteId}/ai_pipeline_state/  ← 쏙튜브 동일 구조
├── sites/{siteId}/saved_summaries/    ← 쏙튜브 동일 구조
├── sites/{siteId}/curated_posts/      ★ 쏙튜브 + 메타사이트 확장 필드
│   └── {postId}
│       ├── (쏙튜브 모든 필드 그대로)
│       ├── phase: "authority" | "ongoing"
│       ├── outline_id (Phase 1만)
│       ├── tier (Phase 1만)
│       ├── internal_links[] (자동 삽입된 내부 링크)
│       ├── ai_comments[] (AI 댓글들)
│       ├── tistoryUrl, tistoryPostId
│       ├── bloggerUrl, bloggerPostId
│       ├── nextjs_path (자체 도메인 옵션)
│       └── verifier_report{} (검증자 출력 보존)
│
├── sites/{siteId}/magazine_logs/       ← 쏙튜브 동일 구조
├── sites/{siteId}/sources/             ★ 출처 풀
│   └── {sourceId}
│       ├── type: "rss" | "youtube_channel" | "search_api" | "manual"
│       ├── config{}
│       ├── healthStatus
│       └── recentUseCount (편중 방지)
│
├── sites/{siteId}/settings/curation    ← 쏙튜브 동일 + 확장
│   ├── enabled, autoPublish, schedule, lookbackDays  (쏙튜브 그대로)
│   ├── aiCommentsEnabled
│   ├── aiVerificationEnabled
│   └── duplicateThreshold
│
├── sites/{siteId}/personas/            ★ 댓글봇 페르소나
│   └── {personaId}
│
├── prompt_assets/                      ★ 프롬프트 자산 (전역)
│   └── {promptId}
│       ├── role: "writer" | "verifier" | "editor" | ...
│       ├── version (v1, v2, ...)
│       ├── template
│       ├── usedBySites[] (어느 사이트가 어느 버전 쓰는지)
│       └── performanceMetrics{}
│
└── alerts/                             ★ 헬스 알림 큐
    └── {alertId}
```

상세는 `database-schema.md` 참조.

---

## 16. Vercel Cron 스케줄

### 16.1 메타사이트 자체 Cron

- 매시간: 모든 자식 사이트 헬스체크
- 매일 오전 9시: 일일 리포트 생성 + 운영자 이메일
- 매일 자정: 데이터 백업

### 16.2 자식 사이트별 Cron (사이트 생성 시 동적 등록)

쏙튜브의 3회/일 모델을 자식 사이트별로 적용:

```json
{
  "crons": [
    { "path": "/api/cron/site/{siteId}/scout", "schedule": "0 21 * * *" },
    { "path": "/api/cron/site/{siteId}/evaluate", "schedule": "10 21 * * *" },
    { "path": "/api/cron/site/{siteId}/summarize", "schedule": "20 21 * * *" },
    { "path": "/api/cron/site/{siteId}/generate", "schedule": "30 21 * * *" }
    // ... 카테고리별 반복
  ]
}
```

⚠️ **Vercel Hobby 플랜은 Cron 1회/일 제한.** Pro 플랜 필수.

대안 (Pro도 한계 도달 시):
- Cloudflare Workers Cron (무제한)
- GitHub Actions Schedule (5분 단위)
- 메타사이트 1개 Cron이 큐 디스패처 역할 → 내부적으로 모든 작업 분기

상세는 `vercel-cron-spec.md` 참조.

---

## 17. 메타사이트 컨트롤 타워 UI

### 17.1 메인 대시보드 (홈)

```
┌─────────────────────────────────────────────────────────────┐
│  META-SITE CONTROL TOWER                          [+ 새 사이트] │
├─────────────────────────────────────────────────────────────┤
│  📊 통합 KPI (오늘)                                          │
│   - 총 발행: 12편   |  실패: 0편  |  검수 대기: 2편          │
│   - 통합 트래픽: 3.2k  |  AI API 비용: $4.20                │
├─────────────────────────────────────────────────────────────┤
│  🏠 자식 사이트 (6)                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ travel-kr.com         [Phase 2] 🟢   12편/주        │    │
│  │ → 오늘 2편 발행 / 트래픽 1.2k / 권위 36편 완료        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ travel-en.com         [Phase 2] 🟢   10편/주        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ai-kr.tistory.com     [Phase 1] 🟡   18/36편        │    │
│  │ → 권위 구축 진행 중 (Day 9/18)                       │    │
│  └─────────────────────────────────────────────────────┘    │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 자식 사이트 상세 페이지

탭 구조:
- 개요 (트래픽, 발행, 헬스)
- 콘텐츠 큐 (발행 예정/생성 중/검수 필요/발행됨)
- 권위 트리 (Phase 1 진행 상황 또는 완료된 트리 시각화)
- 섹션 (Phase 2 섹션 관리)
- 출처 풀
- 페르소나 (작성자 + 댓글봇)
- SEO/광고/이메일
- 분석 (Search Console + GA 통합)
- 설정

### 17.3 글로벌 탭

- 프롬프트 자산 (모든 사이트 공통 프롬프트 + 버전)
- 알림 큐 (헬스 알림 + 검수 알림)
- 비용 (AI API + Vercel + Firestore 통합)
- 백업/복원

상세는 `meta-control-spec.md` 참조.

---

## 18. 워크플로우 — 시작부터 발행까지

### 18.1 새 자식 사이트 시작 (End-to-End)

```
[T+0]  운영자: 메타에서 [+ 새 사이트] 클릭
       → 6단계 입력 (4.3 참조)
       → [생성 시작]

[T+1m] 자동: 호스팅 셋업
       → 자체 도메인이면 Vercel 새 프로젝트 + DNS 안내
       → 티스토리/블로그스팟이면 토큰 검증

[T+3m] 자동: Firestore 자식 사이트 네임스페이스 생성
       → child_sites/{siteId} 문서 생성
       → 하위 컬렉션들 초기화

[T+5m] 자동: 초기 페이지 자동 생성
       → /about, /privacy, /contact, /search
       → llms.txt, robots.txt, sitemap.xml (빈 상태)

[T+7m] 자동: Phase 1 시작
       → AI에게 주제 입력 → 28~42편 목차 생성
       → 운영자에게 검토 요청 알림

[T+?]  운영자: 메타에서 목차 검토
       → [승인] 또는 [재생성 요청 with 피드백]

[T+승인 직후] 자동: 첫 글 작성 시작
       → 작성자/검증자/편집자 3인 체제
       → 약 5~15분 소요
       → 검증자가 가짜 출처 발견 → 차단/재작성

[T+첫 글 완료] 자동: 발행
       → SEO 메타 자동 생성
       → sitemap/RSS 갱신
       → IndexNow 알림
       → llms.txt 갱신
       → 헬스 큐에 성공 로그

[T+1d 이후] 자동: 하루 2~3편 페이스로 권위 구축 글 발행
       → 매 발행마다 이전 글들 본문에 링크 자동 삽입
       → 큐 모니터링, 실패 시 알림

[T+18d 전후] 자동: 28~42편 완료
       → Pillar page 자동 생성
       → llms.txt에 권위 영역 명시
       → 사이트가 Phase 2로 자동 전환
       → 운영자에게 "Phase 1 완료, Phase 2 시작" 알림

[T+18d~∞] 자동: Phase 2 지속 발행
       → 쏙튜브 4단계 파이프라인 매일 가동
       → 섹션별 독립 운영
       → AI 댓글 시스템 작동 (글 발행 직후 시작)
       → 이메일 뉴스레터 자동 발송 (옵션)
```

### 18.2 운영자의 일상 (Steady State)

```
매일 아침 9시:
  - 메타사이트 대시보드 한 번 확인 (3분)
  - 어제 발행/실패 확인
  - 검수 대기 글이 있으면 빠르게 승인/거부

매주 1회:
  - Search Console 통합 인사이트 확인 (15분)
  - 잘 먹히는 키워드 → 유사 주제 권위 글 추가 검토
  - 출처 풀 업데이트

분기별 1회:
  - 프롬프트 자산 v++ 업데이트
  - 새 자식 사이트 검토
  - 잘 된 자식 사이트 → 메타에서 분리 검토 (출구 설계)
```

---

## 19. 환경 변수 전체 목록

### 19.1 메타사이트 환경 변수

```bash
# ===== Firebase (메타) =====
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

# ===== AI =====
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# ===== 출처/검증 =====
TAVILY_API_KEY=                 # 출처 실재 검증
PERPLEXITY_API_KEY=             # 검증자 백업
YOUTUBE_API_KEY=
NEWS_API_KEY=                   # (선택)

# ===== 임베딩 =====
VOYAGE_API_KEY=                 # (선택, OpenAI 대체)

# ===== 분석 =====
GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT=
GOOGLE_ANALYTICS_SERVICE_ACCOUNT=

# ===== 배포 =====
VERCEL_TOKEN=                   # 자식 사이트 자동 배포용
VERCEL_TEAM_ID=

# ===== 알림 =====
SLACK_WEBHOOK_URL=              # 또는 Discord
ALERT_EMAIL_FROM=
ALERT_EMAIL_TO=

# ===== 보안 =====
CRON_SECRET=                    # Vercel Cron 인증
ADMIN_EMAILS=                   # 콤마 구분

# ===== IndexNow =====
INDEXNOW_API_KEY=
```

### 19.2 자식 사이트별 (자식 사이트 호스팅 옵션에 따라)

```bash
# === 자체 도메인 자식 사이트마다 ===
SITE_ID=
SITE_FIREBASE_PROJECT_ID=       # 자식 사이트 별도 Firebase 프로젝트 (선택)

# === 티스토리 자식 사이트마다 ===
TISTORY_ACCESS_TOKEN_{SITE}=
TISTORY_BLOG_NAME_{SITE}=
TISTORY_CATEGORY_ID_{SITE}=

# === 블로거 자식 사이트마다 ===
BLOGGER_BLOG_ID_{SITE}=
GOOGLE_SERVICE_ACCOUNT_EMAIL_{SITE}=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_{SITE}=
```

상세는 `environment-variables.md` 참조.

---

## 20. 후속 MD 파일 로드맵

이 core.md 다음으로 작성할 MD 파일들. 우선순위 순서대로 정렬.

### 20.1 Tier A — 코어 (반드시 먼저 작성)

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `architecture.md` | 시스템 아키텍처 상세. 모듈 의존성 그래프, 데이터 흐름, 배포 토폴로지. core.md의 "3. 아키텍처" 섹션을 그림 + 텍스트로 풀어냄. | 6~8천자 |
| `database-schema.md` | Firestore 컬렉션/필드 전체 명세. 인덱스 설계. 보안 규칙. core.md의 "15. 데이터 구조" 확장. | 5~7천자 |
| `meta-control-spec.md` | 메타사이트 컨트롤 타워 UI/UX 상세 명세. 페이지별 와이어프레임 수준 묘사 + 컴포넌트 구조. core.md의 "17. 컨트롤 타워 UI" 확장. | 8~12천자 |
| `site-creation-flow.md` | 새 자식 사이트 생성 워크플로우 상세. 6단계 폼 + 자동 셋업 단계별 구현 사양. core.md의 "4.3" + "18.1" 통합 확장. | 5~7천자 |
| `publisher-adapters.md` | NextjsPublisher / TistoryPublisher / BloggerPublisher 인터페이스와 각 구현체 상세 사양. 쏙튜브 `lib/tistory.ts`, `lib/blogger.ts`를 어댑터로 리팩토링하는 가이드 포함. | 6~8천자 |

### 20.2 Tier B — 콘텐츠 시스템 (Tier A 다음)

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `authority-building.md` | Phase 1 권위 구축 시스템 전체 상세. 주제 트리 자동 생성 알고리즘, 의존성 그래프, 일일 발행 스케줄링, pillar page 자동 생성. | 7~10천자 |
| `content-pipeline.md` | Phase 2 지속 발행 파이프라인 상세. 쏙튜브 4단계의 메타사이트 매핑 구현 사양. 섹션별 독립 운영 메커니즘. | 7~10천자 |
| `ai-roles-and-prompts.md` | AI 3인 체제(작성자/검증자/편집자) 역할 + 프롬프트 템플릿 전체. 사이트별 페르소나 적용 메커니즘. 가짜 출처 방지 3중 방어선 프롬프트. | 8~12천자 |
| `ai-comment-system.md` | AI 댓글 시스템 상세. 페르소나 5종 템플릿. 시간 분산 알고리즘. 사람 댓글 우선 메커니즘. 표시 정책. | 5~7천자 |

### 20.3 Tier C — SEO/수익화 (Tier B 다음)

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `seo-automation.md` | SEO 자동화 전체. 메타 태그 / JSON-LD / llms.txt / sitemap.xml / RSS / robots.txt / IndexNow / canonical / hreflang. 각 항목 자동 생성 로직. | 6~9천자 |
| `internal-linking.md` | 내부 링크 그물 알고리즘. 키워드 매칭 + 임베딩 매칭 하이브리드. 자동 삽입 위치/밀도 규칙. Pillar page 갱신. | 5~7천자 |
| `monetization.md` | 광고 슬롯 표준 + 사이트별 ON/OFF + 카테고리별 어필리에이트 풀 + AdSense 통합. 슬롯별 위치 계산 로직. | 4~6천자 |

### 20.4 Tier D — 운영 인프라

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `monitoring-health.md` | 헬스 모니터링 + 알림 시스템. 모니터링 대상 전체 목록. 알림 트리거 임계값. Slack/Email/Discord 통합. | 4~6천자 |
| `duplicate-prevention.md` | 임베딩 유사도 검사 시스템. 임계값 정의. 재생성 vs 스킵 분기. 사이트 간 중복도 모니터링. | 3~5천자 |
| `search-and-email.md` | 사이트 내 시맨틱 검색 + 뉴스레터 시스템. Firestore 임베딩 저장 구조. 이메일 발송 인프라(Resend/SES). | 4~6천자 |
| `analytics-integration.md` | Google Search Console + GA4 통합. 자동 등록. 통합 대시보드 데이터 구조. 인사이트 자동 생성. | 4~6천자 |

### 20.5 Tier E — 배포/운영

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `vercel-cron-spec.md` | Vercel Cron 스케줄 동적 등록. 자식 사이트별 Cron 충돌 방지. Cloudflare Workers 폴백 옵션. | 3~5천자 |
| `environment-variables.md` | 환경 변수 전체 정리. 사이트별 변수 네이밍 컨벤션. 시크릿 회전 정책. | 3~5천자 |
| `deployment-guide.md` | 메타사이트 최초 배포 + 자식 사이트 자동 배포 + 마이그레이션(메타에서 자식 분리) 가이드. | 5~7천자 |
| `testing-checklist.md` | 신규 자식 사이트 생성 후 검증 체크리스트. Phase 1 진입 전 확인 항목. Phase 2 진입 전 확인 항목. | 3~5천자 |

### 20.6 Tier F — 이식 매핑 (한 번만 필요)

| 파일명 | 역할 | 분량 추정 |
|--------|------|-----------|
| `ssoktube-migration.md` | 쏙튜브의 기존 코드/데이터를 메타사이트 구조로 매핑하는 가이드. 어떤 파일이 어디로 가는지. 어떤 컬렉션이 어떻게 네임스페이스화되는지. 점진적 이식 전략. | 5~7천자 |

### 20.7 우선순위 작업 순서

```
1단계 (코어 골격):  architecture.md → database-schema.md → publisher-adapters.md
2단계 (메타 UI):    meta-control-spec.md → site-creation-flow.md
3단계 (콘텐츠):     authority-building.md → content-pipeline.md → ai-roles-and-prompts.md
4단계 (SEO):       seo-automation.md → internal-linking.md
5단계 (수익화/운영): monetization.md → monitoring-health.md → duplicate-prevention.md
6단계 (보조):       나머지 모든 Tier D, E, F
```

이 순서를 따르면 각 단계에서 작성된 MD가 다음 단계의 기반이 되어, 일관성 깨질 위험이 최소화된다.

---

## 21. 부록 — 용어 정의

| 용어 | 정의 |
|------|------|
| **메타사이트 (Meta-site)** | 운영자 1인 전용 컨트롤 타워. 자식 사이트들을 생성/관리/모니터링. |
| **자식 사이트 (Child Site)** | 메타사이트가 발행하는 실제 콘텐츠 사이트. 검색엔진/사용자 시점에서 독립적. |
| **호스팅 어댑터 (Publisher Adapter)** | 자식 사이트의 호스팅 방식(Next.js/Tistory/Blogger)을 추상화하는 인터페이스. |
| **Phase 1 / 권위 구축** | 사이트 생성 후 2~3주간 28~42편의 원론적 권위 글을 발행하는 단계. |
| **Phase 2 / 지속 발행** | Phase 1 완료 후 무기한으로 시의성 있는 글을 자동 발행하는 단계. |
| **AI 3인 체제** | 작성자(Writer) + 검증자(Verifier) + 편집자(Editor) 분업 시스템. |
| **권위 트리 (Authority Outline)** | Phase 1의 28~42편 글이 어떻게 서로 연결되는지 정의하는 의존성 그래프. |
| **Pillar Page** | Phase 1 종료 시 자동 생성되는 통합 가이드 페이지. SEO 권위의 정점. |
| **내부 링크 그물 (Internal Linking Web)** | 권위 글들이 위키피디아처럼 서로 깊이 연결된 링크 구조. |
| **AI 댓글 시스템** | 사이트 신뢰도/체류시간/롱테일 SEO를 위해 AI 페르소나들이 토론하는 댓글 시스템. AI임을 명시. |
| **출처 풀 (Source Pool)** | 자식 사이트별로 등록된 콘텐츠 원천(RSS/YouTube/검색 API 등). |
| **콘텐츠 큐 (Content Queue)** | 발행 예정 → 생성 중 → 검수 필요 → 발행됨의 4단계 상태 관리. |
| **헬스 모니터링** | 자식 사이트의 발행 성공률/출처 상태/AI API 비용 등을 추적하는 시스템. |
| **마이그레이션 출구 (Migration Exit)** | 자식 사이트가 메타에서 분리되어 독립 운영될 수 있도록 한 설계 원칙. |
| **쏙튜브 (SSOKTUBE)** | 메타사이트의 베이스가 된 검증된 AI 매거진 시스템. `magazine.md` 참조. |

---

## 22. 변경 이력

| 버전 | 날짜 | 변경 사항 | 작성 |
|------|------|----------|------|
| v1.0 | 2026-05-06 | 초안 작성. 새벽 5시 30분 대화 결과 통합. | Claude Opus 4.7 |

---

*이 문서는 메타사이트의 단일 진실 공급원이다. 모든 후속 MD와 코드는 이 문서를 따른다.*

*다음으로 작성할 문서: `architecture.md` (Tier A 1번)*
