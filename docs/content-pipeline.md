# META-SITE: Phase 2 콘텐츠 파이프라인 (content-pipeline.md)

> Phase 1 권위 구축이 끝난 자식 사이트가 매일/주간 단위로 정기 발행하는 4단계 파이프라인 명세.
> SSOKTUBE의 검증된 Scout → Evaluate → Summarize → Generate 4단계를 자식 사이트별 네임스페이스로 확장한 형태.
> core.md "5. 두 단계 콘텐츠 모델"의 Phase 2 상세 + magazine.md(SSOKTUBE 시스템) 메타 통합.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ authority-building.md      (Phase 1 — 권위 구축, 출처 없이도 OK)
  └─ content-pipeline.md        ★ 이 문서 — Phase 2 (정기 발행, 출처 기반)
        └─ ai-roles-and-prompts.md   (다음 — Writer/Verifier/Editor 프롬프트)
```

**Phase 1 vs Phase 2 차이:**

| | Phase 1 (Authority) | Phase 2 (Ongoing) |
|---|---------------------|-------------------|
| 목적 | 사이트 정체성 확립 | 트래픽 + 권위 그물 활용 |
| 글 출처 | 없거나 부족해도 OK | YouTube/RSS/검색 필수 |
| 글 종류 | 정의/개념/가이드 | 뉴스/도구/사례 |
| 페이스 | 일 1~2편 (14~30일) | 무제한 정기 발행 |
| 사용 컬렉션 | `authority_outline` | `ai_scout_queue` 등 4단계 |

---

## 1. 핵심 원칙

### 1.1 SSOKTUBE 코드 보존

> **"SSOKTUBE의 검증된 4단계 코드를 거의 그대로 재사용한다."**

SSOKTUBE는 1년 이상 운영된 검증된 시스템. 메타사이트는 다음만 변경:
- 컬렉션 경로: 글로벌 → `sites/{siteId}/` 하위
- 카테고리: 단일 사이트의 하위 분류 → 명시적 `sectionId`
- 검증자(Verifier) 단계: 옵션 → 의무 (가짜 출처 차단)
- 실패 처리: SSOKTUBE 패턴 + 메타 알림 통합

비즈니스 로직, 토큰 사용량 추적, 4단계 분리 등은 그대로.

### 1.2 섹션 단위 독립 운영

> **"섹션 N개는 N개의 작은 SSOKTUBE다."**

자식 사이트 1개에 섹션 3~5개. 각 섹션은:
- 자기만의 출처 풀 (sources)
- 자기만의 발행 주기 (Vercel Cron)
- 자기만의 톤 오버라이드
- 자기만의 진행 상태 (`ai_pipeline_state`)

한 섹션이 망가져도 다른 섹션은 정상 발행.

### 1.3 권위 그물 활용

Phase 2 글은 **항상 Phase 1 권위 글로 링크**한다. 이게 권위 구축의 진짜 ROI.

```
Phase 2 새 글: "OpenAI o5 출시: 무엇이 달라졌나"
   │
   ├─ "[생성형 AI의 작동 원리]({{auth-003}})를 모르신다면..."
   ├─ "[Claude vs ChatGPT 비교]({{auth-011}})에서 다룬..."
   └─ 푸터: "📘 AI 활용법 완전 가이드(Pillar)"
```

상세는 `internal-linking.md`.

---

## 2. 4단계 파이프라인 개관

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ ① Scout      │ →  │ ② Evaluate   │ →  │ ③ Summarize  │ →  │ ④ Generate   │
│              │    │              │    │              │    │   Post       │
│ 출처에서     │    │ AI 2~3인     │    │ 1위 후보     │    │ AI 3인 체제  │
│ 후보 수집    │    │ 점수 평가    │    │ 심층 요약    │    │ 글 작성      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       ▼                   ▼                   ▼                   ▼
  ai_scout_      ai_evaluate_         saved_summaries        curated_posts
  queue          queue                                       (status='draft'
                                                              or 'published')
```

각 단계는 **별도 Vercel Function**으로 분리. 단일 함수가 모든 단계를 처리하면 timeout 위험.

### 2.1 트리거 패턴

```
Vercel Cron (매시간 또는 섹션별 schedule)
   ↓
[Stage Dispatcher] /api/cron/pipeline-tick
   ↓
   ├─ 사이트 × 섹션 매트릭스 조회
   ├─ 각 (사이트, 섹션)에 대해 현재 단계 확인
   └─ 적절한 단계 함수 비동기 호출
        ├─ /api/pipeline/scout
        ├─ /api/pipeline/evaluate
        ├─ /api/pipeline/summarize
        └─ /api/pipeline/generate
```

