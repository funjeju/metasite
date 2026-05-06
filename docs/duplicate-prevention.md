# META-SITE: 중복 방지 시스템 (duplicate-prevention.md)

> 자식 사이트의 콘텐츠 중복을 4단계 레벨에서 차단하는 시스템.
> 임베딩 코사인 유사도 + 시간 윈도우 + 재생성 vs 스킵 결정.
> core.md "9. 중복 방지" + content-pipeline.md / authority-building.md / internal-linking.md에서 참조된 중복 검사의 구체 구현.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ monitoring-health.md       (모니터링)
  └─ duplicate-prevention.md    ★ 이 문서 — 중복 방지
        └─ search-and-email.md       (다음)
```

이 문서는:
- 4레벨 중복 검사 (외부 ID / 요약 / 글 / 청크)
- 임베딩 모델 선택과 코사인 유사도 임계값
- 재생성 vs 스킵 정책 + 운영자 개입 시점
- 시간 윈도우 정책 (90일 vs 영구)
- 비용 추정 + 최적화

---

## 1. 핵심 원칙

### 1.1 왜 중복 방지가 SEO의 생명줄인가

> **"같은 주제 글 2편은 SEO에서 둘 다 망친다."**

검색엔진 관점:
- 같은 주제 다중 페이지 → 어느 페이지를 권위로 인정할지 헷갈림
- "Cannibalization" — 두 페이지가 같은 검색어 경쟁
- 자동 생성 사이트는 특히 **중복 = 패널티 신호**

사용자 관점:
- "이 사이트 별 거 없네, 같은 글만"
- 권위 그물의 의미 약화
- 체류 시간 / 페이지뷰 감소

### 1.2 4단계 중복 검사

```
[L1] 외부 ID 검사 (Scout 단계)
   같은 YouTube videoId / 같은 RSS URL → 즉시 폐기
   → 가장 가벼움, 가장 빈번

[L2] 요약 임베딩 검사 (Summarize 단계)
   같은 내용을 다른 출처가 다룸 → 한 번만 발행
   → 임베딩 1회

[L3] 글 임베딩 검사 (Generate 후, 발행 전)
   AI가 비슷한 결론에 도달 → 재생성 또는 스킵
   → 임베딩 1회

[L4] 청크 단위 검사 (긴 글, 선택)
   글 일부분이 기존 글과 너무 유사 → 그 부분만 재작성
   → 임베딩 N회 (글당)
