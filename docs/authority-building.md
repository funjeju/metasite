# META-SITE: Phase 1 권위 구축 시스템 (authority-building.md)

> 신생 자식 사이트의 첫 14~21일 동안 28~42편의 권위 글을 자동 생성/발행하는 시스템 명세.
> core.md "5. 두 단계 콘텐츠 모델"의 Phase 1 상세 구현. site-creation-flow.md "Step 7: Phase 부트스트랩"의 후속 단계.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ site-creation-flow.md      (사이트 생성 폼)
  └─ authority-building.md      ★ 이 문서 — Phase 1 권위 구축
        └─ content-pipeline.md       (다음 — Phase 2 정기 발행)
```

이 문서는:
- **Phase 1의 모든 자동화 로직**을 정의한다.
- AI가 출처 없이도 권위 있는 글을 만드는 방법을 설계한다.
- 의존성 그래프, 일일 스케줄링, Pillar Page 자동 생성을 다룬다.

---

## 1. Phase 1의 정의

### 1.1 왜 Phase 1이 필요한가

> **"매거진은 첫 30편이 들어차야 검색엔진이 권위로 인정한다."**

신생 사이트는 다음 문제가 있다:
- 검색엔진이 "이 사이트는 뭐 하는 사이트인가" 판단 못 함
- 외부 출처(YouTube, RSS) 기반 글만 있으면 "남의 콘텐츠 정리"로 보일 위험
- 내부 링크가 거의 없어 SEO 약함
- AI 검색(ChatGPT, Perplexity)이 사이트를 인용할 이유 없음

**Phase 1은 이 문제를 해결한다:**
- 사이트의 토픽을 **체계적으로 다루는** 28~42편의 글
- 각 글이 **다른 권위 글을 참조**하는 내부 링크 그물
- 마지막에 모든 글을 통합하는 **Pillar Page**
- 출처가 없거나 부족해도 작성 가능 (개념/정의/가이드 중심)

### 1.2 Phase 1의 결과물

```
권위 글 28~42편 (자식 사이트 매거진)
   + Pillar Page 1편 (모든 권위 글의 통합 가이드)
   + 두꺼운 내부 링크 그물 (Tier 간 + 같은 Tier)
   + /llms.txt에 등재된 권위 페이지들
   + 검색엔진에 색인된 사이트 정체성
```

### 1.3 Phase 1의 페이스

```
14일 코스 (속성, 일 2편)         권장 페이스
21일 코스 (안정, 일 1~2편)        권장 페이스
30일 코스 (천천히, 일 1편)        대형 토픽
```

페이스는 사이트 생성 시 운영자가 선택. 기본은 21일.

---

## 2. 권위 트리 구조

### 2.1 3-Tier 분류

```
Tier 1: 기초 (Foundation)
   └─ 정의, 개념, 입문자 가이드
   └─ 약 30~40% (예: 30편 중 10편)
   └─ 다른 글에 의존 안 함 (지식 그래프의 뿌리)
   └─ 가장 먼저 발행

Tier 2: 심화 (Deep Dive)
   └─ 비교, 분석, 메커니즘 설명
   └─ 약 35~45% (예: 30편 중 13편)
   └─ Tier 1 글들에 의존 (참조)
   └─ Tier 1 일정량 발행 후 시작

Tier 3: 응용 (Application)
   └─ 실전 케이스, 도구 비교, 트렌드
   └─ 약 20~30% (예: 30편 중 7편)
   └─ Tier 1 + Tier 2 글들 모두 참조
   └─ 가장 마지막에 발행
```

### 2.2 의존성 그래프

`AuthorityArticle`의 `dependsOn`과 `linksTo` 필드(database-schema.md 4.1):

```typescript
interface AuthorityArticle {
  articleId: string                   // 'auth-001'
  title: string
  // ...
  
  dependsOn: string[]                 // 발행 순서 강제 — 이 글들이 먼저 발행돼야
  linksTo: string[]                   // 본문에서 참조할 글들 (양방향 링크 후보)
}
```

**예시 — 'AI 활용법' 사이트의 권위 트리 (28편):**

```
Tier 1 (10편) — 기초
   auth-001  AI란 무엇인가 (정의)
   auth-002  머신러닝 vs 딥러닝
   auth-003  생성형 AI의 작동 원리
   auth-004  AI 모델의 종류
   auth-005  프롬프트의 기본 개념
   auth-006  AI의 한계와 환각(hallucination)
   auth-007  AI 윤리 입문
   auth-008  AI와 저작권
   auth-009  AI를 활용하는 5가지 방식
   auth-010  AI 도구 카테고리 개관
   
