# META-SITE: 새 사이트 생성 흐름 (site-creation-flow.md)

> `/sites/new` 페이지의 6단계 마법사 폼 + 호스팅별 자동 셋업 + 후속 작업 명세.
> meta-control-spec.md "[3] /sites/new" 라우트의 상세 구현. database-schema.md `child_sites` 인터페이스가 어떻게 채워지는지의 단일 출처.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ architecture.md            (시스템 구조)
  ├─ database-schema.md         (데이터 모델)
  ├─ publisher-adapters.md      (어댑터)
  ├─ meta-control-spec.md       (어드민 UI)
  └─ site-creation-flow.md      ★ 이 문서 — 사이트 생성 폼
```

이 문서는 **클로드 코드가 6단계 폼 컴포넌트와 백엔드 셋업 함수를 그대로 만들 수 있는 수준**의 명세를 제공한다.

---

## 1. 핵심 원칙

### 1.1 자동화 우선

> **"운영자는 8개 답만 입력한다. 나머지는 시스템이 한다."**

운영자가 직접 입력하는 것:
- 사이트 이름 (slug)
- 토픽 (예: 'travel', 'ai')
- 언어
- 호스팅 옵션
- 도메인 또는 외부 호스팅 인증
- 시작 단계 (Phase 1 / Phase 2 직진)

시스템이 자동 처리하는 것:
- 페르소나 5종 자동 제안
- 출처 풀 12개 자동 제안 (RSS/YouTube)
- 섹션 3개 자동 제안 (Phase 2)
- 권위 트리 자동 생성 (Phase 1, 28~42편 목차)
- Vercel 프로젝트 / 도메인 / 환경변수 / Cron 자동 등록
- 초기 SEO 인프라 (llms.txt, sitemap, robots.txt) 자동 생성
- About / Privacy / Contact 페이지 자동 생성

### 1.2 트랜잭션 안전성

> **"중간에 실패하면 모두 되돌린다."**

6단계 중 어느 단계라도 실패하면 **이전 단계의 부산물을 자동 청소(롤백)**한다. 어중간하게 생성된 사이트는 절대 남기지 않는다. 사용자는 "처음부터" 다시 시도해도 똑같은 slug 사용 가능.

### 1.3 미리보기 우선

각 단계마다 다음 단계로 가기 전에 **현재까지의 결정 요약**을 보여준다. "이 사이트는 이렇게 생성됩니다" 화면.

---

## 2. 6단계 흐름 개관

```
[1] 정체성        → 이름, 토픽, 언어
[2] 호스팅 선택   → Next.js / Tistory / Blogger
[3] 호스팅 셋업   → 도메인 연결 또는 외부 인증
[4] 콘텐츠 정체성 → 페르소나, 톤, 섹션 (자동 제안 + 편집)
[5] 출처 + Phase  → 출처 풀 (자동 제안) + Phase 1 또는 2 선택
[6] 검토 + 생성   → 모든 결정 요약 + 생성 트리거
```

각 단계는 **앞으로/뒤로** 이동 가능. 단계별 데이터는 React Context 또는 Zustand로 보존(브라우저 새로고침 시 localStorage 백업).

---

## 3. 단계 1: 정체성 (Identity)

### 3.1 폼 필드

| 필드 | 타입 | 필수 | 검증 | 도움말 |
|------|------|-----|------|-------|
| `name` | string | ✅ | 1-64자 | 화면 표시용 (`Travel KR`) |
| `siteId` | string | ✅ | 자동생성 + 편집 가능 | `name`을 slugify → `travel-kr`. 기존 사이트와 중복 검사. |
| `topic` | enum | ✅ | preset + 직접입력 | 'ai', 'travel', 'finance', 'health', ..., '기타' |
| `language` | enum | ✅ | ISO code | 'ko', 'en', 'ja', 'zh' 등 |
| `description` | textarea | ❌ | 최대 200자 | 사이트 한 줄 소개. SEO 메타에 사용. |

### 3.2 검증 규칙

```typescript
// 클라이언트 검증
const schema = z.object({
  name: z.string().min(1).max(64),
  siteId: z.string()
    .regex(/^[a-z0-9-]+$/, 'lowercase / digits / hyphens only')
    .min(2).max(32),
  topic: z.string().min(1),
  language: z.enum(['ko', 'en', 'ja', 'zh', /* ... */]),
  description: z.string().max(200).optional(),
})

