# META-SITE: 데이터베이스 스키마 (database-schema.md)

> Firestore 컬렉션 / 필드 / 타입 / 인덱스 / 보안 규칙 / 라이프사이클의 전체 명세.
> core.md "15. 데이터 구조"와 architecture.md "7. 보안 경계"의 상세 구현.
> 이 문서가 정의하는 모든 필드명/타입은 코드와 1:1로 일치한다.

---

## 0. 이 문서의 역할

```
core.md (WHAT/WHY)
  ├─ architecture.md            (시스템 구조)
  ├─ database-schema.md         ★ 이 문서 — 데이터 모델
  └─ publisher-adapters.md      (다음)
```

이 문서는:
- **모든 Firestore 컬렉션의 단일 출처**다. 코드의 type 정의는 이 문서를 따라간다.
- 쏙튜브의 검증된 컬렉션(`saved_summaries`, `curated_posts` 등)을 자식 사이트 네임스페이스로 확장한 형태다.
- 모순 발생 시 core.md를 따른다.

---

## 1. 명명 규칙

### 1.1 컬렉션 이름

- 모두 **snake_case 복수형** (`child_sites`, `curated_posts`, `magazine_logs`).
- 예외: `settings/curation`처럼 단일 문서 컬렉션도 복수형 (`settings`)에 단일 문서.
- 자식 사이트별 데이터는 `sites/{siteId}/` 하위에 둔다 (네임스페이스 격리).

### 1.2 필드 이름

- **camelCase** (`createdAt`, `videoId`, `pipelineStatus`).
- 예외: 쏙튜브에서 이미 정착한 필드명은 그대로 유지(코드 호환성).
- Boolean 필드는 `is/has/should` prefix 권장 (`isPublic`, `hasComments`, `shouldAutoPublish`).

### 1.3 문서 ID 규칙

| 컬렉션 | ID 패턴 | 예시 |
|--------|---------|------|
| `child_sites` | slug 기반 | `travel-kr`, `ai-en-tistory` |
| `curated_posts` | `{timestamp}_{shortHash}` | `20260506_a3f9c1` |
| `saved_summaries` | `sess_{timestamp}_{rand}` | `sess_20260506_x7k2` (쏙튜브 동일) |
| `ai_scout_queue` | YouTube videoId | `dQw4w9WgXcQ` (쏙튜브 동일) |
| `authority_outline` | `outline_{siteId}_v{n}` | `outline_travel-kr_v1` |
| `magazine_logs` | auto ID | (Firestore 자동) |
| `personas` | `persona_{slug}` | `persona_skeptical_accountant` |
| `prompt_assets` | `{role}_v{n}` | `writer_v3`, `verifier_v1` |

### 1.4 타임스탬프 규칙

- 모든 시간은 **Firestore Timestamp**. ISO 문자열 저장 금지.
- 표준 필드: `createdAt`, `updatedAt`, `publishedAt`, `lastActivityAt`.
- TTL이 필요한 임시 데이터는 `expiresAt` 필드 + Firestore TTL 설정.

---

## 2. 컬렉션 트리 전체 개관

```
Firestore (단일 프로젝트, 옵션 A)
│
├── meta_sites/                          [메타 1개 문서]
├── child_sites/                         [자식 사이트 N개]
├── prompt_assets/                       [전역 프롬프트 자산]
├── alerts/                              [전역 알림 큐]
├── audit_logs/                          [전역 감사 로그]
│
└── sites/                               [네임스페이스 컨테이너]
    └── {siteId}/                        [자식 사이트별]
        ├── authority_outline/           [Phase 1 권위 트리]
        ├── ai_scout_queue/              [쏙튜브 동일 — Phase 2]
        ├── ai_evaluate_queue/           [쏙튜브 동일]
        ├── ai_pipeline_state/           [쏙튜브 동일]
        ├── saved_summaries/             [쏙튜브 동일]
        ├── curated_posts/               [쏙튜브 + 메타 확장]
        ├── magazine_logs/               [쏙튜브 동일]
        ├── sources/                     [출처 풀]
        ├── personas/                    [댓글봇 페르소나]
        ├── settings/                    [사이트 설정 — 단일 문서들]
        ├── search_index/                [시맨틱 검색 임베딩]
        ├── newsletter_subscribers/      [이메일 리스트]
        ├── analytics_snapshots/         [GSC/GA 일별 스냅샷]
        └── posts/{postId}/comments/     [글별 AI 댓글 서브컬렉션]
```

전체 14개 자식 컬렉션 + 5개 메타 컬렉션 = 19개 컬렉션.

---

## 3. 메타 레벨 컬렉션 (5개)

### 3.1 `meta_sites` — 메타사이트 자체 설정

**목적:** 메타사이트 운영자/전역 설정 보관. 단일 문서.

**문서 ID:** `default` (단일 문서)

```typescript
interface MetaSiteConfig {
  // 운영자
  adminEmails: string[]              // ADMIN_EMAILS와 동기화
  ownerName: string
  
  // 전역 설정
  defaultLanguage: 'ko' | 'en'
  defaultTimezone: string             // 'Asia/Seoul'
  
  // 글로벌 한도
  maxChildSites: number               // 100
  dailyAiBudgetUSD: number            // 50 (전체 합산 한도)
  perSiteDailyBudgetUSD: number       // 10
  
  // 글로벌 모델 선택
  defaultModels: {
    writer: string                    // 'claude-opus-4-7'
    verifier: string                  // 'gpt-5'
    editor: string                    // 'claude-opus-4-7'
    summarizer: string                // 'claude-sonnet-4-6'
    embedding: string                 // 'text-embedding-3-large'
  }
  
  // 알림 설정
  notifications: {
    slackWebhookUrl?: string
    discordWebhookUrl?: string
    emailFrom?: string
    emailTo?: string[]
    severityThreshold: 'low' | 'medium' | 'high'  // 알림 받을 최소 심각도
  }
  
  // 메타데이터
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**읽기/쓰기 모듈:** M01(Auth), M18(Admin UI). 다른 모든 모듈에서 읽기.

---

### 3.2 `child_sites` — 자식 사이트 등록부

**목적:** 모든 자식 사이트의 메타데이터. 사이트 생성/관리의 중심.

**문서 ID:** 사이트 slug (예: `travel-kr`, `ai-en-tistory`)

```typescript
interface ChildSite {
  // 식별
  siteId: string                      // 문서 ID와 동일
  name: string                        // 'Travel KR'
  displayName: string                 // 사용자에게 보이는 이름
  
  // 콘텐츠 정체성
  topic: string                       // 'travel', 'ai', 'insurance'
  language: 'ko' | 'en' | 'ja' | string
  persona: string                     // personas 컬렉션 ID 참조 (또는 인라인)
  tone: string                        // 'professional', 'friendly', 'academic'
  