Tier 2 (12편) — 심화 — Tier 1 참조
   auth-011  Claude vs ChatGPT 심층 비교    [dependsOn: 001, 004]
   auth-012  프롬프트 엔지니어링 5가지 패턴   [dependsOn: 005]
   auth-013  RAG: 검색 증강 생성의 메커니즘    [dependsOn: 003]
   auth-014  Fine-tuning vs Few-shot          [dependsOn: 003, 004]
   auth-015  AI 환각을 줄이는 방법            [dependsOn: 005, 006]
   auth-016  로컬 LLM 실행 가이드              [dependsOn: 003, 004]
   auth-017  AI 도구의 가격 정책 비교          [dependsOn: 010]
   auth-018  AI와 개인정보 보호                [dependsOn: 007, 008]
   auth-019  멀티모달 AI의 이해                [dependsOn: 003, 004]
   auth-020  에이전트 AI: 정의와 사례          [dependsOn: 003, 009]
   auth-021  AI 코딩 도구의 작동 원리          [dependsOn: 003, 010]
   auth-022  Vector DB와 임베딩 입문          [dependsOn: 013]
   
Tier 3 (6편) — 응용 — Tier 1+2 참조
   auth-023  실무자를 위한 AI 도구 추천 5선   [dependsOn: 010, 017, 021]
   auth-024  AI로 마케팅 콘텐츠 자동화하기     [dependsOn: 012, 020]
   auth-025  AI 코딩 도구 실전 비교 (Claude/Cursor/Cline) [dependsOn: 011, 021]
   auth-026  나만의 AI 어시스턴트 만들기        [dependsOn: 012, 016, 020]
   auth-027  AI 도구로 영어 학습 가속화         [dependsOn: 011, 023]
   auth-028  2026년 AI 트렌드 5가지            [dependsOn: 010, 020, 022]
```

**Pillar Page (1편):**
```
'/guide/ai-complete'  — AI 활용법 완전 가이드
   → 위 28편 모두를 섹션별로 통합 참조하는 hub 페이지
```

### 2.3 의존성 그래프의 SEO 효과

```
Tier 1 (뿌리) ──────► Tier 2 (가지) ──────► Tier 3 (잎)
   ▲                       ▲                    │
   │                       │                    │
   └────────참조──────────┘                    │
                                                │
                                                ▼
                                          Pillar Page
                                              ▲
                                              │
                          모든 글이 Pillar로 링크
```

각 Tier 1 글은 **링크를 받는 페이지(authority hub)**가 되고, Pillar Page는 사이트 전체의 **topical authority**를 형성. 이 구조가 Google이 권위 사이트를 인식하는 패턴이다.

---

## 3. 권위 트리 자동 생성 알고리즘

### 3.1 입력

```typescript
interface OutlineGenerationInput {
  siteId: string
  topic: string                       // 'AI 활용법'
  language: 'ko' | 'en' | ...
  persona: Persona                    // 사이트의 페르소나
  
  targetArticleCount?: number         // 28~42, 기본 30
  targetDurationDays?: number         // 14~30, 기본 21
  
  // 톤/스타일 힌트
  toneHints?: string[]
  excludeTopics?: string[]            // 다루지 않을 영역
  
  // 기존 콘텐츠가 있는 경우 (마이그레이션)
  existingArticles?: { title: string; slug: string }[]
}
```

### 3.2 AI 호출 흐름

```typescript
// lib/authority-builder/generate-outline.ts

export async function generateAuthorityOutline(
  input: OutlineGenerationInput,
): Promise<AuthorityOutline> {
  
  // 1단계: 토픽 분해
  const topicMap = await decomposeTopicWithAI(input)
  
  // 2단계: Tier 분류 + 글 목록 생성
  const articles = await generateArticleList(input, topicMap)
  
  // 3단계: 의존성 그래프 결정
  const withDeps = await assignDependencies(articles)
  
  // 4단계: 발행 스케줄 배정
  const scheduled = assignPublishSchedule(withDeps, input.targetDurationDays || 21)
  
  // 5단계: 검증
  validateOutline(scheduled)
  
  // 6단계: AuthorityOutline 객체 빌드
  return buildOutline(input, scheduled)
}
```

### 3.3 1단계: 토픽 분해

AI에게 토픽을 받아 하위 영역으로 분해.

```typescript
const decomposePrompt = `
당신은 콘텐츠 전략가입니다.
주제 "${input.topic}"에 대해 권위 있는 매거진 사이트를 만들 예정입니다.

이 주제를 다음 3가지 카테고리로 분해해주세요:

1. 기초 개념 (Tier 1) — 입문자가 알아야 할 정의/원리/개관
2. 심화 분석 (Tier 2) — 비교/메커니즘/세부 사항
3. 응용 사례 (Tier 3) — 실전/도구/트렌드

각 카테고리에 들어갈 하위 토픽을 3~5개씩 제시해주세요.
사이트의 페르소나는: ${input.persona.characterDescription}
언어: ${input.language}

JSON 형식:
{
  "tier1": [{"name": "...", "subtopics": ["...", "..."]}],
  "tier2": [...],
  "tier3": [...]
}
`