// 서버 검증 (추가)
async function validateSiteId(id: string) {
  const exists = await db.collection('child_sites').doc(id).get()
  if (exists.exists) throw new Error(`siteId already exists: ${id}`)
  
  // 예약어 차단
  const reserved = ['admin', 'api', 'meta', 'www', 'app', 'static']
  if (reserved.includes(id)) throw new Error(`reserved siteId: ${id}`)
}
```

### 3.3 UI 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│ 새 사이트 생성              ●━○━○━○━○━○             │
│                             1  2  3  4  5  6        │
├─────────────────────────────────────────────────────┤
│ 1단계: 사이트 정체성                                │
│                                                     │
│ 이름 *                                              │
│ [Travel KR_______________________]                  │
│                                                     │
│ 사이트 ID (slug) *                                  │
│ [travel-kr______________________]  ✅ 사용 가능     │
│ → URL과 내부 식별자에 사용됨                         │
│                                                     │
│ 토픽 *                                              │
│ ○ AI    ● 여행   ○ 금융  ○ 건강                    │
│ ○ 기타: [_________________]                         │
│                                                     │
│ 언어 *                                              │
│ ● 한국어  ○ English  ○ 日本語  ○ 中文              │
│                                                     │
│ 설명 (선택)                                         │
│ [한국어 여행 정보를 다루는 매거진_____________]      │
│ 0/200                                               │
│                                                     │
│                              [다음 →]               │
└─────────────────────────────────────────────────────┘
```

### 3.4 자동 동작

- `name` 입력 → `siteId` 자동 채움 (`slugify(name)`). 사용자가 수동 변경하면 자동 채움 중단.
- `siteId` 변경 시마다 debounce 500ms 후 중복 검사 → 결과 인라인 표시.

---

## 4. 단계 2: 호스팅 선택

### 4.1 폼 필드

| 필드 | 타입 | 필수 |
|------|------|-----|
| `hostingType` | enum | ✅ |

```typescript
type HostingType = 'nextjs' | 'tistory' | 'blogger'
```

### 4.2 UI 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│ 2단계: 호스팅 선택                                  │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ●  Next.js (자체 도메인) — 추천                 │ │
│ │    Vercel에 배포 + 자체 도메인 + 모든 기능 사용 │ │
│ │    ✅ 검색  ✅ 뉴스레터  ✅ AI 댓글  ✅ /llms.txt│ │
│ │    ⚠️ Vercel Pro 플랜 필요 ($20/월)             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○  Tistory                                      │ │
│ │    한국 사용자 친화. 빠른 발행.                  │ │
│ │    ❌ 검색  ❌ 뉴스레터  ❌ AI 댓글  ❌ llms.txt │ │
│ │    ⚠️ 한국어 권장. SEO 메타 커스텀 제한.         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ○  Blogger                                      │ │
│ │    영어권 친화. 광고 정책 자유.                  │ │
│ │    ✅ 광고  ✅ JSON-LD  ❌ 뉴스레터  ❌ 검색     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│              [← 뒤로]              [다음 →]         │
└─────────────────────────────────────────────────────┘
```

각 옵션의 ✅/❌는 `publisher-adapters.md` 7장 능력 매트릭스에서 가져옴.

### 4.3 추천 로직

선택을 강요하지 않지만 언어/토픽 기반 추천 표시.

```typescript
function recommendHosting(language: string, topic: string): HostingType {
  // 한국어 + 일반 토픽 → Tistory도 OK
  if (language === 'ko' && ['food', 'travel', 'lifestyle'].includes(topic)) {
    return 'nextjs' // 그래도 추천은 nextjs
  }
  
  // 영어 + 광고 친화 토픽 → Blogger 도 OK
  if (language === 'en' && ['ai', 'tech', 'finance'].includes(topic)) {
    return 'nextjs'
  }
  
  return 'nextjs' // 기본 추천: 항상 nextjs
}
```

UI에 "추천" 배지 표시.

---

## 5. 단계 3: 호스팅 셋업

호스팅 타입별로 폼이 완전히 달라진다.

### 5.1 Next.js (자체 도메인)

#### 5.1.1 필드

| 필드 | 타입 | 필수 | 검증 |
|------|------|-----|------|
| `domain` | string | ✅ | 유효한 도메인 형식 |
| `vercelTeamId` | string | ❌ | Vercel API 검증 |
| `domainOwnership` | enum | ✅ | 'have_domain' / 'buy_now' / 'use_subdomain' |

#### 5.1.2 흐름

```
운영자가 도메인 입력
   ↓
시스템이 검증:
   ├─ 도메인이 이미 다른 자식 사이트에 사용 중인지
   ├─ DNS A 레코드가 Vercel 가리키는지
   └─ Vercel API로 도메인 추가 가능한지
   ↓
[옵션 1] DNS 설정 안 됨
   → 안내 화면 표시:
     "다음 DNS 레코드를 추가해주세요:
      A     @     76.76.21.21
      CNAME www   cname.vercel-dns.com
      
     설정 완료 후 [재검증] 버튼 클릭."
   → 사용자가 DNS 설정 후 재검증
   ↓