  // 호스팅
  hostingType: 'nextjs' | 'tistory' | 'blogger'
  hostingConfig: NextjsHostingConfig | TistoryHostingConfig | BloggerHostingConfig
  
  // 단계
  currentPhase: 'authority' | 'ongoing' | 'paused'
  authorityOutlineId?: string         // Phase 1 진행 중일 때
  pillarPagePostId?: string           // Phase 1 종료 시 채워짐
  
  // 섹션 (Phase 2)
  sections: Section[]
  
  // SEO
  seoConfig: {
    siteDescription: string
    siteKeywords: string[]
    ogImageUrl: string
    canonicalDomain: string           // 'travel-kr.com'
    searchConsoleVerified: boolean
    indexNowKey?: string
  }
  
  // 수익화
  monetization: {
    adsenseId?: string
    affiliatePool: Record<string, AffiliateLink[]>  // category → links
    slotsEnabled: AdSlot[]            // ['header', 'top', 'mid', ...]
    enabled: boolean
  }
  
  // 분석
  analytics: {
    ga4MeasurementId?: string
    gscPropertyUrl?: string
    vercelAnalyticsEnabled: boolean
  }
  
  // 상태
  status: 'active' | 'paused' | 'archived'
  healthStatus: {
    overall: 'healthy' | 'warning' | 'critical'
    lastHealthCheck: Timestamp
    issues: string[]                  // 현재 활성 이슈 요약
  }
  
  // 통계 (캐시, 매시간 갱신)
  stats: {
    totalPosts: number
    publishedPosts: number
    draftPosts: number
    failedPosts: number
    lastPublishedAt?: Timestamp
    weeklyTrafficEstimate?: number
  }
  
  // 메타데이터
  createdAt: Timestamp
  updatedAt: Timestamp
  lastActivityAt: Timestamp
}

interface NextjsHostingConfig {
  type: 'nextjs'
  domain: string                      // 'travel-kr.com'
  vercelProjectId: string
  vercelDeploymentUrl: string
  firebaseProjectId?: string          // 자식 사이트가 별도 Firebase 가질 때
}

interface TistoryHostingConfig {
  type: 'tistory'
  blogName: string                    // 'mytravel'
  blogUrl: string                     // 'https://mytravel.tistory.com'
  accessTokenSecretKey: string        // Vercel env var 키 이름
  defaultCategoryId?: string
}

interface BloggerHostingConfig {
  type: 'blogger'
  blogId: string
  blogUrl: string
  serviceAccountSecretKey: string     // Vercel env var 키 이름
}

interface Section {
  sectionId: string
  name: string                        // 'AI 뉴스'
  slug: string                        // 'news'
  enabled: boolean
  publishFrequency: 'daily' | 'thrice_weekly' | 'weekly'
  toneOverride?: string
  sourceIds: string[]                 // 이 섹션이 사용하는 출처들
  promptOverride?: string             // 섹션별 작성자 프롬프트 커스텀
  schedule: {                         // Vercel Cron schedule
    cronExpression: string            // '0 21 * * *' (UTC)
    lastRun?: Timestamp
    nextRun?: Timestamp
  }
}

interface AffiliateLink {
  partnerId: string
  url: string
  label: string
  imageUrl?: string
  weight?: number                     // 가중 무작위 선택용
}

type AdSlot = 
  | 'header' | 'top' | 'mid' | 'bottom'
  | 'sidebar-1' | 'sidebar-2' | 'inline-cta'
```

**읽기/쓰기 모듈:** M02(Site Registry)가 주 소유. M03/M04/M06/M07/M15가 갱신.

**인덱스 요구:**
- `(status, currentPhase, lastActivityAt desc)` — 활성 사이트 조회
- `(hostingType, status)` — 어댑터별 통계

---

### 3.3 `prompt_assets` — 전역 프롬프트 자산

**목적:** 모든 자식 사이트가 공유하는 프롬프트 템플릿. 버전 관리 + 성능 추적.

**문서 ID:** `{role}_v{version}` (예: `writer_v3`)

```typescript
interface PromptAsset {
  promptId: string                    // 문서 ID와 동일
  role: 'writer' | 'verifier' | 'editor' | 'summarizer' 
      | 'evaluator' | 'comment_persona' | 'authority_outline_generator'
  version: number                     // 1, 2, 3, ...
  isLatest: boolean                   // 가장 최신 버전 표시
  
  template: string                    // 실제 프롬프트 (변수는 {{var}} 형식)
  variables: string[]                 // ['topic', 'tone', 'sourceContent']
  
  // 어떤 모델용?
  targetModel: string                 // 'claude-opus-4-7' or 'any'
  
  // 어디서 쓰는가
  usedBySiteIds: string[]             // 현재 이 프롬프트 쓰는 사이트들
  
  // 성능 추적
  metrics: {
    totalCalls: number
    successCount: number
    failureCount: number
    avgLatencyMs: number
    avgOutputTokens: number
    avgCostUSD: number
    qualityScores?: number[]          // 사람 평가 (선택)
  }
  
  // 메타
  description: string                 // 운영자 메모
  createdAt: Timestamp
  createdBy: string                   // 운영자 이메일
  changelog?: string                  // 이전 버전 대비 변경점
}
```

**읽기/쓰기 모듈:** M09(AI Service Layer) 읽기 빈도 매우 높음 — 메모리 캐싱 필수. M18에서 편집.

**인덱스 요구:**
- `(role, isLatest)` — 최신 버전 빠른 조회
- `(role, version desc)` — 버전 히스토리 조회

---

### 3.4 `alerts` — 전역 알림 큐

**목적:** 헬스 모니터링/실패/검수 요청 등 모든 알림. 운영자가 처리하면 archived.

**문서 ID:** auto

```typescript
interface Alert {
  alertId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'health' | 'publish_failure' | 'review_request' 
          | 'budget' | 'security' | 'source_dead' | 'fake_citation'
  
  siteId?: string                     // 자식 사이트 관련이면
  postId?: string                     // 특정 글 관련이면
  
  title: string                       // '발행 실패: travel-kr'
  message: string                     // 상세 내용
  context: Record<string, any>        // 디버깅 정보
  
  status: 'open' | 'acknowledged' | 'resolved' | 'archived'
  resolvedAt?: Timestamp
  resolvedBy?: string
  resolution?: string
  
  notificationsSent: {
    slack: boolean
    discord: boolean
    email: boolean
  }
  