const topicMap = await aiService.call({
  role: 'authority_outline_generator',
  model: 'claude-opus-4-7',
  prompt: decomposePrompt,
  expectJson: true,
})
```

### 3.4 2단계: 글 목록 생성

각 하위 토픽을 1~3편의 글 제목/슬러그로 구체화.

```typescript
const generateListPrompt = `
다음 토픽 맵을 기반으로 권위 매거진의 글 목록을 작성하세요.
목표 글 수: ${input.targetArticleCount} (Tier 1: 30%, Tier 2: 45%, Tier 3: 25%)

토픽 맵:
${JSON.stringify(topicMap, null, 2)}

각 글에 대해:
- articleId: 'auth-001' 형식 (3자리 0 패딩)
- title: 매력적이고 SEO 친화적인 제목 (60자 이내)
- slug: URL용 (영문 소문자 + 하이픈)
- targetKeyword: 주 SEO 키워드
- aliases: 본문에서 매칭할 동의어 3~5개
- estimatedWordCount: 1500~3500
- summary: 글 1줄 요약 (어떤 주제인지)

언어: ${input.language}
페르소나: ${input.persona.name} — ${input.persona.voiceGuide}

JSON 배열로 반환. Tier 1부터 차례로.
`

const articleList = await aiService.call({
  role: 'authority_outline_generator',
  prompt: generateListPrompt,
  expectJson: true,
})
```

### 3.5 3단계: 의존성 그래프 결정

```typescript
async function assignDependencies(articles: ArticleDraft[]): Promise<AuthorityArticle[]> {
  const tier1Ids = articles.filter((a) => a.tier === 1).map((a) => a.articleId)
  const tier2Ids = articles.filter((a) => a.tier === 2).map((a) => a.articleId)
  
  for (const article of articles) {
    if (article.tier === 1) {
      article.dependsOn = []                    // 뿌리 — 의존 없음
      article.linksTo = []                      // 나중에 다른 글들이 이리로 링크함
    }
    
    if (article.tier === 2) {
      // AI에게 "이 Tier 2 글이 어떤 Tier 1 글에 의존하는가" 질문
      const deps = await askDependencies(article, articles.filter((a) => a.tier === 1))
      article.dependsOn = deps                  // 1~3개의 Tier 1 ID
      article.linksTo = []                      // Tier 3 글들이 이리로 링크 가능
    }
    
    if (article.tier === 3) {
      // Tier 1 + Tier 2 모두에서 의존
      const deps = await askDependencies(article, articles.filter((a) => a.tier !== 3))
      article.dependsOn = deps                  // 2~4개의 ID
      article.linksTo = []                      // Pillar Page에서 링크 받음
    }
  }
  
  // linksTo 역방향 채우기 (dependsOn이 곧 linksTo의 역)
  for (const article of articles) {
    for (const depId of article.dependsOn) {
      const depArticle = articles.find((a) => a.articleId === depId)
      if (depArticle) depArticle.linksTo.push(article.articleId)
    }
  }
  
  return articles
}
```

### 3.6 4단계: 발행 스케줄 배정

```typescript
function assignPublishSchedule(
  articles: AuthorityArticle[],
  durationDays: number,
): AuthorityArticle[] {
  const articlesPerDay = Math.ceil(articles.length / durationDays)
  // 예: 30편 / 21일 = 1.43 → 2편/일
  
  // 정렬: dependsOn이 적은 것 먼저, 같으면 articleId 오름차순
  const sorted = topologicalSort(articles)
  
  let dayOffset = 0
  let articlesToday = 0
  
  for (const article of sorted) {
    if (articlesToday >= articlesPerDay) {
      dayOffset++
      articlesToday = 0
    }
    
    const publishDate = addDays(new Date(), dayOffset + 1) // 시작은 내일
    publishDate.setHours(9, 0, 0, 0)                       // 매일 09:00 KST
    
    article.scheduledPublishAt = Timestamp.fromDate(publishDate)
    articlesToday++
  }
  
  return sorted
}