[옵션 2] 검증 통과
   → 다음 단계로
```

#### 5.1.3 UI

```
┌─────────────────────────────────────────────────────┐
│ 3단계: Next.js 호스팅 설정                          │
│                                                     │
│ 도메인 *                                            │
│ [travel-kr.com_____________________]                │
│                                                     │
│ 도메인 상태:                                        │
│ ⏳ DNS 검증 중...                                  │
│                                                     │
│ ──또는──                                            │
│                                                     │
│ 서브도메인 사용 (도메인 없음)                       │
│ travel-kr.[meta-site.app]                          │
│                                                     │
│ Vercel Team (선택)                                  │
│ [기본 팀 사용 ▾]                                    │
│                                                     │
│              [← 뒤로]              [다음 →]         │
│                                                     │
│  💡 Vercel API key는 메타사이트 환경변수에 저장됨   │
└─────────────────────────────────────────────────────┘
```

### 5.2 Tistory

#### 5.2.1 필드

| 필드 | 타입 | 필수 |
|------|------|-----|
| `blogName` | string | ✅ |
| `accessToken` | string | ✅ (안전 입력) |
| `defaultCategoryId` | dropdown | ❌ |

#### 5.2.2 흐름

```
운영자가 블로그명 + access token 입력
   ↓
시스템이 검증:
   ├─ 토큰으로 /apis/blog/info 호출 (쏙튜브 lib/tistory.ts validateAccessToken)
   ├─ 응답 OK이면 블로그 정보 + 카테고리 리스트 fetch
   └─ 토큰을 Vercel 환경변수에 저장 (TISTORY_TOKEN_{SITE_ID})
   ↓
카테고리 드롭다운에 fetch된 리스트 표시
   ↓
운영자가 기본 카테고리 선택 (선택사항)
```

#### 5.2.3 UI

```
┌─────────────────────────────────────────────────────┐
│ 3단계: Tistory 연결                                 │
│                                                     │
│ Tistory 블로그명 *                                  │
│ [mytravel____________________].tistory.com          │
│                                                     │
│ Access Token *                                      │
│ [••••••••••••••••••••••••••••] [👁 보기]            │
│ → https://www.tistory.com/oauth/authorize 에서 발급 │
│                                                     │
│ [🔍 토큰 검증]                                       │
│                                                     │
│ ✅ 검증 완료 — 블로그: '내 여행 일기'                │
│                                                     │
│ 기본 카테고리 (선택)                                │
│ [여행 후기 ▾]                                       │
│   - 여행 후기 (id: 123456)                          │
│   - 여행 팁 (id: 123457)                            │
│                                                     │
│              [← 뒤로]              [다음 →]         │
└─────────────────────────────────────────────────────┘
```

### 5.3 Blogger

#### 5.3.1 필드

| 필드 | 타입 | 필수 |
|------|------|-----|
| `blogId` | string | ✅ |
| `serviceAccountJson` | file | ✅ (파일 업로드) |

#### 5.3.2 흐름

```
운영자가 Blog ID 입력 + Service Account JSON 업로드
   ↓
시스템이 검증:
   ├─ JSON 파일 형식 검증 (project_id, client_email, private_key)
   ├─ Service Account로 Blogger API 호출 (blogs.get)
   ├─ 응답 OK이면 블로그 정보 fetch
   └─ JSON을 base64 인코딩하여 Vercel 환경변수 저장
       (BLOGGER_SA_{SITE_ID})
```

#### 5.3.3 UI

Service Account JSON 파일 업로드 + Blog ID 입력 + [검증] 버튼.

### 5.4 호스팅 셋업 검증 함수 시그니처

```typescript
// lib/site-creation/validate-hosting.ts

export async function validateNextjsHosting(opts: {
  domain: string
  vercelTeamId?: string
}): Promise<ValidationResult> {
  // 1. 도메인 형식 검증
  // 2. DNS 검증 (resolveA, resolveCNAME)
  // 3. Vercel API: GET /v9/domains/{domain}
  // 4. 다른 자식 사이트와 중복 검사
  // → 결과 반환
}

export async function validateTistoryHosting(opts: {
  blogName: string
  accessToken: string
}): Promise<ValidationResult> {
  // 쏙튜브 lib/tistory.ts의 validateAccessToken 호출
  // 카테고리 리스트도 같이 fetch
}