상세는 `vercel-cron-spec.md`.

---

## 3. ① Scout — 후보 수집

### 3.1 목적

섹션의 출처 풀에서 **새로운 후보 콘텐츠**를 수집해 `ai_scout_queue`에 적재.

### 3.2 트리거

섹션의 `schedule.cronExpression`에 따라. 예:
- `news` 섹션: 매일 18:00 KST
- `tools` 섹션: 월/수/금 19:00 KST  
- `usecases` 섹션: 매일 05:00 KST

### 3.3 흐름

```typescript
// app/api/pipeline/scout/route.ts

export async function POST(req: NextRequest) {
  const { siteId, sectionId } = await req.json()
  
  if (!verifyInternalToken(req)) return unauthorized()
  
  // 1. 사이트 + 섹션 검증
  const site = await getChildSite(siteId)
  const section = site.sections.find((s) => s.sectionId === sectionId)
  if (!section || !section.enabled) return skip('Section disabled')
  
  // 2. 섹션의 출처들 fetch
  const sources = await getActiveSourcesForSection(siteId, sectionId)
  
  // 3. PipelineState 생성
  const runId = `${sectionId}_${Date.now()}`
  const state = await createPipelineState(siteId, sectionId, runId, 'cron')
  
  // 4. 각 출처에서 후보 수집 (병렬)
  const results = await Promise.allSettled(
    sources.map((src) => scoutFromSource(siteId, sectionId, src, runId))
  )
  
  // 5. 결과 집계
  const totalScouted = results.filter((r) => r.status === 'fulfilled').reduce(...)
  const failedSources = results.filter((r) => r.status === 'rejected')
  
  // 6. 출처 헬스 갱신
  for (const [src, result] of zip(sources, results)) {
    await updateSourceHealth(siteId, src.sourceId, result)
  }
  
  // 7. 다음 단계로 (충분한 후보가 모였으면)
  if (totalScouted >= MIN_CANDIDATES_FOR_EVALUATE) {
    await updatePipelineState(state, { 'stages.scout.status': 'success' })
    await triggerEvaluate(siteId, sectionId, runId)
  } else {
    await updatePipelineState(state, { 
      'stages.scout.status': 'failed',
      'stages.scout.error': `Only ${totalScouted} candidates found, need ≥${MIN_CANDIDATES_FOR_EVALUATE}`,
    })
  }
  
  return NextResponse.json({ scouted: totalScouted, failed: failedSources.length })
}
```

### 3.4 출처별 Scout 구현

#### 3.4.1 YouTube 채널

SSOKTUBE의 `lib/youtube.ts` 그대로 재사용.