// 의존성 토폴로지 정렬: dependsOn 모두 발행된 후에 발행 가능
function topologicalSort(articles: AuthorityArticle[]): AuthorityArticle[] {
  const result: AuthorityArticle[] = []
  const visited = new Set<string>()
  
  function visit(id: string) {
    if (visited.has(id)) return
    const article = articles.find((a) => a.articleId === id)
    if (!article) return
    
    for (const depId of article.dependsOn) {
      visit(depId)                              // 의존 글 먼저
    }
    
    visited.add(id)
    result.push(article)
  }
  
  // Tier 1 → Tier 2 → Tier 3 순서로 visit
  for (const tier of [1, 2, 3]) {
    for (const article of articles.filter((a) => a.tier === tier)) {
      visit(article.articleId)
    }
  }
  
  return result
}
```

### 3.7 5단계: 검증

```typescript
function validateOutline(articles: AuthorityArticle[]) {
  // 1. articleId 중복 없음
  const ids = articles.map((a) => a.articleId)
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate articleId')
  
  // 2. slug 중복 없음
  const slugs = articles.map((a) => a.slug)
  if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate slug')
  
  // 3. dependsOn 순환 없음
  for (const article of articles) {
    if (hasCircularDependency(article, articles)) {
      throw new Error(`Circular dependency: ${article.articleId}`)
    }
  }
  
  // 4. dependsOn이 모두 같은 또는 더 낮은 Tier
  for (const article of articles) {
    for (const depId of article.dependsOn) {
      const dep = articles.find((a) => a.articleId === depId)
      if (!dep) throw new Error(`Unknown dependency: ${depId}`)
      if (dep.tier > article.tier) {
        throw new Error(`Tier ${article.tier} depends on Tier ${dep.tier}`)
      }
    }
  }
  
  // 5. 비율 검증 (대략)
  const tier1Count = articles.filter((a) => a.tier === 1).length
  const tier2Count = articles.filter((a) => a.tier === 2).length
  const tier3Count = articles.filter((a) => a.tier === 3).length
  
  const total = articles.length
  const t1Ratio = tier1Count / total
  const t2Ratio = tier2Count / total
  
  if (t1Ratio < 0.2 || t1Ratio > 0.5) {
    console.warn(`Tier 1 ratio unusual: ${t1Ratio}`)
  }
  if (t2Ratio < 0.3 || t2Ratio > 0.55) {
    console.warn(`Tier 2 ratio unusual: ${t2Ratio}`)
  }
}
```

---

## 4. 운영자 승인 흐름

생성된 outline은 즉시 발행 시작하지 않는다. 운영자 검토 + 승인 필수.

### 4.1 흐름

```
[Outline 생성 완료]
         │
         ▼
status='awaiting_approval'로 저장
         │
         ▼
M16 알림 발송: "권위 트리 검토 요청"
         │
         ▼
운영자가 /sites/{id}/outline 페이지 접근
         │
         ├─ [승인] → status='approved' → 첫 글 작성 시작
         ├─ [재생성] → 새 v2 생성 (이전 v1은 archived)
         ├─ [편집] → 제목/순서/의존성 직접 수정
         └─ [폐기] → status='rejected' → 사이트 status='paused'
```

### 4.2 운영자 편집 시 자동 보정

운영자가 글을 추가/제거하면 의존성이 깨질 수 있음. 시스템이 자동 보정:

```typescript
async function adjustDependenciesAfterEdit(outline: AuthorityOutline) {
  const validIds = new Set(outline.tiers.flatMap((t) => t.articles.map((a) => a.articleId)))
  
  for (const tier of outline.tiers) {
    for (const article of tier.articles) {
      // 더 이상 존재하지 않는 dependsOn 제거
      article.dependsOn = article.dependsOn.filter((id) => validIds.has(id))
      article.linksTo = article.linksTo.filter((id) => validIds.has(id))
    }
  }
  
  // 스케줄 재계산
  outline.tiers.forEach((tier) => {
    tier.articles = topologicalSort(tier.articles)
  })
  assignPublishSchedule(allArticles, outline.expectedDurationDays)
}
```

---

## 5. Phase 1 일일 발행 흐름

### 5.1 Vercel Cron 트리거

승인된 outline이 있으면 매일 09:00 KST에 트리거:

```typescript
// app/api/cron/authority-publish/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const activeSites = await getActiveAuthoritySites()
  
  for (const site of activeSites) {
    const outline = await getApprovedOutline(site.siteId)
    if (!outline) continue
    
    // 오늘 발행할 글들
    const articlesToPublish = outline.tiers
      .flatMap((t) => t.articles)
      .filter((a) => 
        a.status === 'pending' &&
        isToday(a.scheduledPublishAt) &&
        canPublishNow(a, outline)             // dependsOn 모두 발행됐는지
      )
    
    for (const article of articlesToPublish) {
      await triggerArticleGeneration(site, article, outline)
    }
  }
  
  return NextResponse.json({ ok: true })
}