export async function validateBloggerHosting(opts: {
  blogId: string
  serviceAccountJson: string
}): Promise<ValidationResult> {
  // googleapis로 blogs.get 호출
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  metadata?: Record<string, any>      // 카테고리 리스트 등
}
```

---

## 6. 단계 4: 콘텐츠 정체성

페르소나 + 톤 + 섹션을 자동 제안하고 운영자가 편집/확정.

### 6.1 페르소나 자동 제안

토픽 + 언어 입력으로 AI(M09)에게 페르소나 1명 추천 받음.

```typescript
// lib/site-creation/suggest-persona.ts
export async function suggestPersona(
  topic: string,
  language: string,
): Promise<PersonaSuggestion> {
  const prompt = `
다음 주제와 언어로 매거진을 운영할 가상의 작성자 페르소나 1명을 만들어주세요.
- 주제: ${topic}
- 언어: ${language}

다음 항목을 JSON으로 반환:
1. name: 페르소나 이름 (한 줄)
2. characterDescription: 성격/배경 (3~5문장)
3. voiceGuide: 말투 가이드 (예: "단호하고 직설적이며, 숫자로 증명한다")
4. expertise: 전문 영역 키워드 5개
5. forbiddenPhrases: 절대 쓰지 않을 표현 5개

응답은 자연스러운 ${language}로.
`
  
  const response = await aiService.call({
    role: 'writer',
    model: 'claude-opus-4-7',
    prompt,
    expectJson: true,
  })
  
  return response.parsed
}
```

### 6.2 톤 선택

페르소나와 별개로 톤은 4종 프리셋 + 커스텀.

```typescript
type Tone = 
  | 'professional'    // 진지한 분석가
  | 'friendly'        // 친절한 가이드
  | 'academic'        // 학자/연구자
  | 'casual'          // 친구처럼
  | string            // 커스텀
```

### 6.3 섹션 자동 제안 (Phase 2 사이트만)

토픽 입력 → AI가 섹션 3~5개 제안.

```typescript
// 예시: topic='ai' → 자동 제안:
[
  { name: 'AI 뉴스', slug: 'news', frequency: 'daily' },
  { name: 'AI 도구', slug: 'tools', frequency: 'thrice_weekly' },
  { name: 'AI 활용 사례', slug: 'usecases', frequency: 'daily' },
]
```

운영자가 추가/제거/이름 수정 가능.

### 6.4 UI 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│ 4단계: 콘텐츠 정체성                                │
│                                                     │
│ ▼ 페르소나 (AI 자동 제안 ✨)            [재생성]   │
│                                                     │
│ 이름: [진지한 분석가____________________]            │
│ 성격: [숫자와 사례로 분석하며, 추측보다는 데이터를. │
│       30대 후반의 전 컨설턴트.________________]      │
│ 말투: [단호하고 직설적. 결론부터 제시.____________] │
│                                                     │
│ ▼ 톤                                                │
│ ● professional  ○ friendly  ○ academic  ○ casual   │
│ ○ 커스텀: [_____________________________]            │
│                                                     │
│ ▼ 섹션 (Phase 2일 때만)                  [+ 추가]   │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ AI 뉴스        slug: news       매일 21:00      │ │
│ │ [편집] [삭제]                                    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ AI 도구        slug: tools      주 3회 22:30    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ AI 활용 사례   slug: usecases   매일 06:00      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│              [← 뒤로]              [다음 →]         │
└─────────────────────────────────────────────────────┘
```

### 6.5 검증

- 페르소나 이름/성격은 비어있지 않아야 함
- 섹션은 최소 1개 (Phase 2일 때)
- 섹션 slug는 영문 소문자 + 하이픈만, 사이트 내 중복 안 됨

---

## 7. 단계 5: 출처 + Phase 선택

### 7.1 Phase 선택

```
○ Phase 1부터 시작 (권위 구축, 14~21일)
   → 28~42편의 권위 글을 자동 생성한 후 Phase 2로 전환
   → 신생 사이트 권장
   
● Phase 2부터 시작 (정기 발행)
   → 즉시 일일 발행 시작
   → 이미 권위가 있거나 빠른 트래픽이 필요한 사이트
```

기본은 Phase 1 권장. 단 마이그레이션(쏙튜브 등 기존 사이트)은 Phase 2.

### 7.2 출처 풀 자동 제안

토픽 + 언어 + 섹션 정보로 AI가 출처 12개 제안.

```typescript
// lib/site-creation/suggest-sources.ts

export async function suggestSources(opts: {
  topic: string
  language: string
  sections?: Section[]
}): Promise<SourceSuggestion[]> {
  const prompt = `
주제 ${opts.topic}, 언어 ${opts.language}로 매거진을 운영합니다.
${opts.sections ? `섹션: ${opts.sections.map((s) => s.name).join(', ')}` : ''}