```typescript
async function scoutYoutubeChannel(
  siteId: string,
  sectionId: string,
  source: Source,
  runId: string,
): Promise<number> {
  const config = source.config as YouTubeChannelConfig
  
  // 1. 최근 N일 영상 list
  const videos = await youtube.search.list({
    channelId: config.channelId,
    publishedAfter: subtract(now, lookbackDays).toISOString(),
    maxResults: 50,
  })
  
  let count = 0
  for (const video of videos) {
    // 2. 길이 필터
    if (config.minDurationSec && video.durationSec < config.minDurationSec) continue
    if (config.maxDurationSec && video.durationSec > config.maxDurationSec) continue
    
    // 3. 중복 체크 (이미 ai_scout_queue 또는 saved_summaries에 있는지)
    const exists = await isDuplicateVideoId(siteId, video.videoId)
    if (exists) continue
    
    // 4. ScoutQueueItem 생성
    await db.collection('sites').doc(siteId).collection('ai_scout_queue').doc(video.videoId).set({
      videoId: video.videoId,
      externalId: video.videoId,
      sourceType: 'youtube',
      sourceId: source.sourceId,
      title: video.title,
      channel: video.channelTitle,
      thumbnail: video.thumbnail,
      url: `https://youtube.com/watch?v=${video.videoId}`,
      publishedAt: Timestamp.fromDate(new Date(video.publishedAt)),
      durationSec: video.durationSec,
      viewCount: video.viewCount,
      sectionId,
      status: 'pending',
      scoutedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(addDays(now, 14)),
    })
    count++
  }
  
  return count
}
```

#### 3.4.2 RSS 피드

```typescript
async function scoutRss(
  siteId: string,
  sectionId: string,
  source: Source,
  runId: string,
): Promise<number> {
  const config = source.config as RssConfig
  const parser = new RSSParser()
  const feed = await parser.parseURL(config.feedUrl)
  
  let count = 0
  for (const item of feed.items.slice(0, 50)) {
    // 정규식 필터
    if (config.filterRegex && !new RegExp(config.filterRegex).test(item.title!)) continue
    if (config.excludeRegex && new RegExp(config.excludeRegex).test(item.title!)) continue
    
    const externalId = `rss_${hashUrl(item.link!)}`
    if (await isDuplicateExternalId(siteId, externalId)) continue
    
    await db.collection('sites').doc(siteId).collection('ai_scout_queue').doc(externalId).set({
      externalId,
      sourceType: 'rss',
      sourceId: source.sourceId,
      title: item.title,
      channel: feed.title,
      url: item.link,
      publishedAt: Timestamp.fromDate(new Date(item.pubDate!)),
      sectionId,
      status: 'pending',
      // ...
    })
    count++
  }
  
  return count
}
```

#### 3.4.3 검색 키워드

```typescript
async function scoutSearchKeyword(
  siteId: string,
  sectionId: string,
  source: Source,
  runId: string,
): Promise<number> {
  const config = source.config as SearchKeywordConfig
  let count = 0
  
  for (const keyword of config.keywords) {
    // Tavily 또는 Perplexity 검색 API
    const results = await searchApi.search({
      query: keyword,
      lang: config.language,
      maxResults: config.maxResultsPerRun || 10,
      timeRange: 'week',
    })
    
    for (const result of results) {
      // 중복 체크 + ScoutQueueItem 생성
      // ...
      count++
    }
  }
  
  return count
}
```

### 3.5 중복 검사 (Dedup)

```typescript
async function isDuplicateExternalId(siteId: string, externalId: string): Promise<boolean> {
  // 1. 같은 사이트의 모든 큐 + 발행된 글에서 검사
  const checks = await Promise.all([
    db.collection('sites').doc(siteId).collection('ai_scout_queue').doc(externalId).get(),
    db.collection('sites').doc(siteId).collection('saved_summaries')
      .where('externalId', '==', externalId).limit(1).get(),
    db.collection('sites').doc(siteId).collection('curated_posts')
      .where('savedSummaryId', '!=', null)
      // 더 정확하게는 saved_summary 거쳐 외래키 비교 — 임베딩으로 대체
      .limit(1).get(),
  ])
  
  return checks[0].exists || !checks[1].empty || !checks[2].empty
}
```

상세 임베딩 기반 중복 검사는 `duplicate-prevention.md`.

### 3.6 출처 헬스 갱신

```typescript
async function updateSourceHealth(siteId: string, sourceId: string, result: PromiseSettledResult) {
  const ref = db.collection('sites').doc(siteId).collection('sources').doc(sourceId)
  
  if (result.status === 'fulfilled') {
    await ref.update({
      'healthStatus.lastCheckAt': serverTimestamp(),
      'healthStatus.lastSuccessAt': serverTimestamp(),
      'healthStatus.consecutiveFailures': 0,
      status: 'active',
    })
  } else {
    const ref_doc = await ref.get()
    const failures = (ref_doc.data()?.healthStatus?.consecutiveFailures || 0) + 1
    
    await ref.update({
      'healthStatus.lastCheckAt': serverTimestamp(),
      'healthStatus.consecutiveFailures': failures,
      status: failures >= 5 ? 'dead' : failures >= 3 ? 'failing' : 'active',
    })
    
    if (failures >= 3) {
      await createAlert({
        severity: failures >= 5 ? 'high' : 'medium',
        category: 'source_dead',
        siteId,
        title: `출처 장애: ${sourceId} (${failures}회 연속 실패)`,
      })
    }
  }
}
```

---

## 4. ② Evaluate — AI 평가

### 4.1 목적

`ai_scout_queue`의 `status='pending'` 후보들을 AI 2~3인이 점수화 → `ai_evaluate_queue`에 적재.

### 4.2 트리거

Scout 단계가 끝난 직후 자동 호출. 또는 매시간 Cron으로 처리되지 않은 큐 처리.

### 4.3 흐름

```typescript
// app/api/pipeline/evaluate/route.ts