function canPublishNow(article: AuthorityArticle, outline: AuthorityOutline): boolean {
  const allArticles = outline.tiers.flatMap((t) => t.articles)
  for (const depId of article.dependsOn) {
    const dep = allArticles.find((a) => a.articleId === depId)
    if (!dep || dep.status !== 'published') {
      return false                            // 의존 글이 아직 발행 안 됨
    }
  }
  return true
}
```

### 5.2 권위 글 생성 (단일 글)

```typescript
async function triggerArticleGeneration(
  site: ChildSite,
  article: AuthorityArticle,
  outline: AuthorityOutline,
) {
  // 1. status 업데이트
  await updateArticleStatus(article, 'writing')
  
  // 2. 이미 발행된 의존 글들의 본문 fetch (참조용)
  const dependencyContext = await fetchDependencyContexts(article, outline)
  
  // 3. AI 3인 체제 호출
  const content = await aiService.generateAuthorityArticle({
    site,
    article,
    dependencyContext,
    persona: site.persona,
  })
  
  // 4. 검증자 통과 확인
  if (content.verifierReport.fakeReferenceDetected) {
    // 가짜 출처 발견 — 일반 글로 변환 또는 차단 (settings/curation 정책)
    await handleFakeCitation(content, site)
  }
  
  // 5. curated_posts에 저장 (status='draft' 또는 'published')
  const post = await saveAsCuratedPost(content, {
    phase: 'authority',
    tier: article.tier,
    outlineId: outline.outlineId,
    authorityArticleId: article.articleId,
  })
  
  // 6. AuthorityArticle 갱신
  await updateArticle(article, {
    status: 'published',
    actualPublishedAt: serverTimestamp(),
    curatedPostId: post.postId,
  })
  
  // 7. Outline 진행 상황 갱신
  await incrementOutlineProgress(outline)
  
  // 8. Phase 1 종료 체크 → Pillar Page 생성 트리거
  if (await isPhase1Complete(outline)) {
    await triggerPillarPageGeneration(site, outline)
  }
}
```

### 5.3 권위 글 생성 시 특수 사항

상세 프롬프트는 `ai-roles-and-prompts.md`에서. 여기는 핵심만:

#### 5.3.1 출처 정책

> **"권위 글은 출처가 없거나 부족해도 작성 가능하다. 단 가짜 출처는 절대 만들지 않는다."**

```typescript
const writerPrompt = `
당신은 ${persona.name}입니다.
지금 작성할 글: "${article.title}"
이 글은 ${article.tier === 1 ? '기초 개념을 설명하는 입문 가이드' 
        : article.tier === 2 ? '심화 분석 글' 
        : '응용 사례 글'}입니다.

출처 정책 (매우 중요):
- 일반 상식, 공식 문서, 학술적으로 합의된 사실은 출처 없이 사용 가능합니다.
- 통계, 설문, 특정 인물의 발언, 특정 회사의 발표는 반드시 검증 가능한 출처가 필요합니다.
- 출처를 만들어내지 마세요. 모르는 통계나 사례는 일반 표현으로 바꾸세요.
  ❌ "MIT 2024 연구에 따르면 78%가..."  (실재하지 않는 출처)
  ✅ "여러 연구에서 다수가..."           (출처 없는 일반 표현)

내부 링크:
다음 글들을 본문에서 자연스럽게 참조하세요(앵커 텍스트로 매끄럽게 연결):
${article.dependsOn.map((id) => `- ${id}: ${getTitle(id)}`).join('\n')}
`
```

#### 5.3.2 내부 링크 의무

권위 글은 의존성 그래프에 따라 **반드시** 다른 권위 글로 링크. 작성자 AI가 자연스럽게 링크 마커를 넣고, M12 Internal Linking Engine이 실제 URL로 변환.

```markdown
... 머신러닝과 딥러닝의 차이를 더 깊이 이해하려면 [머신러닝 vs 딥러닝]({{ARTICLE:auth-002}})을 참고하세요. ...
```

`{{ARTICLE:auth-002}}` 마커 → 발행 시점에 실제 slug로 치환:
`/articles/머신러닝-vs-딥러닝`

#### 5.3.3 글 길이 + 구조

```
Tier 1 권위 글: 1500~2500단어
   - 정의 → 왜 중요한가 → 어떻게 작동하는가 → 흔한 오해 → 더 알아보기
   