콘텐츠 출처를 추천해주세요:
- YouTube 채널 5개 (채널명 + channelId 또는 URL)
- RSS 피드 5개 (사이트 이름 + RSS URL)
- 검색 키워드 5개 (영어/한글 혼합 가능)

각 출처에 대해:
- 이름
- URL 또는 ID
- 어느 섹션에 적합한지 (있으면)
- 권위 출처(authoritative)인지 일반인지
- 발행 빈도 추정

JSON 배열로 반환.
`
  
  const response = await aiService.call({
    role: 'writer',
    model: 'claude-opus-4-7',
    prompt,
    expectJson: true,
    enableWebSearch: true,            // 실재 출처 검증
  })
  
  // 추가 검증: 각 출처가 실제 존재하는지 확인
  const verified: SourceSuggestion[] = []
  for (const source of response.parsed) {
    const isReal = await verifySourceExists(source)
    if (isReal) verified.push(source)
  }
  
  return verified
}
```

> **중요:** core.md 6.2의 "가짜 출처 차단" 원칙. AI가 추천한 RSS/채널이 실제 존재하지 않을 수 있다. `verifySourceExists`가 실제로 fetch해서 응답 확인.

### 7.3 출처 표시 UI

```
┌─────────────────────────────────────────────────────┐
│ 5단계: 출처 풀                          [재생성 ✨] │
│                                                     │
│ AI가 추천한 출처 (12개)                             │
│ ☑ 표시된 것이 등록됩니다                            │
│                                                     │
│ ▼ YouTube 채널 (5/5)                                │
│ ☑ MattVidPro AI            id: UC_xxx   ✅ 검증됨  │
│ ☑ Two Minute Papers        id: UC_yyy   ✅ 검증됨  │
│ ☑ AI Explained             id: UC_zzz   ✅ 검증됨  │
│ ☐ The AI Show              id: UC_aaa   ⚠ 발견 안됨│
│ ☑ Sam Witteveen            id: UC_bbb   ✅ 검증됨  │
│                                                     │
│ ▼ RSS 피드 (4/5)                                    │
│ ☑ TechCrunch AI            ✅ 검증됨                │
│ ☑ The Verge AI             ✅ 검증됨                │
│ ☑ MIT Technology Review    ✅ 검증됨                │
│ ☐ AI News Today            ⚠ 404                   │
│ ☑ Anthropic Blog           ✅ 검증됨                │
│                                                     │
│ ▼ 검색 키워드 (5/5)                                 │
│ ☑ "AI 도구 신상"                                    │
│ ☑ "Claude vs GPT"                                   │
│ ...                                                 │
│                                                     │
│ [+ 직접 추가]                                        │
│                                                     │
│ ▼ Phase                                             │
│ ● Phase 1부터 (권위 구축, 14~21일)                  │
│ ○ Phase 2부터 (즉시 발행)                           │
│                                                     │
│              [← 뒤로]              [다음 →]         │
└─────────────────────────────────────────────────────┘
```

### 7.4 검증

- 출처는 최소 5개 이상 권장 (3개 미만이면 경고)
- ⚠ 발견 안된 출처는 자동으로 체크 해제됨
- Phase 1 선택 시: 검색 키워드는 권장이지만 필수 아님 (권위 글은 출처 없이도 작성 가능)
- Phase 2 선택 시: YouTube 또는 RSS 최소 1개 필수

---

## 8. 단계 6: 검토 + 생성

모든 결정 요약 + 최종 [생성] 버튼.

### 8.1 UI 와이어프레임

```
┌─────────────────────────────────────────────────────┐
│ 6단계: 검토 + 생성                                  │
│                                                     │
│ ▼ 사이트 정체성                          [편집]     │
│ • 이름: Travel KR                                   │
│ • ID: travel-kr                                     │
│ • 토픽: 여행                                        │
│ • 언어: 한국어                                      │
│                                                     │
│ ▼ 호스팅                                  [편집]    │
│ • 타입: Next.js (자체 도메인)                       │
│ • 도메인: travel-kr.com ✅ DNS 검증됨               │
│                                                     │
│ ▼ 콘텐츠 정체성                          [편집]    │
│ • 페르소나: 친절한 여행 가이드 (자동 생성됨)        │
│ • 톤: friendly                                      │
│ • 섹션 (Phase 2): 3개                               │
│   - 국내 여행 (매일)                                │
│   - 해외 여행 (주 3회)                              │
│   - 여행 팁 (매일)                                  │
│                                                     │
│ ▼ 출처 + Phase                            [편집]    │
│ • 출처: 11개 (YouTube 4, RSS 4, 검색 3)             │
│ • Phase: Phase 1 (권위 구축, 28편 예상)             │
│ • 예상 종료: 2026-05-27 (21일 후)                   │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ 🚀 생성 후 자동으로 시작되는 작업 (예상 시간 5분)   │
│ 1. Vercel 프로젝트 생성 + 도메인 연결              │
│ 2. Firestore 컬렉션 초기화                          │
│ 3. 페르소나 / 출처 등록                             │
│ 4. SEO 인프라 (llms.txt, sitemap, robots) 생성     │
│ 5. About / Privacy / Contact 페이지 생성           │
│ 6. AI 권위 트리 자동 생성 (Phase 1) — 5분 소요      │
│ 7. 운영자 승인 대기 → 첫 글 작성 시작              │
│                                                     │
│              [← 뒤로]   [🚀 사이트 생성]            │
└─────────────────────────────────────────────────────┘
```