export async function POST(req: NextRequest) {
  const { siteId, sectionId, runId } = await req.json()
  
  // 1. pending 후보 fetch (최대 N개)
  const candidates = await db
    .collection('sites').doc(siteId).collection('ai_scout_queue')
    .where('sectionId', '==', sectionId)
    .where('status', '==', 'pending')
    .orderBy('publishedAt', 'desc')
    .limit(MAX_EVALUATE_BATCH)             // 20
    .get()
  
  // 2. 각 후보에 대해 AI 평가
  const evaluations = await Promise.allSettled(
    candidates.docs.map((doc) => evaluateCandidate(siteId, sectionId, doc.data()))
  )
  
  // 3. 결과 저장 + 점수 정렬
  const successResults = evaluations
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<EvalResult>).value)
    .sort((a, b) => b.score - a.score)
  
  // 4. ai_evaluate_queue에 저장
  for (let i = 0; i < successResults.length; i++) {
    const result = successResults[i]
    await db.collection('sites').doc(siteId).collection('ai_evaluate_queue').add({
      ...result,
      rank: i + 1,
      sectionId,
      status: 'pending_summary',
      evaluatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(addDays(now, 14)),
    })
  }
  
  // 5. 원본 ai_scout_queue 업데이트
  for (const doc of candidates.docs) {
    await doc.ref.update({ status: 'evaluated' })
  }
  
  // 6. 다음 단계 트리거
  if (successResults.length > 0) {
    await triggerSummarize(siteId, sectionId, runId)
  }
  
  return NextResponse.json({ evaluated: successResults.length })
}
```

### 4.4 평가 알고리즘

각 후보에 대해 AI 2~3인이 점수화. 평균 또는 최댓값으로 통합.

```typescript
async function evaluateCandidate(
  siteId: string,
  sectionId: string,
  candidate: ScoutQueueItem,
): Promise<EvalResult> {
  const site = await getChildSite(siteId)
  const section = site.sections.find((s) => s.sectionId === sectionId)
  
  // 1. 자막/내용 fetch (있으면)
  let transcript = ''
  if (candidate.sourceType === 'youtube') {
    transcript = await fetchYoutubeTranscript(candidate.videoId!) // 쏙튜브 그대로
  } else if (candidate.sourceType === 'rss') {
    transcript = await fetchArticleContent(candidate.url)
  }
  
  // 2. AI 평가 호출 (2명, 다른 회사)
  const evaluations = await Promise.all([
    aiService.evaluate({
      model: 'gpt-5',
      candidate,
      transcript,
      site,
      section,
    }),
    aiService.evaluate({
      model: 'gemini-pro',
      candidate,
      transcript,
      site,
      section,
    }),
  ])
  
  // 3. 점수 통합 (평균 + flag 합산)
  const score = (evaluations[0].score + evaluations[1].score) / 2
  const allFlags = new Set([...evaluations[0].flags, ...evaluations[1].flags])
  
  return {
    externalId: candidate.externalId,
    score,
    rank: -1,                               // 나중에 정렬
    evaluations,
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 500),
    title: candidate.title,
    channel: candidate.channel,
    thumbnail: candidate.thumbnail,
    url: candidate.url,
  }
}
```

### 4.5 평가자 프롬프트 (요약)

```typescript
const evaluatorPrompt = `
당신은 ${site.persona.name}이 운영하는 매거진의 콘텐츠 큐레이터입니다.
다음 후보 콘텐츠가 ${section.name} 섹션에 적합한지 0~100점으로 평가하세요.

후보:
- 제목: ${candidate.title}
- 출처: ${candidate.channel}
- 발행일: ${candidate.publishedAt}
- 내용 미리보기: ${transcript.slice(0, 1500)}...

평가 기준:
1. 매거진 주제와의 관련성 (40점)
2. 정보의 새로움/유용성 (30점)
3. 작성 가능 여부 (자료 충분한지) (20점)
4. 클릭/읽힘 가능성 (제목/주제) (10점)

다음 flag도 표시:
- 'low_quality': 정보가 빈약하거나 광고성
- 'paywall': 본문 접근 불가
- 'duplicate': 이미 다룬 주제 (의심)
- 'too_old': 정보가 outdated
- 'fake_news': 신뢰성 의심

JSON 응답:
{ "score": 0-100, "reasoning": "...", "flags": [...] }
`
```

상세는 `ai-roles-and-prompts.md`.

---

## 5. ③ Summarize — 심층 요약

### 5.1 목적

평가 1위 후보 1편을 **글 작성에 충분한 정보가 담긴 요약**으로 가공 → `saved_summaries`에 적재.

### 5.2 흐름

```typescript
// app/api/pipeline/summarize/route.ts