Tier 2 권위 글: 2000~3000단어
   - 비교/대조 → 메커니즘 → 사용 시점 → 한계
   
Tier 3 권위 글: 1800~2800단어
   - 실전 시나리오 → 단계별 적용 → 도구 추천 → 흔한 실수
```

---

## 6. Pillar Page 자동 생성

### 6.1 트리거 조건

Phase 1의 `progress.articlesPublished >= totalArticles * 0.95` (95% 이상 발행 완료) 시 자동 생성.

### 6.2 Pillar Page 구조

```markdown
# AI 활용법 완전 가이드

## 들어가며
이 가이드는 AI를 처음 접하는 분부터 실무에 적용하려는 분까지 
모두를 위한 통합 자료입니다.

---

## 1. 기초 — AI를 처음 만나다

### AI란 무엇인가
[Tier 1 글 1편 요약 200자] [전체 읽기 →](auth-001 link)

### 머신러닝과 딥러닝
[Tier 1 글 1편 요약 200자] [전체 읽기 →](auth-002 link)

...10편 모두

---

## 2. 심화 — 메커니즘과 비교

### Claude vs ChatGPT
[Tier 2 글 요약] [전체 읽기 →]

...12편 모두

---

## 3. 응용 — 실전과 트렌드

...6편 모두

---

## 다음 단계
- 이 시리즈 외에도 [news 섹션](/news)에서 매일 새 AI 뉴스를 정리합니다.
- [도구 비교](/tools)에서 최신 AI 도구를 다룹니다.

---

📅 마지막 업데이트: 2026-05-27
✍️ 작성자: 진지한 분석가
🔗 총 28편의 권위 글 통합
```

### 6.3 자동 생성 알고리즘

```typescript
async function generatePillarPage(
  site: ChildSite,
  outline: AuthorityOutline,
): Promise<CuratedPost> {
  
  // 1. 모든 권위 글의 발행본 + 요약 수집
  const articles = await fetchAllAuthorityPosts(site.siteId, outline.outlineId)
  
  // 2. AI에게 통합 가이드 생성 의뢰
  const pillarContent = await aiService.call({
    role: 'authority_outline_generator',
    model: 'claude-opus-4-7',
    prompt: `
당신은 ${site.persona.name}입니다.
주제 "${site.topic}"에 대한 28편의 권위 글이 모두 발행됐습니다.

이제 모든 글을 통합한 마스터 가이드(Pillar Page)를 작성하세요.

가이드의 구조:
1. 들어가며 (이 가이드의 목적, 누구를 위한 것인지)
2. 기초 섹션 (Tier 1 글 N편의 요약 + 링크)
3. 심화 섹션 (Tier 2 글 N편의 요약 + 링크)
4. 응용 섹션 (Tier 3 글 N편의 요약 + 링크)
5. 다음 단계 (정기 발행 섹션 안내)

각 글에 대해:
- 200자 내외로 요약
- "[전체 읽기 →]" 링크
- 글의 핵심 인사이트 1줄

페르소나의 목소리로, 친절하지만 권위 있는 톤.
언어: ${site.language}

전체 글 목록과 요약:
${articles.map((a) => `${a.articleId}: ${a.title}\n${a.excerpt}`).join('\n\n')}
`,
  })
  
  // 3. 검증자 + 편집자 통과
  // 4. curated_posts에 저장 (특수 type='pillar')
  const pillarPost = await savePillarPost(pillarContent, site, outline)
  
  // 5. 사이트의 메인 네비게이션에 추가
  await addToMainNav(site.siteId, pillarPost)
  
  // 6. 모든 권위 글의 푸터에 "📘 가이드 전체 보기" 링크 추가
  await injectPillarLinkToAllAuthorityPosts(site.siteId, pillarPost)
  
  // 7. /llms.txt에 추가
  await updateLlmsText(site.siteId, pillarPost)
  
  // 8. Pillar Page는 sitemap.xml priority 1.0 (최상위)
  
  return pillarPost
}
```

### 6.4 Pillar Page는 살아있는 문서

Phase 2 시작 후에도 권위 글이 추가되거나 수정되면 Pillar Page도 갱신:

- 매주 1회 백그라운드 재생성
- 수동 트리거: 어드민 페이지에서 [Pillar 재생성]
- 변경 시 sitemap revalidation

---

## 7. Phase 1 → Phase 2 전환

### 7.1 자동 전환 조건

```typescript
async function checkPhase1Completion(outline: AuthorityOutline): Promise<boolean> {
  return (
    outline.progress.articlesPublished >= outline.totalArticles * 0.95 &&
    outline.pillarPage.actualPostId !== undefined &&                      // Pillar 생성됨
    outline.progress.articlesFailed < outline.totalArticles * 0.1          // 실패율 10% 미만
  )
}
```

### 7.2 전환 흐름

```
조건 충족 감지
    │
    ▼