  createdAt: Timestamp
  expiresAt?: Timestamp               // TTL: 90일 후 자동 삭제
}
```

**읽기/쓰기 모듈:** M15(Health Monitor)가 생성. M16(Notification Hub)이 발송 후 갱신. M18에서 표시.

**인덱스 요구:**
- `(status, severity, createdAt desc)` — 미처리 알림 우선순위
- `(siteId, createdAt desc)` — 사이트별 히스토리

---

### 3.5 `audit_logs` — 운영자 액션 감사 로그

**목적:** 운영자의 모든 중요 액션 기록 (보안 + 회고용).

**문서 ID:** auto

```typescript
interface AuditLog {
  logId: string
  actorEmail: string
  action: string                      // 'site_created', 'site_paused', 'prompt_updated', ...
  targetType: 'site' | 'post' | 'prompt' | 'persona' | 'config'
  targetId: string
  
  before?: Record<string, any>        // 변경 전 (선택)
  after?: Record<string, any>         // 변경 후 (선택)
  
  ipAddress?: string
  userAgent?: string
  
  createdAt: Timestamp
  expiresAt: Timestamp                // TTL: 1년
}
```

**인덱스 요구:**
- `(actorEmail, createdAt desc)`
- `(targetType, targetId, createdAt desc)`

---

## 4. 자식 사이트 레벨 컬렉션 (14개)

모두 `sites/{siteId}/` 하위에 위치. siteId는 `child_sites`의 문서 ID와 동일.

### 4.1 `authority_outline` — Phase 1 권위 트리

**목적:** Phase 1에서 자동 생성된 28~42편의 권위 글 목차. 의존성 그래프 포함.

**문서 ID:** `outline_{siteId}_v{n}`

```typescript
interface AuthorityOutline {
  outlineId: string
  topic: string                       // 'AI 활용법'
  totalArticles: number               // 28~42
  expectedDurationDays: number        // 14~21
  
  status: 'draft' | 'awaiting_approval' | 'approved' 
        | 'in_progress' | 'complete' | 'rejected'
  approvedAt?: Timestamp
  approvedBy?: string
  
  tiers: AuthorityTier[]
  
  pillarPage: {
    title: string
    slug: string                      // '/guide/ai-complete'
    targetCreationDate: Timestamp     // Phase 1 종료 예상 시점
    actualPostId?: string             // 실제 생성 후 채워짐
  }
  
  // 진행 상황
  progress: {
    articlesCreated: number
    articlesPublished: number
    articlesFailed: number
    currentTier: number
  }
  
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface AuthorityTier {
  tier: number                        // 1, 2, 3
  label: string                       // '기초', '심화', '응용'
  articles: AuthorityArticle[]
}

interface AuthorityArticle {
  articleId: string                   // 'auth-001'
  title: string
  slug: string
  targetKeyword: string               // 주 SEO 키워드
  aliases: string[]                   // 본문에서 매칭할 동의어
  
  dependsOn: string[]                 // ['auth-001'] — 이 글들이 먼저 발행돼야
  linksTo: string[]                   // 본문에서 링크할 다른 글들
  
  estimatedWordCount: number
  estimatedReadingMinutes: number
  
  status: 'pending' | 'writing' | 'verifying' | 'editing' 
        | 'published' | 'failed'
  scheduledPublishAt?: Timestamp
  actualPublishedAt?: Timestamp
  curatedPostId?: string              // 발행되면 curated_posts 참조
  
  failureReason?: string
  retryCount: number
}
```

**읽기/쓰기 모듈:** M07(Authority Builder)가 주 소유. M09가 글 생성 시 진행 상황 갱신.

**인덱스 요구:** 일반적으로 1개 활성 outline만 존재 → 인덱스 단순.

상세 알고리즘은 `authority-building.md` 참조.

---

### 4.2 `ai_scout_queue` — 후보 영상/콘텐츠 (쏙튜브 동일)

**목적:** Phase 2 Scout 단계에서 출처 풀에서 수집한 후보. Evaluate 진입 전.

**문서 ID:** YouTube videoId 또는 `{sourceType}_{externalId}` (RSS 등)

```typescript
interface ScoutQueueItem {
  // 식별
  videoId?: string                    // YouTube
  externalId: string                  // 통합 ID
  sourceType: 'youtube' | 'rss' | 'news_api' | 'search_api'
  sourceId: string                    // sources 컬렉션 참조
  
  // 콘텐츠 메타
  title: string
  channel?: string                    // YouTube 채널 또는 RSS 출처명
  thumbnail?: string
  url: string
  publishedAt: Timestamp              // 원본 발행일
  durationSec?: number                // 영상만
  viewCount?: number                  // 영상만
  
  // 분류
  subcategory: 'news' | 'tools' | 'usecases' | string  // 섹션과 연결
  sectionId: string                   // child_sites.sections 참조
  
  // 상태
  status: 'pending' | 'evaluating' | 'evaluated' | 'rejected' | 'used'
  
  // 메타
  scoutedAt: Timestamp
  expiresAt: Timestamp                // TTL: 14일
}
```

**읽기/쓰기 모듈:** M05(Source Pool Manager)가 생성. M06이 Evaluate 단계로 이동.

**인덱스 요구:**
- `(sectionId, status, scoutedAt desc)` — 섹션별 미처리 후보 조회

---

### 4.3 `ai_evaluate_queue` — AI 심사 완료 후보 (쏙튜브 동일)

**목적:** Scout에서 넘어온 후보를 AI 2~3인이 점수 매긴 결과.

**문서 ID:** auto

```typescript
interface EvaluateQueueItem {
  externalId: string                  // ScoutQueueItem 참조
  sectionId: string
  
  // 평가
  score: number                       // 합산 점수 0-100
  rank: number                        // 같은 배치 내 순위
  
  evaluations: {
    evaluatorModel: string            // 'gpt-5'
    score: number
    reasoning: string
    flags?: string[]                  // 'low_quality', 'paywall', 'duplicate'
  }[]
  
  // 자막/내용 (있으면)
  transcriptLength?: number
  transcriptPreview?: string          // 첫 500자
  
  status: 'pending_summary' | 'summarized' | 'skipped'
  
  // 원본 메타 복사 (조인 줄이려고)
  title: string
  channel?: string
  thumbnail?: string
  url: string
  
  evaluatedAt: Timestamp
  expiresAt: Timestamp                // TTL: 14일
}
```

**인덱스 요구:**
- `(sectionId, status, score desc)` — 섹션별 1위 빠른 조회

---

### 4.4 `ai_pipeline_state` — 파이프라인 상태 추적 (쏙튜브 동일)

**목적:** 파이프라인 4단계의 진행 상태 추적. 디버깅 + 중복 방지용.

**문서 ID:** `{sectionId}_{runId}` (runId는 timestamp 기반)

```typescript
interface PipelineState {
  runId: string
  sectionId: string
  triggerType: 'cron' | 'manual'
  
  pipelineStatus: 'scout' | 'evaluate' | 'summarize' 
                | 'generate' | 'published' | 'failed'
  