```

### 1.3 시간 윈도우

```
L1 (외부 ID):    영구 (한 번 다룬 영상 다시 안 다룸)
L2 (요약):       90일 (그 후엔 새 관점 OK)
L3 (글):         90일 (3개월 후 같은 주제 갱신 글은 OK)
L4 (청크):       30일 (단기 중복만)
```

기존 글이 archived 상태면 검사에서 제외 (재발행 OK).

---

## 2. 임베딩 모델

### 2.1 선택과 트레이드오프

| 모델 | 차원 | 비용 (1M 토큰) | 정확도 | 메타사이트 사용처 |
|------|-----|---------------|--------|------------------|
| `text-embedding-3-large` (OpenAI) | 3072 | $0.13 | 최고 | **기본** (Generate 단계 글 임베딩) |
| `text-embedding-3-small` (OpenAI) | 1536 | $0.02 | 좋음 | 가벼운 검사 (Summarize, 검색 인덱스) |
| `voyage-3` (Voyage) | 1024 | $0.18 | 매우 좋음 | 폴백 |
| `embed-multilingual-v3` (Cohere) | 1024 | $0.10 | 다국어 강함 | 한국어/영어 혼합 사이트 |

### 2.2 사이트 언어별 권장

```typescript
function getEmbeddingModel(language: string, useCase: string): string {
  if (language === 'ko' && useCase === 'precision') {
    return 'embed-multilingual-v3'        // 한국어 정확도 좋음
  }
  if (useCase === 'lightweight') {
    return 'text-embedding-3-small'        // 비용 절감
  }
  return 'text-embedding-3-large'          // 기본 — 최고 정확도
}
```

### 2.3 임베딩 캐싱

> **"한 번 생성한 임베딩은 영구 저장. 절대 재계산하지 않는다."**

저장 위치:
- `saved_summaries.embedding` — 요약 임베딩
- `curated_posts.embedding` — 글 임베딩
- `search_index/{idx_postId}.embedding` — 검색용 (글과 동일 또는 청크 분할)

비용:
- 글 1편 임베딩 ≈ 5,000 토큰 ≈ $0.0007 (large 모델)
- 자식 사이트 6개 × 일 18편 ≈ $0.07/일 ≈ $2/월

매우 저렴. 비용 걱정 없이 모든 글에 임베딩 부여.

---

## 3. L1 — 외부 ID 검사 (Scout 단계)

### 3.1 가장 빠르고 단순한 검사

content-pipeline.md 3.5의 `isDuplicateExternalId` 그대로:

```typescript
async function isDuplicateExternalId(siteId: string, externalId: string): Promise<boolean> {
  const checks = await Promise.all([
    // 1. 같은 사이트의 ai_scout_queue
    db.collection('sites').doc(siteId).collection('ai_scout_queue').doc(externalId).get(),
    
    // 2. 이미 요약된 건 (saved_summaries)
    db.collection('sites').doc(siteId).collection('saved_summaries')
      .where('externalId', '==', externalId).limit(1).get(),
    
    // 3. 이미 발행된 건 (curated_posts → savedSummaryId 통해 join 효과)
    db.collection('sites').doc(siteId).collection('curated_posts')
      .where('savedSummaryId', '!=', null)
      .limit(1).get(),
  ])
  
  return checks[0].exists || !checks[1].empty || !checks[2].empty
}
```

### 3.2 cross-site 중복 (선택)

같은 영상을 ai-kr과 ai-en이 모두 다룰 수 있나?

> **"기본은 사이트별 독립."** 같은 영상이라도 ai-kr(한국어)과 ai-en(영어)이 둘 다 다뤄도 됨 (다른 시장).

단 같은 언어 사이트 간 중복은 차단:

```typescript
async function isCrossSiteDuplicate(
  externalId: string,
  language: string,
  excludeSiteId: string,
): Promise<boolean> {
  const sameLangSites = await db.collection('child_sites')
    .where('language', '==', language)
    .get()
  
  for (const doc of sameLangSites.docs) {
    if (doc.id === excludeSiteId) continue
    
    const exists = await isDuplicateExternalId(doc.id, externalId)
    if (exists) return true
  }
  
  return false
}
```

운영자가 정책 켜고 끌 수 있음 (`settings/curation.crossSiteDedup`).

### 3.3 URL 정규화

같은 콘텐츠가 다른 URL일 수 있음 (utm 파라미터, 트래킹 코드).

```typescript
function normalizeUrl(url: string): string {
  const u = new URL(url)
  
  // 1. 트래킹 파라미터 제거
  const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
  for (const param of trackingParams) {
    u.searchParams.delete(param)
  }
  
  // 2. 도메인 소문자 + 끝 슬래시 정리
  u.hostname = u.hostname.toLowerCase()
  if (u.pathname.endsWith('/') && u.pathname.length > 1) {
    u.pathname = u.pathname.slice(0, -1)
  }
  
  // 3. www. 통일
  if (u.hostname.startsWith('www.')) {
    u.hostname = u.hostname.slice(4)
  }
  
  return u.toString()
}

// 정규화한 URL의 hash를 externalId로
function urlToExternalId(url: string): string {
  const normalized = normalizeUrl(url)
  return `url_${sha256(normalized).slice(0, 16)}`
}
```

---

## 4. L2 — 요약 임베딩 검사 (Summarize 단계)

### 4.1 시나리오

```
출처 A: TechCrunch RSS — "OpenAI o5 출시"
출처 B: YouTube 영상 — "OpenAI o5 review and analysis"

같은 사건 보도. 다른 외부 ID. 그러나 같은 글이 됨.
→ 첫 번째만 발행, 두 번째는 스킵.
```

### 4.2 임베딩 매칭

content-pipeline.md 5.2 `findSimilarSummary` 상세:

```typescript
// lib/duplicate-prevention/summary-similarity.ts