운영자에게 알림: "Phase 1 완료. Phase 2로 전환할까요?"
    │
    ├─ [Phase 2로 전환]
    │     ├─ child_sites.currentPhase = 'ongoing'
    │     ├─ 섹션 Cron 활성화 (Phase 2 정기 발행 시작)
    │     ├─ Authority outline status = 'complete'
    │     └─ 운영자 대시보드에 "Phase 1 완료 🎉" 표시
    │
    ├─ [Phase 1 연장] (글 더 추가)
    │     └─ 새 outline v2 생성 또는 현재 outline에 글 추가
    │
    └─ [수동 처리] (전환 보류)
```

### 7.3 Phase 2 시작 시 권위 그물 활용

Phase 2의 정기 발행 글은 **항상 관련 권위 글로 링크**한다. 이게 권위 그물의 진짜 목적.

```
Phase 2 새 글: "OpenAI o5 출시: 무엇이 달라졌나" (news 섹션)
    │
    ├─ 본문에 [생성형 AI의 작동 원리]({{auth-003}}) 링크 자동 삽입
    ├─ 본문에 [Claude vs ChatGPT 심층 비교]({{auth-011}}) 링크 자동 삽입
    └─ 본문 하단에 "더 알아보기" 박스에 Pillar Page 링크
```

상세는 `internal-linking.md` 참조.

---

## 8. 권위 트리 v2 (재생성)

운영자가 [재생성] 클릭 시 또는 자동:

### 8.1 v2 만드는 케이스

- 토픽이 너무 넓어서 v1이 어수선함 → v2에서 좁힘
- 시장이 빠르게 변해 v1이 6개월 후 시대 뒤떨어짐 → v2 갱신
- 사이트 운영하면서 새 인사이트 → 일부 글 재구성

### 8.2 v2 생성 시 v1 글 처리

```typescript
async function createOutlineV2(siteId: string, options: V2Options) {
  const v1 = await getCurrentOutline(siteId)
  const v2 = await generateAuthorityOutline({...})
  
  // v1 → v2 매핑
  for (const v2Article of v2.allArticles) {
    const matchedV1 = findMatchingV1Article(v2Article, v1)  // 임베딩 유사도
    
    if (matchedV1 && matchedV1.curatedPostId) {
      // 기존 글 재활용 (slug 같으면 그대로, 다르면 redirect 추가)
      v2Article.curatedPostId = matchedV1.curatedPostId
      v2Article.status = 'published'
      
      if (matchedV1.slug !== v2Article.slug) {
        await addRedirect(matchedV1.slug, v2Article.slug)
      }
    }
    // 매칭 안 되면 새로 작성
  }
  
  // v1은 archived 처리
  await updateOutline(v1, { status: 'archived', archivedAt: serverTimestamp() })
  
  // Pillar Page도 v2로 재생성
  await regeneratePillarPage(siteId, v2)
}
```

---

## 9. Phase 1 모니터링

### 9.1 운영자가 매일 확인할 지표

`/sites/{id}/outline` 페이지에 표시:

```
권위 트리 v1   상태: 🟢 진행 중

진행률: 12/30 (40%)
일정: D-9 (예상 종료 2026-05-15)
페이스: 일 1.4편 (목표 1.5편) — 약간 늦음

마지막 발행: 'auth-012 프롬프트 엔지니어링 5가지 패턴' (3시간 전)
다음 발행: 'auth-013 RAG의 메커니즘' (오늘 18:00 예정)

실패: 1편 (auth-007 'AI 윤리' — 1회 재시도 중)

Tier별 진행:
  Tier 1: 10/10 ✅
  Tier 2:  2/12 ━━━░░░░░░░░░ 17%
  Tier 3:  0/6  ░░░░░░░░░░░░  0%
  Pillar:  대기 중 (95% 진행 시 트리거)
```

### 9.2 알림 트리거

다음 상황에서 운영자 알림:

| 상황 | 심각도 |
|------|--------|
| 권위 글 생성 실패 (3회 연속) | high |
| 일정 30% 이상 지연 | medium |
| 가짜 출처 감지 (검증자 통과 안 됨) | high |
| Pillar Page 생성 준비 완료 | low (정보) |
| Phase 1 완료 (Phase 2 전환 제안) | medium |

상세는 `monitoring-health.md` 참조.

---

## 10. 비용 추정

### 10.1 Phase 1 한 사이트 생성 비용

```
권위 트리 자동 생성 (1회):     ~$2 (Claude Opus 호출 ~5회)