  stages: {
    scout: StageInfo
    evaluate: StageInfo
    summarize: StageInfo
    generate: StageInfo
    publish: StageInfo
  }
  
  // 결과 참조
  scoutQueueIds: string[]
  evaluateQueueIds: string[]
  savedSummaryId?: string
  curatedPostId?: string
  
  startedAt: Timestamp
  completedAt?: Timestamp
  expiresAt: Timestamp                // TTL: 30일
}

interface StageInfo {
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  startedAt?: Timestamp
  completedAt?: Timestamp
  error?: string
  retryCount: number
  metadata?: Record<string, any>
}
```

**인덱스 요구:**
- `(sectionId, startedAt desc)` — 섹션별 최근 파이프라인 조회

---

### 4.5 `saved_summaries` — 영상/콘텐츠 요약 (쏙튜브 동일 + 확장)

**목적:** Summarize 단계의 출력. 쏙튜브와 동일한 구조 유지.

**문서 ID:** `sess_{timestamp}_{rand}`

```typescript
interface SavedSummary {
  sessionId: string
  
  // 원본
  videoId?: string
  externalId: string
  title: string
  channel?: string
  thumbnail?: string
  url: string
  publishedAt: Timestamp
  
  // 요약
  contextSummary: string              // 핵심 내용 요약
  reportSummary: string               // 심층 분석 리포트
  category: string                    // 자동 분류
  topicCluster?: string               // 임베딩 기반 클러스터
  tags: string[]
  
  // YouTube 댓글 (있으면)
  ytCommentsContext?: {
    popularComments: Comment[]
    recentComments: Comment[]
    sentimentSummary: string
  }
  
  // 임베딩 (검색 + 중복 검사용)
  embedding?: number[]                // [1536] 또는 [3072]
  embeddingModel?: string
  
  // 노출 제어
  isPublic: boolean                   // (쏙튜브 호환 — Square K 노출 여부)
  postedToMagazine: boolean           // 매거진 발행 여부 (중복 방지)
  
  // 메타
  sectionId: string
  pipelineRunId?: string
  createdAt: Timestamp
}

interface Comment {
  text: string
  author: string
  likes?: number
  publishedAt?: Timestamp
}
```

**인덱스 요구:**
- `(postedToMagazine, createdAt desc)` — 미발행 요약 조회 (쏙튜브와 동일)
- `(sectionId, postedToMagazine, createdAt desc)`

---

### 4.6 `curated_posts` — 매거진 글 (쏙튜브 + 메타 확장) ★

**목적:** 최종 발행 단위. 메타사이트의 핵심 데이터.

**문서 ID:** `{YYYYMMDD}_{shortHash}`

```typescript
interface CuratedPost {
  postId: string
  
  // === 쏙튜브 호환 필드 ===
  title: string
  subtitle?: string
  slug: string                        // URL용
  body: string                        // 마크다운
  excerpt: string                     // 메타 description용
  
  heroThumbnail?: string
  heroImageUrl?: string
  
  tags: string[]
  topicCluster?: string
  category: string
  
  // FAQ (Google People Also Ask 최적화)
  faq: {
    question: string
    answer: string
  }[]
  
  // 심층 분석
  deepDive?: {
    coreConceptExplanation: string
    backgroundContext: string
    practicalSteps: string[]
  }
  
  // YouTube 댓글 분석 (Phase 2 영상 베이스 글일 때)
  comments?: {
    popularSummary: string
    recentSummary: string
    keyInsights: string[]
  }
  
  // 출처
  sourceType: 'youtube' | 'rss' | 'authority_built' | 'manual'
  savedSummaryId?: string             // Phase 2일 때 saved_summaries 참조
  authorityArticleId?: string         // Phase 1일 때 authority_outline 참조
  
  // === 메타사이트 확장 필드 ===
  
  // 단계 구분
  phase: 'authority' | 'ongoing'
  tier?: number                       // Phase 1만 (1, 2, 3)
  outlineId?: string                  // Phase 1만
  sectionId?: string                  // Phase 2만
  
  // AI 3인 체제 출력
  aiPipeline: {
    writerModel: string
    writerOutput: string              // 작성자 원본
    
    verifierModel: string
    verifierReport: VerifierReport
    
    editorModel: string
    editorChanges: string[]           // 편집자 변경 사항
    
    finalIntegratorModel?: string
  }
  
  // 출처 인용
  citations: Citation[]
  citationsVerified: boolean          // 검증자 통과 여부
  
  // 내부 링크
  internalLinks: {
    targetPostId: string
    targetTitle: string
    anchorText: string
    bodyPosition: number              // 본문 내 위치 (인덱스)
  }[]
  
  // SEO
  seo: {
    metaTitle: string                 // <title> 60자
    metaDescription: string           // 155자
    canonicalUrl: string
    ogImageUrl?: string
    twitterCard: 'summary' | 'summary_large_image'
    jsonLd: Record<string, any>       // 스키마 객체
    targetKeywords: string[]
    keywordDensity: Record<string, number>
  }
  
  // 광고 슬롯 마커
  adSlots: {
    slot: AdSlot
    insertedAt: number                // 본문 위치
  }[]
  
  // 어필리에이트
  affiliateLinks: {
    partnerId: string
    url: string
    anchorText: string
    bodyPosition: number
  }[]
  
  // 상태
  status: 'draft' | 'review_required' | 'scheduled' 
        | 'published' | 'failed' | 'archived'
  publishedAt?: Timestamp
  scheduledPublishAt?: Timestamp
  
  // 외부 호스팅 발행 결과 (어댑터)
  publishedTo: {
    nextjs?: { url: string; publishedAt: Timestamp }
    tistory?: { url: string; postId: string; publishedAt: Timestamp }
    blogger?: { url: string; postId: string; publishedAt: Timestamp }
  }
  
  // 임베딩 (중복 검사 + 검색)
  embedding?: number[]
  embeddingModel?: string
  
  // 통계
  stats: {
    viewCount: number
    likeCount: number
    commentCount: number              // 사람 댓글
    aiCommentCount: number
    avgTimeOnPageSec?: number
    bounceRate?: number
  }
  
  // 검증
  duplicateCheckResult: {
    maxSimilarity: number             // 0-1
    similarPostIds: string[]
    decision: 'pass' | 'regenerated' | 'skipped'
  }
  