export async function findSimilarSummary(
  siteId: string,
  newEmbedding: number[],
  threshold: number = 0.85,           // 코사인 유사도 임계값
): Promise<SavedSummary | null> {
  
  // 최근 90일의 요약들 fetch
  const since = subtract(now, days(90))
  const recentSummaries = await db
    .collection('sites').doc(siteId).collection('saved_summaries')
    .where('createdAt', '>=', since)
    .get()
  
  // 임베딩 비교 (Firestore는 vector search 제한적 → 클라이언트 비교)
  let best: { summary: SavedSummary; similarity: number } | null = null
  
  for (const doc of recentSummaries.docs) {
    const summary = doc.data() as SavedSummary
    if (!summary.embedding) continue
    
    const similarity = cosineSimilarity(newEmbedding, summary.embedding)
    
    if (similarity >= threshold) {
      if (!best || similarity > best.similarity) {
        best = { summary, similarity }
      }
    }
  }
  
  return best?.summary || null
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

### 4.3 임계값 결정

```
0.95+   거의 동일 (같은 출처 또는 매우 유사한 사건)
0.85~0.95  같은 토픽 (다른 각도지만 본질 같음)
0.75~0.85  관련 토픽 (다룰 가치 다름)
<0.75   다른 토픽
```

기본 임계값: **0.85**. 운영자가 `settings/curation.duplicateThreshold`로 조정.

| 임계값 | 효과 |
|--------|------|
| 0.95 | 거의 안 막음 (느슨) |
| 0.90 | 적당 (느슨) |
| 0.85 | **권장** (균형) |
| 0.80 | 엄격 (자주 스킵) |
| 0.75 | 매우 엄격 (놓치는 글 많음) |

### 4.4 중복 발견 시 동작

```typescript
async function handleDuplicateInSummarize(
  siteId: string,
  candidate: EvaluateQueueItem,
  duplicate: SavedSummary,
) {
  // 1. ai_evaluate_queue 갱신
  await db.collection('sites').doc(siteId).collection('ai_evaluate_queue')
    .doc(candidate.externalId).update({ status: 'skipped' })
  
  // 2. magazine_logs에 기록
  await db.collection('sites').doc(siteId).collection('magazine_logs').add({
    status: 'skipped',
    triggerType: 'cron',
    stage: 'summarize',
    metadata: {
      reason: 'duplicate_summary',
      candidateId: candidate.externalId,
      duplicateId: duplicate.sessionId,
      similarity: cosineSimilarity(candidate.embedding, duplicate.embedding),
    },
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(addDays(now, 60)),
  })
  
  // 3. 다음 1위 후보로 진행
  await triggerSummarize(siteId, candidate.sectionId, runId)
}
```

알림은 안 보냄 (정상 동작). magazine_logs에서만 추적.

---

## 5. L3 — 글 임베딩 검사 (Generate 후, 발행 전)

### 5.1 왜 글 단계에서도 검사하나

L2에서 요약 단계에서 막았는데 왜 또?

> **"AI가 작성하면서 결과적으로 비슷한 글이 될 수 있다."**

시나리오:
- 출처 A: "Claude의 새 기능"
- 출처 B: "GPT-5의 새 기능"
- 두 출처는 다름 (요약 임베딩 0.6) → L2 통과
- 그러나 작성 결과: 둘 다 "AI 모델 진화"라는 일반론으로 흘러감 → L3에서 막음

L3 임계값은 더 엄격: **0.90**. 글 자체가 매우 비슷하면 막음.

### 5.2 검사 시점

```typescript
// content-pipeline.md 6.2의 Generate 단계 후
async function checkDuplicatePost(
  siteId: string,
  postEmbedding: number[],
  title: string,
  threshold: number = 0.90,
): Promise<DuplicateCheckResult> {
  
  const since = subtract(now, days(90))
  const recentPosts = await db
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('status', '==', 'published')
    .where('createdAt', '>=', since)
    .get()
  
  const matches: { postId: string; similarity: number; title: string }[] = []
  
  for (const doc of recentPosts.docs) {
    const data = doc.data() as CuratedPost
    if (!data.embedding) continue
    
    const similarity = cosineSimilarity(postEmbedding, data.embedding)
    
    if (similarity >= threshold) {
      matches.push({
        postId: data.postId,
        similarity,
        title: data.title,
      })
    }
  }
  
  matches.sort((a, b) => b.similarity - a.similarity)
  
  if (matches.length === 0) {
    return { decision: 'pass', maxSimilarity: 0, similarPostIds: [] }
  }
  
  // 최고 유사도 + 정책에 따라 처리
  const max = matches[0].similarity
  const policy = await getDuplicatePolicy(siteId)
  
  return {
    decision: applyDuplicatePolicy(max, policy),
    maxSimilarity: max,
    similarPostIds: matches.map((m) => m.postId).slice(0, 5),
    matches,
  }
}
```

### 5.3 정책 종류

```typescript
type DuplicatePolicy = 
  | 'block_strict'        // 0.85+ 무조건 폐기
  | 'block_strict_then_regenerate'  // 0.85+ 1회 재생성, 또 중복이면 폐기
  | 'allow_with_flag'     // 0.85+ 발행하되 운영자에 알림
  | 'allow_silent'        // 차단 안 함 (위험)

function applyDuplicatePolicy(similarity: number, policy: DuplicatePolicy): Decision {
  if (similarity < 0.85) return 'pass'
  
  switch (policy) {
    case 'block_strict':
      return 'skipped'                    // 즉시 폐기
    
    case 'block_strict_then_regenerate':
      return 'regenerated'                // 1회 재생성
    
    case 'allow_with_flag':
      return 'pass'                        // 발행하되 알림
    
    case 'allow_silent':
      return 'pass'                        // 무시
  }
}
```

기본은 `block_strict_then_regenerate`. 운영자가 `settings/curation.duplicatePolicy`로 변경.

### 5.4 재생성 흐름

```typescript
async function regeneratePost(
  siteId: string,
  originalSavedSummaryId: string,
  duplicateMatches: { postId: string; title: string }[],
): Promise<CuratedPost | null> {
  
  // Writer에게 차별화 힌트와 함께 재호출
  const summary = await getSavedSummary(siteId, originalSavedSummaryId)
  const site = await getChildSite(siteId)
  
  const writerOutput = await aiService.write({
    model: 'claude-opus-4-7',
    summary,
    site,
    additionalContext: {
      avoidSimilarTo: duplicateMatches.map((m) => m.title),
      diversificationHint: `다음 기존 글들과 매우 비슷한 결론으로 가지 마세요. 새로운 각도/관점/디테일을 찾아주세요:
${duplicateMatches.map((m) => `- ${m.title}`).join('\n')}`,
    },
  })
  
  // Verifier + Editor + 다시 임베딩 + 다시 검사
  const verifierReport = await aiService.verify({ writerOutput })
  const editorOutput = await aiService.edit({ writerOutput, verifierReport })
  const newEmbedding = await aiService.embed(editorOutput.body)
  
  const recheck = await checkDuplicatePost(siteId, newEmbedding, editorOutput.title, 0.90)
  
  if (recheck.decision === 'pass') {
    // 재생성 성공 → curated_posts 저장
    return await saveAsCuratedPost(editorOutput, { ... })
  } else {
    // 재생성도 중복 → 폐기 + 알림
    await createAlert({
      severity: 'medium',
      category: 'review_request',
      siteId,
      title: `재생성 후에도 중복: ${editorOutput.title}`,
      message: `2회 시도했지만 모두 기존 글과 유사도 ${(recheck.maxSimilarity * 100).toFixed(0)}%`,
      context: { duplicates: recheck.matches },
    })
    return null
  }
}
```

### 5.5 결과 영구 보존

`curated_posts.duplicateCheckResult`에 결과 저장:

```typescript
{
  duplicateCheckResult: {
    maxSimilarity: 0.92,
    similarPostIds: ['20260420_x7y8', '20260415_a3b4'],
    decision: 'regenerated',           // 또는 'pass' / 'skipped'
  }
}
```

운영자가 글 검수 페이지(meta-control-spec.md [15])에서 사이드패널에 표시:
```
중복 검사
─────────
최대 유사도: 92% (재생성됨)
유사 글: 'OpenAI o5 출시 정리' (4월 20일)
```

---

## 6. L4 — 청크 단위 검사 (선택, 긴 글)

### 6.1 왜 청크인가

긴 글(3000단어+)은 전체 임베딩이 평균화되어 부분 중복을 놓침.

```
글 A: 5000단어 — AI 도구 비교 (Notion AI 부분 1500단어 깊이)
글 B (새 글): 4000단어 — Notion AI 단독 리뷰 (1800단어)

전체 임베딩 유사도: 0.78 (다른 토픽)
그러나 Notion AI 부분만 비교: 0.94 (거의 같은 내용)
```

L4는 이런 부분 중복을 잡음.

### 6.2 청크 분할

```typescript
function chunkPost(body: string, chunkSize: number = 800): string[] {
  // 단락 단위로 분할 시작
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0)
  
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = para
    } else {
      currentChunk += '\n\n' + para
    }
  }
  if (currentChunk) chunks.push(currentChunk)
  
  return chunks
}
```

각 청크를 별도 임베딩 → `search_index.chunks[]`에 저장.

### 6.3 청크 단위 매칭

```typescript
async function checkChunkDuplicates(
  siteId: string,
  newPost: CuratedPost,
  threshold: number = 0.92,
): Promise<ChunkDuplicate[]> {
  
  const newChunks = chunkPost(newPost.body)
  const newEmbeddings = await Promise.all(
    newChunks.map((c) => aiService.embed(c))
  )
  
  // 최근 30일 글의 청크들 fetch
  const since = subtract(now, days(30))
  const recentSearchIndices = await db
    .collection('sites').doc(siteId).collection('search_index')
    .where('updatedAt', '>=', since)
    .get()
  
  const duplicates: ChunkDuplicate[] = []
  
  for (let i = 0; i < newChunks.length; i++) {
    for (const doc of recentSearchIndices.docs) {
      const existing = doc.data()
      if (!existing.chunks) continue
      
      for (const existingChunk of existing.chunks) {
        const similarity = cosineSimilarity(newEmbeddings[i], existingChunk.embedding)
        if (similarity >= threshold) {
          duplicates.push({
            newChunkIndex: i,
            newChunkText: newChunks[i],
            existingPostId: existing.postId,
            existingChunkText: existingChunk.text,
            similarity,
          })
        }
      }
    }
  }
  
  return duplicates
}
```

### 6.4 청크 중복 발견 시 동작

부분 재작성:

```typescript
async function rewriteDuplicateChunks(
  post: CuratedPost,
  duplicates: ChunkDuplicate[],
): Promise<CuratedPost> {
  
  if (duplicates.length === 0) return post
  
  // AI에게 해당 청크만 다시 쓰도록 요청
  const rewritten = await aiService.call({
    role: 'editor',
    model: 'claude-opus-4-7',
    prompt: `다음 글의 일부 단락이 기존 다른 글과 너무 유사합니다.
해당 단락을 다른 각도로 다시 써주세요:

원본 글 (전체):
${post.body}

다시 써야 할 단락 (${duplicates.length}개):
${duplicates.map((d, i) => `[${i+1}] ${d.newChunkText}`).join('\n\n')}

기존 유사 글:
${duplicates.map((d, i) => `[${i+1}] (${d.existingPostId}): ${d.existingChunkText}`).join('\n\n')}

응답 형식: 다시 작성된 새 글 전체를 마크다운으로.`,
    expectJson: false,
  })
  
  return { ...post, body: rewritten.text }
}
```

### 6.5 L4는 옵션

- **기본 비활성** (비용 큼)
- 운영자가 `settings/curation.chunkDedupEnabled = true` 켜면 활성
- 활성 시: 글당 임베딩 5~10회 추가 = $0.01/글 추가
- 효과: 부분 표절/중복 거의 완전 차단

---

## 7. 특수 케이스

### 7.1 Phase 1 권위 글 vs Phase 2 일반 글

권위 글과 일반 글이 같은 토픽일 수 있음 (예: 권위 글 "AI란 무엇인가" + 일반 글 "OpenAI o5 출시 — AI의 새 시대").

> **"권위 글이 우선. 일반 글이 권위 글로 흡수되지 않도록 주의."**

```typescript
async function checkAuthorityOverlap(
  siteId: string,
  newPost: CuratedPost,
): Promise<{ authorityPostId: string; similarity: number } | null> {
  
  if (newPost.phase === 'authority') return null  // 권위 글이면 검사 X
  
  // 권위 글들과만 비교 (낮은 임계값)
  const authorityPosts = await db
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('phase', '==', 'authority')
    .where('status', '==', 'published')
    .get()
  
  let best: { postId: string; similarity: number } | null = null
  
  for (const doc of authorityPosts.docs) {
    const data = doc.data() as CuratedPost
    if (!data.embedding) continue
    
    const similarity = cosineSimilarity(newPost.embedding!, data.embedding)
    if (similarity >= 0.80) {                        // 더 낮은 임계값
      if (!best || similarity > best.similarity) {
        best = { postId: data.postId, similarity }
      }
    }
  }
  
  if (best) {
    // 권위 글과 너무 유사 → 일반 글 발행하되 강제로 권위 글로 링크
    // 또는 권위 글 "관련 최신 소식"으로 노출
    await ensureAuthorityLink(newPost, best.postId)
  }
  
  return best
}
```

### 7.2 v1 outline → v2 outline 글 매칭

authority-building.md 8.2의 v2 생성 시 v1 글 재활용. 임베딩 기반 매칭:

```typescript
async function findMatchingV1Article(
  v2Article: AuthorityArticle,
  v1: AuthorityOutline,
  threshold: number = 0.85,
): Promise<AuthorityArticle | null> {
  
  if (!v2Article.targetKeyword) return null
  
  // v2 글의 가상 임베딩 (제목 + 키워드)
  const v2Embedding = await aiService.embed(
    `${v2Article.title}\n${v2Article.targetKeyword}\n${(v2Article.aliases || []).join(', ')}`,
    'lightweight',                              // small 모델
  )
  
  let best: { article: AuthorityArticle; similarity: number } | null = null
  
  for (const tier of v1.tiers) {
    for (const v1Article of tier.articles) {
      if (!v1Article.curatedPostId) continue    // 발행된 것만
      
      // v1 글의 실제 임베딩
      const v1Post = await getCuratedPost(v1.siteId, v1Article.curatedPostId)
      if (!v1Post.embedding) continue
      
      const similarity = cosineSimilarity(v2Embedding, v1Post.embedding)
      if (similarity >= threshold) {
        if (!best || similarity > best.similarity) {
          best = { article: v1Article, similarity }
        }
      }
    }
  }
  
  return best?.article || null
}
```

매칭되면 v2 글을 새로 안 만들고 v1 글 재활용. 슬러그 다르면 redirect.

### 7.3 cross-language siblings (hreflang)

seo-automation.md 10.1의 같은 토픽 다른 언어 매칭. 임계값 0.85+, multilingual 임베딩 사용.

```typescript
async function findCrossLanguageSiblings(
  post: CuratedPost,
): Promise<{ siteId: string; postId: string; similarity: number }[]> {
  
  const otherSites = await getOtherLanguageSites(post.siteId)
  const siblings: any[] = []
  
  for (const otherSite of otherSites) {
    // topicCluster 같은 글들만 후보로
    const candidates = await db
      .collection('sites').doc(otherSite.siteId).collection('curated_posts')
      .where('topicCluster', '==', post.topicCluster)
      .where('status', '==', 'published')
      .limit(20)
      .get()
    
    for (const doc of candidates.docs) {
      const candidate = doc.data() as CuratedPost
      if (!candidate.embedding) continue
      
      // multilingual 모델로 비교
      const similarity = cosineSimilarity(post.embedding!, candidate.embedding)
      
      if (similarity >= 0.85) {
        siblings.push({
          siteId: otherSite.siteId,
          postId: candidate.postId,
          similarity,
        })
      }
    }
  }
  
  return siblings
}
```

> **주의:** 같은 모델로 만든 임베딩만 비교 가능. 한국어/영어 사이트 모두 `embed-multilingual-v3` 사용해야 cross-language 비교 가능.

---

## 8. 임베딩 백필 (마이그레이션)

### 8.1 시나리오

쏙튜브에서 메타사이트로 마이그레이션 시 기존 글 수백 편이 임베딩 없이 들어옴. 백필 필요.

### 8.2 백필 흐름

```typescript
// app/api/cron/embedding-backfill/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  // 임베딩 없는 글 fetch (사이트별)
  const sites = await getActiveChildSites()
  
  for (const site of sites) {
    const missingEmbedding = await db
      .collection('sites').doc(site.siteId).collection('curated_posts')
      .where('status', '==', 'published')
      .where('embedding', '==', null)
      .limit(20)                          // 한 번에 20편
      .get()
    
    if (missingEmbedding.empty) continue
    
    // 병렬 임베딩 (rate limit 주의)
    const embeddings = await Promise.allSettled(
      missingEmbedding.docs.map((doc) => 
        aiService.embed(doc.data().body)
      )
    )
    
    // Firestore 갱신
    for (let i = 0; i < missingEmbedding.docs.length; i++) {
      const result = embeddings[i]
      if (result.status === 'fulfilled') {
        await missingEmbedding.docs[i].ref.update({
          embedding: result.value,
          embeddingModel: 'text-embedding-3-large',
        })
      }
    }
  }
  
  return NextResponse.json({ ok: true })
}
```

매시간 Cron으로 점진 백필. 한 번에 다 안 함 (비용 + rate limit).

### 8.3 진행 상황 표시

`/sites/{id}` 사이트 개요에:

```
임베딩 상태: 1,142 / 1,247 (91%)
   백필 진행 중 — 105편 남음
```

---

## 9. Firestore 한계와 vector DB 검토

### 9.1 Firestore의 한계

Firestore는 vector search 네이티브 지원이 제한적. 현재 구현은:
- 모든 후보 fetch (최근 90일)
- 클라이언트 측 코사인 유사도 계산

문제:
- 글 1,000편 이상 사이트 → fetch 비용 + 시간 증가
- 메모리 사용 (1,000 × 3072 차원 = 12MB+)

### 9.2 한계점

```
사이트 글 수 → 검사 시간:
  100편: ~200ms
  500편: ~800ms
  1,000편: ~1.5s
  5,000편: ~7s (Firestore 한계)
```

### 9.3 vector DB 마이그레이션 시점

**자식 사이트 1편당 누적 1,000편 + 사이트 5개 이상** = 약 5,000편 임베딩 → vector DB 검토.

옵션:
- **Pinecone** — 가장 성숙. 월 $70~/사이트당 별도. 
- **Vertex AI Vector Search** — Firebase 친화. GCP 통합.
- **Weaviate** — 오픈소스. 자체 호스팅 가능.

### 9.4 마이그레이션 추상화

처음부터 검색 추상화 레이어 만들어두기:

```typescript
// lib/vector-search/interface.ts

export interface VectorSearchProvider {
  upsert(siteId: string, postId: string, embedding: number[], metadata: any): Promise<void>
  search(siteId: string, queryEmbedding: number[], topK: number, filters?: any): Promise<SearchResult[]>
  delete(siteId: string, postId: string): Promise<void>
}

// 초기 구현: Firestore 기반
export class FirestoreVectorSearch implements VectorSearchProvider { /* ... */ }

// 미래 마이그레이션: Pinecone
export class PineconeVectorSearch implements VectorSearchProvider { /* ... */ }
```

코드는 인터페이스만 사용. 마이그레이션 시 `factory.ts`만 변경.

---

## 10. 비용 추정

### 10.1 임베딩 비용 (월간)

```
자식 사이트 6개 × 일 18편 발행 = 540편/월

Generate 단계 글 임베딩:
  540 × 5,000 토큰 × $0.13 / 1M = $0.35

L2 요약 임베딩 (saved_summaries):
  540 × 2,000 토큰 × $0.13 / 1M = $0.14

L1 검사: 임베딩 X (URL 비교만)

L4 청크 (옵션):
  540 × 8 청크 × 800 토큰 × $0.13 / 1M = $0.45 (활성 시만)

월 총 임베딩 비용: ~$1 (L4 비활성) / ~$1.5 (L4 활성)
```

### 10.2 Firestore 읽기 비용

```
중복 검사당 fetch:
  L2: 90일 saved_summaries ~50편 = 50 reads
  L3: 90일 curated_posts ~150편 = 150 reads
  L4: search_index ~150 = 150 reads (활성 시)

발행당 검사 횟수: L2 + L3 + L4 = 350 reads
540편/월 × 350 = 189k reads/월

비용: 189k × $0.06 / 100k = $0.11
```

전체 중복 방지 비용: 월 약 **$1~2**. 매우 저렴.

### 10.3 vector DB 마이그레이션 후 비용

Pinecone Pro ~$70/월 시작점. 이후 사용량 따라.
검색 성능 개선 + 비용 증가 트레이드오프.

---

## 11. 모니터링

### 11.1 monitoring-health.md L4 통합

```typescript
// L4 데이터 일관성 체크에 추가
async function checkDuplicateMetrics(siteId: string) {
  const last30Days = await getDuplicateLogs(siteId, 30)
  
  const duplicateRate = last30Days.duplicates / last30Days.totalPipelineRuns
  
  if (duplicateRate > 0.3) {
    // 30% 이상 중복으로 스킵 → 출처 풀 점검 필요
    await createAlert({
      severity: 'medium',
      category: 'health',
      siteId,
      title: `중복 스킵률 높음: ${(duplicateRate * 100).toFixed(0)}%`,
      message: '출처 풀에 같은 주제만 다루는 출처가 많을 수 있습니다.',
    })
  }
  
  // 임베딩 누락 검사
  const missing = await countPostsWithoutEmbedding(siteId)
  if (missing > 5) {
    await createAlert({
      severity: 'low',
      category: 'data_integrity',
      siteId,
      title: `임베딩 누락 ${missing}편`,
      message: '백필 자동 시작',
    })
    // 자동 복구
    await scheduleEmbeddingBackfill(siteId)
  }
}
```

### 11.2 어드민 UI 표시

`/sites/{id}/posts` 글 리스트에 중복 검사 결과 컬럼 (옵션):

```
상태 │ 제목                    │ 중복 검사 │
────────────────────────────────────────────
✅   │ AI 코딩 도구 비교       │ 78%      │
✅   │ OpenAI 최신 발표         │ 65%      │
🟡   │ Notion AI 활용          │ 91% ⚠   │  ← 거의 중복
✅   │ Anthropic 프롬프팅      │ 72%      │
```

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 4레벨 중복 검사 (외부 ID / 요약 / 글 / 청크)
- ✅ 임베딩 모델 선택 (대 / 소 / 다국어)
- ✅ 임베딩 영구 캐싱 (재계산 금지)
- ✅ L1 외부 ID + URL 정규화 + cross-site 옵션
- ✅ L2 요약 임베딩 + 90일 윈도우 + 0.85 임계값
- ✅ L3 글 임베딩 + 0.90 임계값 + 4종 정책
- ✅ 재생성 흐름 (차별화 힌트 + 1회 시도)
- ✅ L4 청크 단위 (옵션, 비용)
- ✅ Phase 1 vs Phase 2 권위 우선
- ✅ v1 → v2 outline 글 매칭
- ✅ cross-language siblings (multilingual 임베딩)
- ✅ 임베딩 백필 (점진 진행)
- ✅ Firestore 한계 + vector DB 마이그레이션 추상화
- ✅ 비용 추정 (월 $1~2)
- ✅ 모니터링 통합 (중복률 + 누락 검사)

이 문서가 정의하지 않은 것:
- ❌ 시맨틱 검색 (글 검색에서 임베딩 활용) → `search-and-email.md`
- ❌ GSC + GA4 연결 + AI 인사이트 → `analytics-integration.md`
- ❌ Vercel Cron 동적 등록 → `vercel-cron-spec.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. content-pipeline.md / authority-building.md / internal-linking.md / seo-automation.md / monitoring-health.md v1.0 기준. |

---

*이 문서는 메타사이트의 중복 방지 단일 출처다. 4레벨 검사 + 임베딩 모델 + 임계값 + 재생성 정책의 모든 결정을 담고 있다.*

*다음 문서: `search-and-email.md` (Tier E 3번)*