권위 글 28편 생성:
   - Writer (Claude Opus) 28회: ~$1.5/편 × 28 = $42
   - Verifier (GPT-5) 28회: ~$0.8/편 × 28 = $22.4
   - Editor (Claude Opus) 28회: ~$0.5/편 × 28 = $14
   - 임베딩 28회: ~$0.05/편 × 28 = $1.4
   합계: ~$80

Pillar Page 생성 (1회):           ~$3

Phase 1 전체 합계: ~$85 / 사이트
```

자식 사이트 6개 → Phase 1 일회성 비용 ~$510. 약 3주 동안 분산.

### 10.2 비용 절감 전략

- 글이 실패하면 같은 토픽으로 다시 생성하지 않고 1번만 재시도 후 운영자 검수 큐로
- 검증자(Verifier)는 핵심 사실 주장만 검증 (전체 문장 다 검증 X)
- Editor는 가벼운 모델(Claude Sonnet)도 옵션
- 임베딩은 새 글에만 (기존 글 재계산 금지)

상세는 `monitoring-health.md`의 비용 한도 정책 참조.

---

## 11. 권위 구축 실패 시 대응

### 11.1 실패 시나리오

| 시나리오 | 영향 | 대응 |
|---------|------|------|
| AI가 가짜 출처 반복 생성 | 신뢰도 추락 | 검증자 정책 강화 + 운영자 알림 |
| 의존성 그래프가 너무 복잡 | 발행 지연 | v2 생성 시 의존성 제한 (최대 3개) |
| 한 글이 계속 실패 | Phase 진행 정체 | 3회 실패 시 일반 글로 전환 또는 스킵 |
| 글의 품질이 일관되지 않음 | 사용자 이탈 | 페르소나 가이드 + 길이/구조 강화 |
| Phase 1 도중 사이트 토픽 변경 | 권위 트리 무용지물 | 사이트 일시정지 → outline v2 |

### 11.2 운영자 개입 시점

다음 경우는 운영자가 반드시 개입:
- 가짜 출처 3편 이상 발견 (시스템 자체가 멈춤)
- 검수 큐에 5편 이상 누적
- 연속 24시간 발행 0편

이때는 사이트 자동 일시정지 + critical 알림.

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ Phase 1의 정의/목적/페이스 (14~30일, 28~42편)
- ✅ 3-Tier 권위 트리 구조 (Foundation/Deep Dive/Application)
- ✅ 의존성 그래프 모델 (`dependsOn` / `linksTo`)
- ✅ AI 권위 트리 자동 생성 5단계 알고리즘
- ✅ 토폴로지 정렬로 발행 스케줄 배정
- ✅ 운영자 승인 흐름 + 편집 시 자동 보정
- ✅ 일일 발행 흐름 (Cron → canPublishNow → AI 호출 → 저장)
- ✅ 권위 글 작성 시 출처 정책 (가짜 출처 절대 금지)
- ✅ 내부 링크 마커 (`{{ARTICLE:auth-002}}`)
- ✅ Pillar Page 자동 생성 (95% 시점 트리거)
- ✅ Phase 1 → Phase 2 전환 조건과 흐름
- ✅ Outline v2 재생성 + 기존 글 매칭
- ✅ 모니터링 지표 + 알림 트리거
- ✅ 비용 추정 (~$85/사이트)
- ✅ 실패 대응 시나리오

이 문서가 정의하지 않은 것:
- ❌ Writer/Verifier/Editor 프롬프트 전체 템플릿 → `ai-roles-and-prompts.md`
- ❌ Phase 2 정기 발행의 4단계 파이프라인 상세 → `content-pipeline.md`
- ❌ 내부 링크 마커 치환 알고리즘 + 임베딩 매칭 → `internal-linking.md`
- ❌ 실패 재시도 큐의 동작 → `monitoring-health.md`
- ❌ 임베딩 기반 v1↔v2 글 매칭 알고리즘 → `duplicate-prevention.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / database-schema.md / site-creation-flow.md v1.0 기준. |

---

*이 문서는 Phase 1 권위 구축 시스템의 단일 출처다. 사이트 생성 후 첫 14~30일 동안의 모든 자동화 흐름을 담고 있다.*

*다음 문서: `content-pipeline.md` (Tier C 2번)*