  // 메타
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: 'pipeline' | 'manual'
}

interface VerifierReport {
  factualErrors: { claim: string; correction: string; severity: 'low' | 'high' }[]
  citationVerifications: {
    citation: string
    exists: boolean
    actualUrl?: string
    note?: string
  }[]
  fakeReferenceDetected: boolean
  overallVerdict: 'pass' | 'minor_fixes' | 'major_fixes' | 'reject'
  reasoning: string
}

interface Citation {
  text: string                        // 본문 인용 텍스트
  source: string                      // 출처 이름
  url?: string
  authorName?: string
  publishedYear?: number
  verified: boolean
  verifiedAt?: Timestamp
}
```

**읽기/쓰기 모듈:** M09/M11/M12/M13/M14가 생성. M18 어드민에서 검수/편집. 자식 사이트 공개 페이지에서 읽기.

**인덱스 요구:**
- `(status, publishedAt desc)` — 발행된 글 최신순 (자식 사이트 공개 페이지)
- `(phase, status, createdAt desc)` — Phase별 큐 조회
- `(sectionId, status, publishedAt desc)` — 섹션별 발행 글
- `(tier, phase, publishedAt desc)` — Pillar Page 생성 시 권위 글 조회
- `(category, publishedAt desc)`
- `(slug)` — 단일 필드, slug로 조회

---

### 4.7 `magazine_logs` — 발행 로그 (쏙튜브 동일)

**목적:** 모든 파이프라인 실행 로그. 디버깅 + 모니터링.

**문서 ID:** auto

```typescript
interface MagazineLog {
  logId: string
  status: 'success' | 'error' | 'skipped' | 'partial'
  triggerType: 'cron' | 'manual' | 'webhook'
  
  pipelineRunId?: string
  sectionId?: string
  
  postTitle?: string
  postId?: string
  videoTitle?: string
  
  stage: 'scout' | 'evaluate' | 'summarize' | 'generate' | 'publish' | 'overall'
  
  durationMs?: number
  tokenUsage?: {
    inputTokens: number
    outputTokens: number
    costUSD: number
    model: string
  }
  
  error?: {
    code: string
    message: string
    stack?: string
    retriable: boolean
  }
  
  metadata?: Record<string, any>
  
  createdAt: Timestamp
  expiresAt: Timestamp                // TTL: 60일
}
```

**인덱스 요구:**
- `(sectionId, createdAt desc)`
- `(status, stage, createdAt desc)`

---

### 4.8 `sources` — 출처 풀

**목적:** 자식 사이트별로 등록된 콘텐츠 원천. Scout 단계에서 사용.

**문서 ID:** `src_{type}_{slug}`

```typescript
interface Source {
  sourceId: string
  type: 'youtube_channel' | 'rss' | 'search_keyword' 
      | 'news_api' | 'manual'
  name: string                        // 'TechCrunch RSS'
  description?: string
  
  config: YouTubeChannelConfig | RssConfig | SearchKeywordConfig | ...
  
  // 사용처
  sectionIds: string[]                // 어느 섹션이 이 출처를 쓰는지
  authorityFlag: boolean              // 권위 출처 풀에 속하는지
  
  // 상태
  status: 'active' | 'paused' | 'failing' | 'dead'
  healthStatus: {
    lastCheckAt: Timestamp
    consecutiveFailures: number
    lastSuccessAt?: Timestamp
    avgLatencyMs?: number
  }
  
  // 사용 통계 (편중 방지)
  recentUseCount: {
    last7days: number
    last30days: number
  }
  weight: number                      // 0-1, 편중 방지로 동적 조정
  
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface YouTubeChannelConfig {
  channelId: string
  channelName: string
  minDurationSec?: number
  maxDurationSec?: number
}

interface RssConfig {
  feedUrl: string
  filterRegex?: string                // 제목 필터
  excludeRegex?: string
}

interface SearchKeywordConfig {
  keywords: string[]
  language: string
  region?: string
  maxResultsPerRun: number
}
```

**인덱스 요구:**
- `(status, sectionIds[], weight desc)` — 섹션별 활성 출처 조회

---

### 4.9 `settings` — 사이트별 설정 (쏙튜브 호환)

**목적:** 단일 문서들의 모음. 쏙튜브 `settings/curation` 패턴 유지.

#### 4.9.1 `settings/curation` (쏙튜브 동일 + 확장)

```typescript
interface CurationSettings {
  // 쏙튜브 호환
  enabled: boolean                    // 자동 크론 ON/OFF
  autoPublish: boolean                // 즉시 발행 여부
  schedule: '1x_daily' | '2x_daily' | '3x_daily' | 'custom'
  lookbackDays: number                // 5
  dailyLimit: number                  // 1
  categoryFilter: string[]
  autoCollectEnabled: boolean
  
  // 메타사이트 확장
  aiCommentsEnabled: boolean
  aiVerificationEnabled: boolean      // 검증자 단계 활성화
  duplicateThreshold: number          // 0.90
  fakeCitationStrategy: 'block' | 'convert_to_general' | 'flag_only'
  
  lastGeneratedAt?: Timestamp
  updatedAt: Timestamp
}
```

#### 4.9.2 `settings/seo`

```typescript
interface SeoSettings {
  llmsTextTemplate: string            // llms.txt 동적 템플릿
  defaultMetaImage: string
  jsonLdAuthor: { name: string; url?: string }
  indexNowKey: string
  searchConsoleVerificationCode: string
  ga4MeasurementId?: string
  hreflangSiblings: { lang: string; url: string }[]
  updatedAt: Timestamp
}
```

#### 4.9.3 `settings/monetization`

```typescript
interface MonetizationSettings {
  adsenseId?: string
  slotsEnabled: AdSlot[]
  affiliatePoolByCategory: Record<string, AffiliateLink[]>
  updatedAt: Timestamp
}
```

---

### 4.10 `personas` — 댓글봇 페르소나

**목적:** 자식 사이트별 AI 댓글 페르소나 5종 정의.

**문서 ID:** `persona_{slug}` (예: `persona_skeptical_accountant`)

```typescript
interface Persona {
  personaId: string
  name: string                        // '회의적인 회계사'
  slug: string
  
  characterDescription: string        // 상세 페르소나 묘사
  voiceGuide: string                  // 말투 가이드
  
  modelPreference: string             // 'gpt-5' (다른 모델로 톤 다양화)
  
  // 댓글 행동 패턴
  commentLengthRange: [number, number]  // [10, 100] 단어
  emojiUsage: 'none' | 'minimal' | 'moderate'
  formality: 'casual' | 'professional' | 'academic'
  
  forbiddenPhrases: string[]
  signatureExpressions: string[]      // 이 페르소나만의 특징적 표현
  
  // 사용 통계
  totalComments: number
  avgRating?: number                  // 사람의 좋아요 등
  
  isActive: boolean
  createdAt: Timestamp
}
```

상세는 `ai-comment-system.md` 참조.

---

### 4.11 `posts/{postId}/comments` — AI/사람 댓글 (서브컬렉션)

**목적:** 글별 댓글. AI/사람 모두 저장.

**문서 ID:** auto

```typescript
interface PostComment {
  commentId: string
  postId: string                      // 부모 참조
  