### 8.2 [사이트 생성] 클릭 시

페이지가 진행 상태 화면으로 전환:

```
┌─────────────────────────────────────────────────────┐
│ 사이트 생성 중...                                   │
│                                                     │
│ ✅ 1/7 child_sites 등록                             │
│ ✅ 2/7 Vercel 프로젝트 생성                         │
│ ⏳ 3/7 도메인 연결 중...                            │
│ ⏸ 4/7 Firestore 초기화                              │
│ ⏸ 5/7 SEO 인프라 생성                               │
│ ⏸ 6/7 페르소나/출처 등록                            │
│ ⏸ 7/7 권위 트리 생성 (AI 호출)                      │
│                                                     │
│ 예상 완료: 3분 후                                   │
│ [백그라운드로 보내기 — 알림으로 알려드림]          │
└─────────────────────────────────────────────────────┘
```

성공 시 `/sites/{siteId}` 사이트 개요 페이지로 자동 이동.

---

## 9. 자동 셋업 흐름 상세

`createSite()` 함수의 내부 동작.

### 9.1 함수 시그니처

```typescript
// lib/site-creation/create-site.ts

export async function createSite(input: SiteCreationInput): Promise<{
  siteId: string
  warnings: string[]
}> {
  const tx = new SiteCreationTransaction(input)
  
  try {
    await tx.step1_RegisterSite()
    await tx.step2_SetupHosting()
    await tx.step3_InitializeFirestore()
    await tx.step4_GenerateSeoInfra()
    await tx.step5_CreateStaticPages()
    await tx.step6_RegisterPersonasAndSources()
    await tx.step7_BootstrapPhase()
    
    return { siteId: input.siteId, warnings: tx.warnings }
  } catch (err) {
    await tx.rollback()                // 모든 부산물 청소
    throw err
  }
}
```

### 9.2 단계별 동작

#### Step 1: child_sites 등록

```typescript
async step1_RegisterSite() {
  // child_sites 문서 생성 (status='creating' 상태로)
  await db.collection('child_sites').doc(this.input.siteId).set({
    siteId: this.input.siteId,
    name: this.input.name,
    // ...
    status: 'creating',
    currentPhase: 'authority',         // 또는 'ongoing'
    createdAt: serverTimestamp(),
  })
  this.completed.push('site_registry')
}
```

#### Step 2: 호스팅 셋업

호스팅 타입에 따라 분기:

```typescript
async step2_SetupHosting() {
  switch (this.input.hostingType) {
    case 'nextjs':
      await this.setupNextjs()
      break
    case 'tistory':
      await this.setupTistory()
      break
    case 'blogger':
      await this.setupBlogger()
      break
  }
}

async setupNextjs() {
  // 1. Vercel API: 새 프로젝트 생성
  const project = await vercel.projects.create({
    name: `child-${this.input.siteId}`,
    framework: 'nextjs',
    gitRepository: {
      type: 'github',
      repo: 'meta-site/child-template', // 미리 만들어둔 템플릿 repo
    },
  })
  
  // 2. 도메인 연결
  await vercel.domains.add({
    projectId: project.id,
    domain: this.input.domain,
  })
  
  // 3. 환경변수 주입
  await vercel.env.set(project.id, {
    SITE_ID: this.input.siteId,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    INTERNAL_REVALIDATION_TOKEN: generateToken(),
    // ...
  })
  
  // 4. 첫 배포 트리거
  await vercel.deployments.create({ projectId: project.id })
  
  this.completed.push('vercel_project')
  this.metadata.vercelProjectId = project.id
}

async setupTistory() {
  // 토큰을 메타사이트 Vercel 환경변수에 저장
  const envKey = `TISTORY_TOKEN_${this.input.siteId.toUpperCase().replace(/-/g, '_')}`
  await vercel.env.set(METASITE_PROJECT_ID, {
    [envKey]: this.input.accessToken,
  })
  this.completed.push('tistory_token')
}

async setupBlogger() {
  const envKey = `BLOGGER_SA_${this.input.siteId.toUpperCase().replace(/-/g, '_')}`
  const base64 = Buffer.from(this.input.serviceAccountJson).toString('base64')
  await vercel.env.set(METASITE_PROJECT_ID, {
    [envKey]: base64,
  })
  this.completed.push('blogger_sa')
}
```