export async function POST(req: NextRequest) {
  const { siteId, sectionId, runId } = await req.json()
  
  // 1. 1위 후보 fetch
  const top = await db
    .collection('sites').doc(siteId).collection('ai_evaluate_queue')
    .where('sectionId', '==', sectionId)
    .where('status', '==', 'pending_summary')
    .orderBy('score', 'desc')
    .limit(1)
    .get()
  
  if (top.empty) return skip('No candidates to summarize')
  
  const candidate = top.docs[0].data()
  
  // 2. 추가 메타 fetch (YouTube 댓글 등)
  let extraContext = {}
  if (candidate.sourceType === 'youtube') {
    extraContext = await fetchYoutubeContext(candidate.externalId)
  }
  
  // 3. Summarizer AI 호출
  const summary = await aiService.summarize({
    model: 'claude-sonnet-4-6',           // Summarize는 가벼운 모델로
    candidate,
    extraContext,
    site,
  })
  
  // 4. 임베딩 생성 (중복 검사 + 검색 인덱스용)
  const embedding = await aiService.embed(
    `${summary.contextSummary}\n\n${summary.reportSummary}`,
  )
  
  // 5. 임베딩 기반 중복 검사 (최근 90일)
  const duplicate = await findSimilarSummary(siteId, embedding, 0.85)
  if (duplicate) {
    // 중복 → 스킵, 다음 1위로
    await markCandidateSkipped(top.docs[0].ref, 'duplicate_summary')
    return triggerSummarize(siteId, sectionId, runId)
  }
  
  // 6. saved_summaries에 저장
  const sessionId = `sess_${Date.now()}_${randomString(4)}`
  await db.collection('sites').doc(siteId).collection('saved_summaries').doc(sessionId).set({
    sessionId,
    videoId: candidate.videoId,
    externalId: candidate.externalId,
    title: candidate.title,
    channel: candidate.channel,
    thumbnail: candidate.thumbnail,
    url: candidate.url,
    publishedAt: candidate.publishedAt,
    contextSummary: summary.contextSummary,
    reportSummary: summary.reportSummary,
    category: summary.category,
    topicCluster: summary.topicCluster,
    tags: summary.tags,
    ytCommentsContext: extraContext.ytComments,
    embedding,
    embeddingModel: 'text-embedding-3-large',
    isPublic: site.settings?.curation?.makeSummariesPublic || false,
    postedToMagazine: false,
    sectionId,
    pipelineRunId: runId,
    createdAt: serverTimestamp(),
  })
  
  // 7. ai_evaluate_queue 갱신
  await top.docs[0].ref.update({ status: 'summarized' })
  
  // 8. 다음 단계
  await triggerGenerate(siteId, sectionId, sessionId, runId)
  
  return NextResponse.json({ summarized: sessionId })
}
```

### 5.3 Summarizer 출력 구조

쏙튜브와 동일.

```typescript
interface SummaryResult {
  contextSummary: string                // 핵심 내용 요약 (300~500자)
  reportSummary: string                 // 심층 분석 리포트 (1000~2000자)
  category: string                      // AI 자동 분류
  topicCluster?: string                 // 임베딩 기반 클러스터
  tags: string[]                        // 5~10개
}
```

상세 프롬프트는 `ai-roles-and-prompts.md`.

---

## 6. ④ Generate Post — 글 생성 (3인 체제)

### 6.1 목적

`saved_summaries`의 요약을 입력으로 받아 매거진 글을 생성. **AI 3인 체제(Writer + Verifier + Editor) 통과 후 발행**.

### 6.2 흐름

```typescript
// app/api/pipeline/generate/route.ts