  authorType: 'ai' | 'human'
  authorName: string                  // AI면 페르소나 이름, 사람이면 입력 이름
  authorEmail?: string                // 사람만
  
  personaId?: string                  // AI일 때만
  modelUsed?: string                  // AI일 때만
  
  content: string
  
  // AI 댓글 시간 분산용
  scheduledAt?: Timestamp             // AI 댓글이 미래에 표시될 시간
  visibleAt: Timestamp                // 실제 공개 시간
  
  status: 'pending' | 'visible' | 'hidden' | 'deleted'
  
  // 답글
  parentCommentId?: string
  replyCount: number
  
  // 반응
  likes: number
  reportCount: number
  
  createdAt: Timestamp
}
```

**인덱스 요구:**
- `(status, visibleAt asc)` — 시간 분산 댓글 처리
- `(postId, status, visibleAt asc)` — 글 페이지 댓글 표시

---

### 4.12 `search_index` — 시맨틱 검색 임베딩

**목적:** 사이트 내 검색용 임베딩 인덱스.

**문서 ID:** `idx_{postId}` (1 글 = 1 인덱스)

```typescript
interface SearchIndexEntry {
  indexId: string
  postId: string
  
  title: string                       // 검색 결과 표시용
  excerpt: string
  url: string
  publishedAt: Timestamp
  
  embedding: number[]                 // 본문 전체 임베딩
  embeddingModel: string
  
  // 청크 단위 임베딩 (긴 글 검색 정확도)
  chunks?: {
    text: string
    embedding: number[]
    position: number
  }[]
  
  // 키워드 검색 백업용
  keywords: string[]
  
  updatedAt: Timestamp
}
```

> **주의:** Firestore는 vector search 네이티브 지원이 제한적. 글 50편 이상 시 Pinecone/Weaviate/Vertex AI Vector Search 등 별도 벡터 DB 검토. 자세한 건 `search-and-email.md`.

---

### 4.13 `newsletter_subscribers` — 이메일 리스트

**목적:** 자식 사이트별 뉴스레터 구독자.

**문서 ID:** 이메일 해시 (`sha256(email)`)

```typescript
interface NewsletterSubscriber {
  subscriberId: string                // 이메일 해시
  email: string                       // 평문 (자식 사이트 네임스페이스니까)
  emailHash: string                   // 외부 노출용
  
  subscribedAt: Timestamp
  confirmedAt?: Timestamp
  unsubscribedAt?: Timestamp
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced'
  
  // 발송 이력
  totalSent: number
  totalOpens: number
  totalClicks: number
  lastSentAt?: Timestamp
  
  // 동의/추적
  source: string                      // 가입 페이지 path
  ipAddress?: string                  // GDPR 준수 90일 후 삭제
  consentVersion: string
}
```

상세는 `search-and-email.md` 참조.

---

### 4.14 `analytics_snapshots` — 분석 일별 스냅샷

**목적:** Search Console / GA4 데이터를 일별로 캐싱. API 호출 비용 절감.

**문서 ID:** `{YYYY-MM-DD}`

```typescript
interface AnalyticsSnapshot {
  date: string                        // '2026-05-06'
  
  searchConsole: {
    totalClicks: number
    totalImpressions: number
    avgCtr: number
    avgPosition: number
    topQueries: { query: string; clicks: number; impressions: number }[]
    topPages: { page: string; clicks: number; impressions: number }[]
  }
  
  ga4: {
    sessions: number
    users: number
    pageviews: number
    avgSessionDurationSec: number
    bounceRate: number
    topPages: { page: string; pageviews: number }[]
    sources: { source: string; sessions: number }[]
  }
  