#### Step 3: Firestore 초기화

```typescript
async step3_InitializeFirestore() {
  const siteRef = db.collection('sites').doc(this.input.siteId)
  
  // settings 단일 문서들
  await siteRef.collection('settings').doc('curation').set(DEFAULT_CURATION_SETTINGS)
  await siteRef.collection('settings').doc('seo').set(DEFAULT_SEO_SETTINGS)
  await siteRef.collection('settings').doc('monetization').set(DEFAULT_MONETIZATION_SETTINGS)
  
  this.completed.push('firestore_init')
}
```

#### Step 4: SEO 인프라

```typescript
async step4_GenerateSeoInfra() {
  if (this.input.hostingType !== 'nextjs') return  // 외부 호스팅은 자체 처리
  
  // 자식 사이트 코드는 미리 정의된 path들을 동적으로 렌더링
  // 메타에서는 settings/seo에 템플릿만 저장
  await db
    .collection('sites').doc(this.input.siteId)
    .collection('settings').doc('seo')
    .update({
      llmsTextTemplate: generateLlmsText(this.input),
      indexNowKey: generateIndexNowKey(),
    })
  
  this.completed.push('seo_infra')
}
```

#### Step 5: 정적 페이지

```typescript
async step5_CreateStaticPages() {
  if (this.input.hostingType !== 'nextjs') return
  
  // /about /privacy /contact 페이지를 curated_posts에 추가 (특수 type='static')
  const pages = ['about', 'privacy', 'contact']
  for (const page of pages) {
    const content = await aiService.call({
      role: 'writer',
      prompt: `Generate ${page} page for site about ${this.input.topic}, in ${this.input.language}.`,
    })
    await db.collection('sites').doc(this.input.siteId).collection('curated_posts').add({
      type: 'static',
      slug: page,
      title: localizedTitle(page, this.input.language),
      body: content,
      status: 'published',
      // ...
    })
  }
  
  this.completed.push('static_pages')
}
```

#### Step 6: 페르소나 + 출처 등록

```typescript
async step6_RegisterPersonasAndSources() {
  // 페르소나
  await db.collection('sites').doc(this.input.siteId).collection('personas').doc('persona_default').set({
    personaId: 'persona_default',
    name: this.input.persona.name,
    characterDescription: this.input.persona.characterDescription,
    voiceGuide: this.input.persona.voiceGuide,
    isActive: true,
    createdAt: serverTimestamp(),
  })
  
  // 출처
  for (const source of this.input.sources) {
    await db.collection('sites').doc(this.input.siteId).collection('sources').add({
      sourceId: `src_${source.type}_${slugify(source.name)}`,
      type: source.type,
      name: source.name,
      config: source.config,
      sectionIds: source.sectionIds || [],
      status: 'active',
      // ...
    })
  }
  
  this.completed.push('personas_sources')
}
```

#### Step 7: Phase 부트스트랩

Phase 1 vs Phase 2에 따라 분기.

```typescript
async step7_BootstrapPhase() {
  if (this.input.startPhase === 'authority') {
    // Phase 1: AI에게 권위 트리 생성 의뢰
    const outline = await aiService.generateAuthorityOutline({
      topic: this.input.topic,
      language: this.input.language,
      persona: this.input.persona,
      targetArticleCount: 30,
    })
    
    await db.collection('sites').doc(this.input.siteId).collection('authority_outline')
      .doc(`outline_${this.input.siteId}_v1`)
      .set({
        ...outline,
        status: 'awaiting_approval',          // 운영자 승인 대기
        createdAt: serverTimestamp(),
      })
    
    // 운영자에게 알림
    await createAlert({
      severity: 'medium',
      category: 'review_request',
      siteId: this.input.siteId,
      title: `권위 트리 검토 요청: ${this.input.name}`,
      message: `${outline.totalArticles}편의 권위 글 목차가 생성되었습니다.`,
    })
    
  } else {
    // Phase 2: 즉시 Vercel Cron 등록
    await registerSectionCrons(this.input.siteId, this.input.sections)
  }
  
  // 사이트 status를 'active'로 전환
  await db.collection('child_sites').doc(this.input.siteId).update({
    status: 'active',
    currentPhase: this.input.startPhase,
    lastActivityAt: serverTimestamp(),
  })
  
  this.completed.push('phase_bootstrap')
}
```

상세는 `authority-building.md`와 `vercel-cron-spec.md` 참조.

---