export async function POST(req: NextRequest) {
  const { siteId, sectionId, sessionId, runId } = await req.json()
  
  const summary = await getSavedSummary(siteId, sessionId)
  const site = await getChildSite(siteId)
  const section = site.sections.find((s) => s.sectionId === sectionId)
  
  // === Stage 4-A: Writer ===
  const writerOutput = await aiService.write({
    model: 'claude-opus-4-7',
    summary,
    site,
    section,
    persona: site.persona,
  })
  
  // === Stage 4-B: Verifier ===
  const verifierReport = await aiService.verify({
    model: 'gpt-5',                       // 다른 회사 모델 (cross-check)
    writerOutput,
    summary,
  })
  
  // 가짜 출처 발견 → 정책에 따라 처리
  if (verifierReport.fakeReferenceDetected) {
    return await handleFakeCitation(site, writerOutput, verifierReport, sessionId)
  }
  
  // === Stage 4-C: Editor ===
  const editorOutput = await aiService.edit({
    model: 'claude-opus-4-7',
    writerOutput,
    verifierReport,
    site,
    section,
  })
  
  // === Stage 4-D: 후처리 ===
  
  // 임베딩 (중복 검사 + 검색 인덱스)
  const postEmbedding = await aiService.embed(editorOutput.body)
  
  // 글 단위 중복 검사
  const dupResult = await checkDuplicatePost(siteId, postEmbedding, editorOutput.title)
  
  // SEO 메타 생성 (M11)
  const seo = await generateSeoMeta(editorOutput, site, section)
  
  // 내부 링크 삽입 (M12)
  const linkedBody = await injectInternalLinks(editorOutput.body, siteId)
  
  // 광고 슬롯 마커 삽입 (M11 / monetization)
  const finalBody = injectAdSlotMarkers(linkedBody, site.monetization)
  
  // === Stage 4-E: 저장 ===
  const postId = `${formatDate(now)}_${randomString(6)}`
  const post: CuratedPost = {
    postId,
    title: editorOutput.title,
    subtitle: editorOutput.subtitle,
    slug: editorOutput.slug,
    body: finalBody,
    excerpt: editorOutput.excerpt,
    
    tags: editorOutput.tags,
    topicCluster: summary.topicCluster,
    category: summary.category,
    faq: editorOutput.faq,
    deepDive: editorOutput.deepDive,
    comments: summary.ytCommentsContext ? {
      popularSummary: summary.ytCommentsContext.sentimentSummary,
      // ...
    } : undefined,
    
    sourceType: summary.videoId ? 'youtube' : 'rss',
    savedSummaryId: sessionId,
    
    phase: 'ongoing',
    sectionId,
    
    aiPipeline: {
      writerModel: 'claude-opus-4-7',
      writerOutput: writerOutput.body,
      verifierModel: 'gpt-5',
      verifierReport,
      editorModel: 'claude-opus-4-7',
      editorChanges: editorOutput.changes,
    },
    
    citations: editorOutput.citations,
    citationsVerified: !verifierReport.fakeReferenceDetected,
    
    internalLinks: linkedBody.links,
    
    seo,
    
    adSlots: [],                          // 위치는 본문 내 마커로
    affiliateLinks: [],
    
    status: site.settings?.curation?.autoPublish ? 'published' : 'review_required',
    publishedAt: site.settings?.curation?.autoPublish ? serverTimestamp() : undefined,
    
    publishedTo: {},
    
    embedding: postEmbedding,
    embeddingModel: 'text-embedding-3-large',
    
    stats: { viewCount: 0, likeCount: 0, commentCount: 0, aiCommentCount: 0 },
    
    duplicateCheckResult: dupResult,
    
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'pipeline',
  }
  
  await db.collection('sites').doc(siteId).collection('curated_posts').doc(postId).set(post)
  
  // 6. saved_summary 업데이트 (중복 발행 방지)
  await db.collection('sites').doc(siteId).collection('saved_summaries').doc(sessionId).update({
    postedToMagazine: true,
  })
  
  // 7. autoPublish=true면 즉시 발행
  if (post.status === 'published') {
    await triggerPublish(siteId, postId)
  } else {
    // 검수 큐로 알림
    await createAlert({
      severity: 'low',
      category: 'review_request',
      siteId,
      postId,
      title: `검수 요청: ${post.title}`,
    })
  }
  
  return NextResponse.json({ postId, status: post.status })
}
```

### 6.3 발행 트리거 (Stage 4-F: Publish)

`status='published'`로 저장된 글은 publisher-adapters.md의 `SitePublisher`를 통해 외부 발행.

```typescript
async function triggerPublish(siteId: string, postId: string) {
  const post = await getCuratedPost(siteId, postId)
  const publisher = await getPublisher(siteId)        // factory pattern
  
  try {
    const result = await publisher.publishPost(post)
    
    // 발행 결과 저장
    await db.collection('sites').doc(siteId).collection('curated_posts').doc(postId).update({
      [`publishedTo.${publisher.hostingType}`]: {
        url: result.url,
        publishedAt: result.publishedAt,
        ...(result.metadata?.postId && { postId: result.metadata.postId }),
      },
    })
    
    // 발행 후 부가 작업 (병렬)
    await Promise.allSettled([
      publisher.refreshSeoArtifacts(),
      pingIndexNow(siteId, result.url),
      schedulePostComments(siteId, postId),         // M10 댓글 봇
      createBackupCommit(siteId, post),
      logSuccess(siteId, post),
    ])
    
  } catch (err) {
    if (err instanceof PublishError && err.retriable) {
      await enqueueRetry(siteId, postId, err)
    } else {
      await markPostAsFailed(siteId, postId, err)
      await createAlert({ /* ... */ })
    }
  }
}
```

상세는 `publisher-adapters.md` 9장.

---

## 7. 가짜 출처 처리 (Critical Path)

core.md 6.2 핵심 원칙. 검증자가 가짜 출처 감지 시 정책에 따라 처리.

### 7.1 정책 종류 (`settings/curation.fakeCitationStrategy`)

| 정책 | 동작 |
|------|------|
| `block` | 글 자체를 폐기. 다음 후보로 진행. |
| `convert_to_general` | 가짜 출처 부분을 일반 표현으로 자동 변환. 발행. |
| `flag_only` | 글은 발행하되 운영자에게 high 알림. 검수 큐로. |

기본은 `convert_to_general`.

### 7.2 구현

```typescript
async function handleFakeCitation(
  site: ChildSite,
  writerOutput: WriterOutput,
  verifierReport: VerifierReport,
  sessionId: string,
) {
  const policy = site.settings?.curation?.fakeCitationStrategy || 'convert_to_general'
  
  switch (policy) {
    case 'block':
      // 폐기 후 다음 후보로
      await markSummarySkipped(sessionId, 'fake_citation_blocked')
      await createAlert({
        severity: 'high',
        category: 'fake_citation',
        siteId: site.siteId,
        title: `가짜 출처 차단됨 (${verifierReport.citationVerifications.filter(c => !c.exists).length}개)`,
        context: { sessionId, fakes: verifierReport.citationVerifications.filter(c => !c.exists) },
      })
      return triggerSummarize(site.siteId, sectionId, runId)  // 다음 후보
    
    case 'convert_to_general':
      // Editor에게 가짜 부분 일반화 의뢰
      const cleaned = await aiService.removeFakeCitations({
        body: writerOutput.body,
        fakeCitations: verifierReport.citationVerifications.filter(c => !c.exists),
      })
      writerOutput.body = cleaned.body
      writerOutput.citations = cleaned.citations  // 가짜 제거됨
      // 다시 Editor 단계로 진입 (재귀 방지: 1회만)
      break
    
    case 'flag_only':
      // 발행은 진행, 단 status='review_required' 강제
      // (autoPublish=true여도 우선 검수 큐로)
      writerOutput.forceReviewRequired = true
      await createAlert({
        severity: 'medium',
        category: 'fake_citation',
        siteId: site.siteId,
        title: `가짜 출처 의심: 검수 요청`,
      })
      break
  }
}
```

상세 검증자 알고리즘은 `ai-roles-and-prompts.md`.

---

## 8. PipelineState 추적

각 (사이트, 섹션, 단계)의 상태를 `ai_pipeline_state`에 기록. 디버깅 + 재시작 + 모니터링.

### 8.1 상태 전이 다이어그램

```
       ┌─────────┐
       │ pending │  (생성 직후)
       └────┬────┘
            ▼
       ┌─────────┐
       │ scout   │ ← 시작
       └────┬────┘
            │ success → 다음 단계
            │ failed  → status='failed'
            ▼
       ┌─────────┐
       │ evaluate│
       └────┬────┘
            ▼
       ┌─────────┐
       │summarize│
       └────┬────┘
            ▼
       ┌─────────┐
       │ generate│
       └────┬────┘
            ▼
       ┌──────────┐
       │ published│ 또는 'review_required'
       └──────────┘