  fetchedAt: Timestamp
}
```

**인덱스 요구:**
- `(date desc)` — 단일 필드, 최근 날짜 조회

---

## 5. 인덱스 설계 (Firestore Composite Indexes)

Firestore는 단일 필드 인덱스는 자동 생성하지만, 복합 인덱스는 명시적으로 생성해야 한다.

### 5.1 필수 복합 인덱스 목록

```yaml
# child_sites
- fields: [status, currentPhase, lastActivityAt desc]
- fields: [hostingType, status]

# prompt_assets
- fields: [role, isLatest]
- fields: [role, version desc]

# alerts
- fields: [status, severity, createdAt desc]
- fields: [siteId, createdAt desc]

# audit_logs
- fields: [actorEmail, createdAt desc]
- fields: [targetType, targetId, createdAt desc]

# sites/{siteId}/ai_scout_queue
- fields: [sectionId, status, scoutedAt desc]

# sites/{siteId}/ai_evaluate_queue
- fields: [sectionId, status, score desc]

# sites/{siteId}/ai_pipeline_state
- fields: [sectionId, startedAt desc]

# sites/{siteId}/saved_summaries
- fields: [postedToMagazine, createdAt desc]
- fields: [sectionId, postedToMagazine, createdAt desc]

# sites/{siteId}/curated_posts ★ 가장 중요
- fields: [status, publishedAt desc]
- fields: [phase, status, createdAt desc]
- fields: [sectionId, status, publishedAt desc]
- fields: [tier, phase, publishedAt desc]
- fields: [category, publishedAt desc]

# sites/{siteId}/magazine_logs
- fields: [sectionId, createdAt desc]
- fields: [status, stage, createdAt desc]

# sites/{siteId}/sources
- fields: [status, weight desc]

# sites/{siteId}/posts/{postId}/comments
- fields: [status, visibleAt asc]

# sites/{siteId}/newsletter_subscribers
- fields: [status, subscribedAt desc]
```

### 5.2 firestore.indexes.json 예시

```json
{
  "indexes": [
    {
      "collectionGroup": "curated_posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "curated_posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sectionId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
    // ... (위 목록을 모두 변환)
  ],
  "fieldOverrides": []
}
```

`firebase deploy --only firestore:indexes`로 배포.

---

## 6. 보안 규칙 (Firestore Security Rules)

### 6.1 핵심 정책

```
1. 메타 컬렉션은 ADMIN만 읽기/쓰기
2. 자식 사이트별 발행된 글은 누구나 읽기 가능
3. 자식 사이트별 비공개 데이터(scout/evaluate queue 등)는 ADMIN만
4. 댓글 작성은 reCAPTCHA 검증 후 (서버 함수 통해서만)
5. 뉴스레터 가입은 서버 함수를 통해서만 (이메일 검증 포함)
```

### 6.2 firestore.rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== Helper functions =====
    function isAdmin() {
      return request.auth != null 
        && exists(/databases/$(database)/documents/meta_sites/default)
        && request.auth.token.email in 
           get(/databases/$(database)/documents/meta_sites/default).data.adminEmails;
    }
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    // ===== Meta-level collections =====
    match /meta_sites/{configId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    match /child_sites/{siteId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    match /prompt_assets/{promptId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    match /alerts/{alertId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false;          // 서버에서만 (Admin SDK)
    }
    
    // ===== Child site data =====
    match /sites/{siteId} {
      
      // 발행된 글: 공개
      match /curated_posts/{postId} {
        allow read: if resource.data.status == 'published' || isAdmin();
        allow write: if isAdmin();
      }
      
      // 발행된 글의 댓글: 공개
      match /curated_posts/{postId}/comments/{commentId} {
        allow read: if resource.data.status == 'visible' || isAdmin();
        allow create: if false;        // 서버 함수 통해서만 (reCAPTCHA + AI 호출)
        allow update, delete: if isAdmin();
      }
      
      // 검색 인덱스: 공개 (검색 결과에서 쓰임)
      match /search_index/{indexId} {
        allow read: if true;
        allow write: if isAdmin();
      }
      
      // 권위 트리: 비공개
      match /authority_outline/{outlineId} {
        allow read, write: if isAdmin();
      }
      
      // 큐들: 비공개
      match /ai_scout_queue/{itemId} {
        allow read, write: if isAdmin();
      }
      match /ai_evaluate_queue/{itemId} {
        allow read, write: if isAdmin();
      }
      match /ai_pipeline_state/{stateId} {
        allow read, write: if isAdmin();
      }
      match /saved_summaries/{sessionId} {
        allow read, write: if isAdmin();
      }
      match /magazine_logs/{logId} {
        allow read, write: if isAdmin();
      }
      
      // 출처: 비공개
      match /sources/{sourceId} {
        allow read, write: if isAdmin();
      }
      
      // 페르소나: 비공개
      match /personas/{personaId} {
        allow read, write: if isAdmin();
      }
      
      // 설정: 비공개
      match /settings/{settingId} {
        allow read, write: if isAdmin();
      }
      
      // 뉴스레터: 가입은 서버 함수, 조회는 어드민
      match /newsletter_subscribers/{subId} {
        allow read: if isAdmin();
        allow write: if false;         // 서버 함수 통해서만
      }
      
      // 분석 스냅샷: 어드민만
      match /analytics_snapshots/{date} {
        allow read, write: if isAdmin();
      }
    }
    
    // 기본: 거부
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 6.3 서버 함수 권한 (Admin SDK)

서버 함수(Vercel Functions)는 Firebase Admin SDK 사용. Security Rules 우회 가능. 따라서 서버 함수에서:
- 입력 검증 철저히 (특히 email, comment content)
- reCAPTCHA 검증
- Rate limiting
- 감사 로그 작성

---

## 7. 데이터 마이그레이션 전략 (쏙튜브 → 메타)

### 7.1 마이그레이션 시나리오

쏙튜브의 기존 Firebase 프로젝트가 메타사이트의 첫 자식 사이트가 되는 경로.

**Before (쏙튜브):**
```
firestore/
├── ai_scout_queue/
├── ai_evaluate_queue/
├── ai_pipeline_state/
├── saved_summaries/
├── curated_posts/
├── magazine_logs/
└── settings/curation
```

**After (메타사이트 통합):**
```
firestore/
├── meta_sites/default                    [신규]
├── child_sites/ssoktube                  [신규 — 쏙튜브를 자식으로 등록]
├── prompt_assets/...                     [신규]
├── alerts/                               [신규]
├── audit_logs/                           [신규]
└── sites/
    └── ssoktube/                         [기존 데이터 이전]
        ├── ai_scout_queue/               ← 쏙튜브 루트에서 이동
        ├── ai_evaluate_queue/            ← 동일
        ├── ai_pipeline_state/            ← 동일
        ├── saved_summaries/              ← 동일
        ├── curated_posts/                ← 동일 + 새 필드는 default 채우기
        ├── magazine_logs/                ← 동일
        ├── sources/                      [신규 — 쏙튜브의 자동수집 설정에서 추출]
        ├── personas/                     [신규]
        ├── settings/curation             ← 쏙튜브에서 이동 + 확장 필드 default
        ├── settings/seo                  [신규]
        ├── settings/monetization         [신규]
        ├── search_index/                 [신규 — 기존 글들 임베딩 일괄 생성]
        ├── newsletter_subscribers/       [신규 또는 기존]
        ├── analytics_snapshots/          [신규]
        └── authority_outline/            [신규 또는 비어 있음]
```

### 7.2 마이그레이션 스크립트 흐름

```typescript
// scripts/migrate-ssoktube-to-meta.ts

// 1. 메타 컬렉션 초기화
await initMetaCollections()

// 2. 쏙튜브를 자식 사이트로 등록
await createChildSite({
  siteId: 'ssoktube',
  name: 'SSOKTUBE',
  topic: 'ai',
  language: 'ko',
  hostingType: 'nextjs',
  hostingConfig: { ... 기존 도메인/Vercel 설정 ... },
  currentPhase: 'ongoing',              // 이미 운영 중이니 Phase 2
  sections: [
    { sectionId: 'news', name: 'AI 뉴스', ... },
    { sectionId: 'tools', name: 'AI 도구', ... },
    { sectionId: 'usecases', name: 'AI 활용', ... },
  ],
})

// 3. 기존 컬렉션을 sites/ssoktube/ 하위로 복사
const collectionsToMigrate = [
  'ai_scout_queue', 'ai_evaluate_queue', 'ai_pipeline_state',
  'saved_summaries', 'curated_posts', 'magazine_logs',
]
for (const col of collectionsToMigrate) {
  await migrateCollection(col, `sites/ssoktube/${col}`)
}

// 4. settings/curation 이전 + 확장 필드 default 채우기
await migrateCurationSettings()

// 5. curated_posts에 phase 필드 추가 (default: 'ongoing')
await batchUpdate(`sites/ssoktube/curated_posts`, {
  phase: 'ongoing',
  // 다른 새 필드들도 기본값
})

// 6. 검증
await verifyMigration()

// 7. 기존 루트 컬렉션 백업 후 삭제 (옵션)
```

### 7.3 무중단 마이그레이션 전략

쏙튜브가 운영 중이라 다운타임 없이 옮겨야 한다.

```
1. [Phase A] 메타 컬렉션 + sites/ssoktube/ 셋업 (기존 쏙튜브는 그대로)
2. [Phase B] 기존 컬렉션 → sites/ssoktube/ 복사 (양쪽 동시 존재)
3. [Phase C] 쏙튜브 코드 배포: 모든 쓰기를 양쪽에 (dual-write)
4. [Phase D] 쏙튜브 코드 배포: 모든 읽기를 새 경로로
5. [Phase E] dual-write 제거, 새 경로만 쓰기/읽기
6. [Phase F] 기존 루트 컬렉션 백업 후 삭제
```

상세는 `ssoktube-migration.md` (Tier F) 참조.

---

## 8. 백업과 복구

### 8.1 백업 전략

| 대상 | 빈도 | 위치 | 보관 기간 |
|------|------|------|----------|
| 전체 Firestore | 매일 자정 (KST) | GCS 버킷 (`gs://meta-site-backups/`) | 90일 |
| `curated_posts` (글) | 매일 자정 + 발행 시마다 증분 | GCS + GitHub repo (마크다운) | 영구 |
| `prompt_assets` | 변경 시마다 | Git repo + Firestore | 영구 |
| `child_sites` 설정 | 변경 시마다 | Firestore + GCS | 영구 |

### 8.2 백업 명령

```bash
# Firestore 전체 백업
gcloud firestore export gs://meta-site-backups/$(date +%Y%m%d)

# 특정 컬렉션만
gcloud firestore export gs://meta-site-backups/$(date +%Y%m%d) \
  --collection-ids=child_sites,prompt_assets,meta_sites
```

### 8.3 복구 명령

```bash
# 특정 일자로 복구
gcloud firestore import gs://meta-site-backups/20260506
```

### 8.4 글 마크다운 별도 백업

`curated_posts`의 글은 마크다운 형태로 GitHub 저장소에도 백업.

```
github.com/{owner}/meta-site-content-backup/
├── ssoktube/
│   ├── 2026-05/
│   │   ├── 20260506_a3f9c1.md
│   │   ├── 20260506_b8d4e2.md
│   │   └── ...
│   └── 2026-06/
└── travel-kr/
    └── ...
```

매 발행 시 GitHub Actions 트리거 → 자동 커밋. 메타가 사라져도 글은 GitHub에 남는다.

---

## 9. 데이터 라이프사이클 (TTL & 아카이빙)

### 9.1 TTL 적용 컬렉션

| 컬렉션 | TTL 필드 | 보관 기간 |
|--------|---------|-----------|
| `alerts` (resolved) | `expiresAt` | 90일 |
| `audit_logs` | `expiresAt` | 1년 |
| `ai_scout_queue` | `expiresAt` | 14일 |
| `ai_evaluate_queue` | `expiresAt` | 14일 |
| `ai_pipeline_state` | `expiresAt` | 30일 |
| `magazine_logs` | `expiresAt` | 60일 |

Firestore Console 또는 `firestore.indexes.json`의 TTL policy로 설정.

### 9.2 영구 보관 컬렉션

- `meta_sites`, `child_sites`, `prompt_assets`
- `curated_posts` (글 자체)
- `saved_summaries` (요약은 회고 + 재발행용으로 보관)
- `personas`, `sources`, `settings/*`
- `search_index`
- `newsletter_subscribers`
- `analytics_snapshots`

### 9.3 아카이빙 (큰 자식 사이트)

자식 사이트가 1만 편 이상 누적되면 오래된 글의 메타데이터/통계는 별도 컬렉션으로 분리해서 비용 절감.

```
sites/{siteId}/curated_posts/         (활성 글, 최근 1년)
sites/{siteId}/curated_posts_archive/ (아카이브, 1년 이상 + 트래픽 낮은 글)
```

활성/아카이브 분리는 자동 (월 1회 배치). 그러나 사이트 공개 페이지는 양쪽 모두에서 읽기.

---

## 10. 비용 추정과 최적화

### 10.1 Firestore 비용 구조 (2026 기준)

- 문서 읽기: $0.06 / 100k
- 문서 쓰기: $0.18 / 100k
- 문서 삭제: $0.02 / 100k
- 저장: $0.18 / GB / 월
- 네트워크: $0.12 / GB

### 10.2 자식 사이트 6개 예상 월간 비용

```
일일 발행 18편 × 30일 = 540편/월

읽기:
  - 자식 사이트 페이지뷰 평균 5k/일 × 30 = 150k
  - 발행 시 권위 매칭 검색 540 × 50 = 27k
  - 어드민 조회 ~ 5k
  → 총 ~200k 읽기 → $0.12

쓰기:
  - curated_posts 작성 540
  - magazine_logs 540 × 5 = 2.7k
  - search_index 540
  - 댓글 540 × 8 = 4.3k
  → 총 ~10k 쓰기 → $0.02

저장:
  - 글당 평균 50KB × 540 × 12개월 = 320MB/년
  - 임베딩 540 × 10KB = 5.4MB/월
  → 1GB 미만 → $0.20

총 월간: ~$1 (사이트 6개 기준)
```

자식 사이트 100개로 확장 시 월 $20~50 예상. 매우 저렴.

### 10.3 비용 최적화

- 같이 자주 읽히는 데이터는 단일 문서에 (조인 줄임)
- 카운터는 distributed counter 또는 매시간 배치 (실시간 인크리먼트 비용 큼)
- 통계는 매시간 배치로 `child_sites.stats`에 반영
- 임베딩은 한 번 생성 후 변경 없음 → 재계산 금지
- 글로벌 검색은 자체 임베딩 비용 vs Pinecone/Algolia 비용 비교

---

## 11. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 메타 5개 + 자식 14개 = 총 19개 컬렉션
- ✅ 모든 필드의 TypeScript interface
- ✅ 쏙튜브 컬렉션과의 호환성 + 메타 확장 필드
- ✅ 복합 인덱스 목록 (firestore.indexes.json 변환 가능)
- ✅ Firestore 보안 규칙 전체 (firestore.rules 그대로 사용 가능)
- ✅ 무중단 마이그레이션 6단계
- ✅ 백업 (Firestore export + GitHub 마크다운)
- ✅ TTL과 아카이빙 정책
- ✅ 비용 추정 (월 ~$1, 100개 사이트 시 $50)

이 문서가 정의하지 않은 것:
- ❌ Publisher 어댑터 인터페이스 시그니처 → `publisher-adapters.md`
- ❌ 메타 어드민 UI에서 이 데이터를 어떻게 시각화하는지 → `meta-control-spec.md`
- ❌ 권위 트리 자동 생성 알고리즘 (필드만 정의, 로직은 별도) → `authority-building.md`
- ❌ 임베딩 검색의 구체 구현 (Pinecone vs Firestore vs ...) → `search-and-email.md`
- ❌ Cron이 어떻게 sectionId를 보고 어느 출처에서 수집하는지 → `content-pipeline.md`

---

## 12. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md v1.0 + architecture.md v1.0 기준. |

---

*이 문서는 메타사이트의 데이터 모델을 정의한다. 모든 코드의 타입과 쿼리는 이 스키마를 따른다.*

*다음 문서: `publisher-adapters.md` (Tier A 3번)*