## 10. 롤백 (트랜잭션 실패 시)

`SiteCreationTransaction.completed` 배열에 어디까지 진행됐는지 기록. 실패 시 역순으로 정리.

```typescript
async rollback() {
  console.error(`Rolling back site creation: ${this.input.siteId}`)
  
  // 역순 정리
  const reversed = [...this.completed].reverse()
  for (const step of reversed) {
    try {
      switch (step) {
        case 'phase_bootstrap':
          await this.removePhaseBootstrap()
          break
        case 'personas_sources':
          await this.deletePersonasAndSources()
          break
        case 'static_pages':
          await this.deleteStaticPages()
          break
        case 'firestore_init':
          await this.deleteSiteCollections()
          break
        case 'vercel_project':
          await vercel.projects.delete(this.metadata.vercelProjectId)
          break
        case 'tistory_token':
        case 'blogger_sa':
          await this.removeEnvVar()
          break
        case 'site_registry':
          await db.collection('child_sites').doc(this.input.siteId).delete()
          break
      }
    } catch (rollbackErr) {
      // 롤백 실패는 알림으로 운영자에게 (수동 정리)
      await createAlert({
        severity: 'critical',
        category: 'security',
        title: `Rollback 실패: ${this.input.siteId} step ${step}`,
        message: rollbackErr.message,
      })
    }
  }
}
```

### 10.1 부분 실패 정책

- DNS 검증 실패 → 사용자에게 즉시 안내, 단계 3 머무름 (롤백 안 함, child_sites는 'creating' 유지)
- Vercel API 일시 오류 → 5분 후 자동 재시도 (단계 자체는 retriable)
- Firestore 일시 오류 → 즉시 재시도 후 실패 시 롤백
- AI 호출 실패 (페르소나/출처/권위 트리) → 재시도 또는 스킵 후 운영자 수동 입력 요청

---

## 11. 권한과 보안

### 11.1 Site Creation API 엔드포인트

```
POST /api/sites/create
Headers: { Authorization: 'Bearer ${session_token}' }
Body: SiteCreationInput
```

- 인증: Firebase Auth 세션 + ADMIN_EMAILS 검증
- Rate Limiting: 운영자당 분당 3회 (실수로 N개 만드는 것 방지)
- 감사 로그: `audit_logs`에 모든 시도 기록

### 11.2 토큰/JSON 처리

- Tistory access_token, Blogger Service Account JSON은 클라이언트에서 서버로 HTTPS POST
- 서버 메모리에서만 처리, 즉시 Vercel 환경변수로 이동
- Firestore에는 절대 저장하지 않음 (환경변수 키 이름만 저장)
- 로그에 토큰/키 노출 금지 (마스킹)

---

## 12. 기존 사이트 임포트 모드

쏙튜브처럼 이미 있는 사이트를 메타사이트의 자식으로 등록하는 별도 흐름.

`/sites/new`에서 [기존 사이트 임포트] 옵션. 이건 6단계와 다르게:

1. 호스팅 타입 + 인증 입력
2. 기존 데이터(글/요약/큐) 마이그레이션 시작
3. 메타사이트 자식 사이트 메타데이터 등록
4. dual-write 모드 셋업

상세는 `ssoktube-migration.md` (Tier F).

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 6단계 마법사 구조 + 각 단계 폼 필드 + 검증 규칙
- ✅ 호스팅 옵션 3종별 셋업 흐름 (Next.js / Tistory / Blogger)
- ✅ 페르소나 / 출처 / 섹션 자동 제안 (AI 호출)
- ✅ 가짜 출처 차단 (실재 검증)
- ✅ `createSite()` 7단계 트랜잭션 함수 시그니처
- ✅ 단계별 부산물 + 역순 롤백
- ✅ 권한/보안 (인증, Rate Limit, 토큰 격리)
- ✅ 미리보기 + 진행 상태 화면

이 문서가 정의하지 않은 것:
- ❌ 권위 트리의 실제 자동 생성 알고리즘 → `authority-building.md`
- ❌ Vercel Cron 동적 등록의 상세 → `vercel-cron-spec.md`
- ❌ AI 페르소나 5종의 구체 템플릿 → `ai-comment-system.md`
- ❌ 출처별 헬스체크 알고리즘 → `monitoring-health.md`
- ❌ 임베딩 기반 출처 중복 검사 → `duplicate-prevention.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / architecture.md / database-schema.md / publisher-adapters.md / meta-control-spec.md v1.0 기준. |

---

*이 문서는 새 사이트 생성의 단일 출처다. 6단계 폼과 자동 셋업 흐름의 모든 결정을 담고 있다.*

*Tier B 완료. 다음 문서: `authority-building.md` (Tier C 1번)*