```

### 8.2 PipelineState UI 표시

`/sites/{id}/queue` 페이지의 칸반 보드(meta-control-spec.md [5])는 이 컬렉션을 실시간 구독.

---

## 9. 단계별 실패 처리

| 단계 | 일시 실패 | 영구 실패 |
|------|----------|----------|
| Scout | 출처 1개 다운 → 다른 출처 계속 | 모든 출처 실패 → `magazine_logs`에 'skipped', 다음 사이클 |
| Evaluate | AI 1명 다운 → 1명만 평가 | 모두 다운 → 후보 점수 0, 자동 미발행 |
| Summarize | AI 일시 다운 → 5분 후 재시도 | 3회 실패 → `magazine_logs`에 기록, 다음 1위 |
| Generate | Writer 실패 → 폴백 모델 | 3회 실패 → 운영자 high 알림 |
| Verifier | 응답 누락 → Generate 통과로 처리 (관용) | 3회 누락 → 운영자 medium 알림 |
| Publish | 어댑터 retriable=true → `failed_jobs` 큐 | 5회 실패 → 영구 실패 + critical 알림 |

상세는 `monitoring-health.md`.

---

## 10. 섹션별 출처 편중 방지

### 10.1 문제

특정 출처에서만 후보가 1위가 되면 사이트가 한 출처 의존이 됨.

### 10.2 해결: 출처 가중치 동적 조정

```typescript
async function adjustSourceWeights(siteId: string) {
  const sources = await getSourcesForSite(siteId)
  
  // 최근 7일 동안 각 출처가 몇 번 1위 됐는지
  const recentUseCount = await getRecentUseCount(siteId, 7)
  
  for (const source of sources) {
    const used = recentUseCount[source.sourceId] || 0
    const total = sum(Object.values(recentUseCount))
    const ratio = total > 0 ? used / total : 0
    
    // 한 출처가 30% 넘으면 가중치 낮춤
    let weight = 1.0
    if (ratio > 0.3) weight = 0.5
    if (ratio > 0.5) weight = 0.2
    
    await updateSource(siteId, source.sourceId, { weight })
  }
}
```

매주 일요일 자정 Cron으로 실행. 가중치는 Evaluate 단계 점수에 곱해져 1위 결정에 영향.

---

## 11. SSOKTUBE 코드 매핑

### 11.1 어디를 그대로 가져올 것인가

| SSOKTUBE 파일 | 메타 위치 | 변경 |
|---------------|----------|------|
| `lib/youtube.ts` | `lib/sources/youtube.ts` | 그대로 |
| `lib/scout.ts` | `lib/pipeline/scout.ts` | siteId/sectionId 추가 |
| `lib/evaluate.ts` | `lib/pipeline/evaluate.ts` | 다중 모델 평가로 확장 |
| `lib/summarize.ts` | `lib/pipeline/summarize.ts` | 그대로 + 임베딩 추가 |
| `lib/generate.ts` | `lib/pipeline/generate.ts` | 3인 체제 통합 |
| `lib/tistory.ts` | `lib/publishers/tistory-publisher.ts` | 어댑터 클래스로 |
| `lib/blogger.ts` | `lib/publishers/blogger-publisher.ts` | 어댑터 클래스로 |
| `lib/magazineHtml.ts` | `lib/publishers/magazine-html.ts` | 그대로 + target 옵션 |

### 11.2 Cron 라우트 매핑

```
SSOKTUBE                              메타사이트
/api/cron/scout-evaluate         →   /api/pipeline/scout + /api/pipeline/evaluate
/api/cron/auto-summarize         →   /api/pipeline/summarize
/api/cron/curate-magazine        →   /api/pipeline/generate
                                 +   /api/cron/pipeline-tick (디스패처)
```

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ Phase 2의 정의 + Phase 1과의 차이
- ✅ 4단계 파이프라인 개관 + 트리거 패턴
- ✅ Scout: YouTube/RSS/검색 키워드 출처별 구현
- ✅ Scout: 출처 헬스 갱신 + 자동 비활성화
- ✅ Scout: Dedup 정책
- ✅ Evaluate: AI 2~3인 평가 + flag 시스템
- ✅ Summarize: 임베딩 기반 중복 차단
- ✅ Generate: 3인 체제 (Writer/Verifier/Editor) 통합 흐름
- ✅ Generate: 가짜 출처 정책 3종 (block/convert/flag)
- ✅ Publish: 어댑터 호출 + 발행 후 부가 작업
- ✅ PipelineState 추적
- ✅ 단계별 실패 처리 매트릭스
- ✅ 출처 편중 방지 (가중치 동적 조정)
- ✅ SSOKTUBE 코드 매핑 표

이 문서가 정의하지 않은 것:
- ❌ Writer/Verifier/Editor의 구체 프롬프트 → `ai-roles-and-prompts.md`
- ❌ AI 댓글 시간 분산 알고리즘 → `ai-comment-system.md`
- ❌ SEO 메타/JSON-LD 생성 → `seo-automation.md`
- ❌ 내부 링크 매칭 알고리즘 → `internal-linking.md`
- ❌ 임베딩 기반 중복 검사 임계값 결정 → `duplicate-prevention.md`
- ❌ Vercel Cron 동적 등록 → `vercel-cron-spec.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / authority-building.md / database-schema.md / publisher-adapters.md v1.0 기준. |

---

*이 문서는 Phase 2 정기 발행 파이프라인의 단일 출처다. SSOKTUBE의 검증된 4단계를 자식 사이트별 네임스페이스로 확장한 형태.*

*다음 문서: `ai-roles-and-prompts.md` (Tier C 3번)*
