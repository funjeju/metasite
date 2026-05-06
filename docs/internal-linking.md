# META-SITE: 내부 링크 자동화 (internal-linking.md)

> Phase 1 권위 글들과 Phase 2 일반 글들을 자동으로 연결하는 권위 그물 시스템.
> Writer가 본문에 삽입한 마커를 실제 URL로 치환하고, 양방향 링크와 Pillar Page를 자동 갱신.
> core.md "11. 내부 링크"의 상세 + authority-building.md / content-pipeline.md / seo-automation.md의 통합 지점.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ seo-automation.md          (페이지 SEO 메타)
  └─ internal-linking.md        ★ 이 문서 — 글 사이 연결
        └─ monetization.md           (다음 — 광고/어필리에이트)
```

이 문서는:
- 글 본문에 삽입된 마커 2종을 실제 링크로 치환하는 알고리즘.
- 권위 그물(Phase 1 글들 사이의 양방향 링크) 유지.
- 새 글 발행 시 기존 글에 역방향 링크 자동 추가.
- Pillar Page 자동 갱신.

---

## 1. 핵심 원칙

### 1.1 왜 내부 링크가 중요한가

> **"권위 글 30편이 있어도 서로 연결 안 되면 30개의 외로운 섬이다."**

SEO 관점:
- 검색엔진이 사이트의 **topical authority**를 인식하는 신호
- 글당 평균 5~10개의 양질 내부 링크는 강력한 SEO factor
- Tier 1 글이 다른 글들의 링크를 받으면 "권위 hub"가 됨

UX 관점:
- 독자가 자연스럽게 다음 글로 흐름
- 평균 페이지뷰 / 세션 증가
- 사이트 체류 시간 증가

AI 검색 관점:
- LLM이 "이 사이트에서 X에 대해 찾으려면 → 이 글을 보라"고 인식
- 인용 정확도 향상

### 1.2 두 종류 마커

```
{{ARTICLE:auth-002}}        — Phase 1 권위 글 명시 참조 (정확 매칭)
{{INTERNAL:Claude 원리}}    — Phase 2 일반 키워드 매칭 (의미 매칭)
```

| | ARTICLE 마커 | INTERNAL 마커 |
|---|-------------|---------------|
| 어디서 사용 | Writer (Phase 1 권위 글) | Writer (Phase 2 일반 글) |
| 매칭 방식 | articleId 정확 일치 | 키워드 + 임베딩 하이브리드 |
| 실패 시 | 에러 (의존성 그래프 검증 통과해야) | 마커 제거 (앵커 텍스트만 남음) |
| 우선순위 | 권위 글 끼리 | 권위 + 최근 발행 글 |

### 1.3 자동화 원칙

- **글 발행 시점**에 마커 → 실제 URL 치환
- **새 글 발행 시점**에 기존 글의 hidden 링크 자동 추가 (역링크)
- **Pillar Page**는 매주 + 권위 글 추가 시 자동 갱신
- 링크는 `curated_posts.internalLinks`에 영구 기록 (단순 본문 마크다운만 수정 X)

---

## 2. {{ARTICLE:xxx}} 마커 처리

### 2.1 입력 예시

Phase 1 권위 글의 Writer 출력:

```markdown
머신러닝과 딥러닝의 차이를 더 깊이 이해하려면 
[머신러닝 vs 딥러닝]({{ARTICLE:auth-002}})을 참고하세요.
```

### 2.2 치환 알고리즘

```typescript
// lib/internal-linking/article-marker.ts

export async function resolveArticleMarkers(
  body: string,
  siteId: string,
): Promise<{ body: string; links: InternalLink[] }> {
  
  const links: InternalLink[] = []
  const pattern = /\[([^\]]+)\]\(\{\{ARTICLE:([\w-]+)\}\}\)/g
  
  const resolved = body.replace(pattern, (match, anchorText, articleId) => {
    // articleId로 curated_posts 찾기 (authorityArticleId 매칭)
    const targetPost = await db
      .collection('sites').doc(siteId).collection('curated_posts')
      .where('authorityArticleId', '==', articleId)
      .where('status', '==', 'published')
      .limit(1).get()
    
    if (targetPost.empty) {
      // 아직 발행 안 됨 — 마커 유지 (다음 발행 시 재시도)
      return match
    }
    
    const target = targetPost.docs[0].data() as CuratedPost
    const url = `/articles/${target.slug}`
    
    links.push({
      targetPostId: target.postId,
      targetTitle: target.title,
      anchorText,
      bodyPosition: body.indexOf(match),
    })
    
    return `[${anchorText}](${url})`
  })
  
  return { body: resolved, links }
}
```

### 2.3 발행 안 된 의존 글 처리

Phase 1 발행은 토폴로지 정렬되어 있어서 의존 글이 먼저 발행됨 (authority-building.md 3.6). 그러나 일시 실패로 의존 글이 미발행 상태일 수 있음.

```typescript
async function handleUnresolvedArticleMarkers(
  post: CuratedPost,
  unresolvedMarkers: string[],
): Promise<void> {
  if (unresolvedMarkers.length === 0) return
  
  // 1. 일단 마커를 plain text로 (마커는 사용자에게 안 보이게)
  const cleaned = post.body.replace(
    /\[([^\]]+)\]\(\{\{ARTICLE:[\w-]+\}\}\)/g,
    '$1',
  )
  
  // 2. 의존 글이 발행되면 다시 처리 (pending_link_resolution 큐)
  for (const articleId of unresolvedMarkers) {
    await db.collection('pending_link_resolutions').add({
      sourcePostId: post.postId,
      siteId: post.siteId,
      targetArticleId: articleId,
      retryAt: addHours(now, 1),
      createdAt: serverTimestamp(),
    })
  }
  
  await updatePost(post, { body: cleaned })
}
```

### 2.4 의존 글 발행 후 자동 보수

의존 글이 발행되면 `pending_link_resolutions`를 다시 처리:

```typescript
// 발행 직후 부가 작업
async function resolveLinksAfterPublish(post: CuratedPost) {
  if (!post.authorityArticleId) return
  
  // 이 글을 기다리던 다른 글들 fetch
  const pending = await db.collection('pending_link_resolutions')
    .where('siteId', '==', post.siteId)
    .where('targetArticleId', '==', post.authorityArticleId)
    .get()
  
  for (const doc of pending.docs) {
    const sourcePost = await getCuratedPost(post.siteId, doc.data().sourcePostId)
    
    // 본문에 다시 마커 + 치환 (하지만 마커는 이미 제거됨)
    // → 운영자에게 알림: "수동으로 링크 추가 권장"
    await createAlert({
      severity: 'low',
      category: 'review_request',
      siteId: post.siteId,
      title: `링크 보충 권장: ${sourcePost.title}`,
      message: `${post.title}로의 내부 링크를 본문에 추가하면 SEO 향상 가능`,
      context: { sourcePostId: sourcePost.postId, targetPostId: post.postId },
    })
    
    await doc.ref.delete()
  }
}
```

---

## 3. {{INTERNAL:키워드}} 마커 처리

### 3.1 입력 예시

Phase 2 일반 글의 Writer 출력:

```markdown
이 모델의 작동 원리를 알려면 [Claude의 작동 원리]({{INTERNAL:Claude 원리}})를 봐야 합니다.
또 [생성형 AI 입문]({{INTERNAL:생성형 AI 정의}})에서 기초를 다룰 수 있습니다.
```

### 3.2 매칭 알고리즘 (Hybrid)

키워드 매칭 + 임베딩 매칭의 하이브리드.

```typescript
// lib/internal-linking/internal-marker.ts

export async function resolveInternalMarkers(
  body: string,
  siteId: string,
  currentPostId?: string,                 // 자기 자신 매칭 방지
): Promise<{ body: string; links: InternalLink[] }> {
  
  const links: InternalLink[] = []
  const pattern = /\[([^\]]+)\]\(\{\{INTERNAL:([^}]+)\}\}\)/g
  
  const matches = Array.from(body.matchAll(pattern))
  
  // 각 마커마다 매칭 후보 찾기
  const resolutions = await Promise.all(
    matches.map((m) => findBestMatch(siteId, m[2], m[1], currentPostId))
  )
  
  let result = body
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const resolution = resolutions[i]
    
    if (resolution.confidence > 0.7) {
      result = result.replace(
        match[0],
        `[${match[1]}](/articles/${resolution.targetSlug})`,
      )
      links.push({
        targetPostId: resolution.targetPostId,
        targetTitle: resolution.targetTitle,
        anchorText: match[1],
        bodyPosition: result.indexOf(`/articles/${resolution.targetSlug}`),
      })
    } else {
      // 매칭 실패 — 마커 제거, 앵커 텍스트만 남기기
      result = result.replace(match[0], match[1])
    }
  }
  
  return { body: result, links }
}
```

### 3.3 findBestMatch — 핵심 매칭 함수

```typescript
async function findBestMatch(
  siteId: string,
  keyword: string,
  anchorText: string,
  excludePostId?: string,
): Promise<MatchResult> {
  
  // 1. 키워드 매칭 (1차 필터)
  const candidates = await keywordMatch(siteId, keyword)
  
  if (candidates.length === 0) {
    return { confidence: 0 }
  }
  
  // 2. 권위 글 우선 (boost)
  const boosted = candidates.map((c) => ({
    ...c,
    keywordScore: c.keywordScore * (c.phase === 'authority' ? 1.5 : 1.0),
  }))
  
  // 3. 임베딩 매칭으로 의미 검증
  const queryEmbedding = await aiService.embed(`${keyword}\n${anchorText}`)
  
  const withEmbedding = await Promise.all(
    boosted.slice(0, 10).map(async (c) => {
      const similarity = cosineSimilarity(queryEmbedding, c.embedding)
      return {
        ...c,
        embeddingScore: similarity,
        finalScore: c.keywordScore * 0.4 + similarity * 0.6,
      }
    })
  )
  
  // 4. 자기 자신 제외 + 최고 점수
  const filtered = withEmbedding.filter((c) => c.postId !== excludePostId)
  filtered.sort((a, b) => b.finalScore - a.finalScore)
  
  if (filtered.length === 0 || filtered[0].finalScore < 0.5) {
    return { confidence: 0 }
  }
  
  const best = filtered[0]
  return {
    targetPostId: best.postId,
    targetTitle: best.title,
    targetSlug: best.slug,
    confidence: best.finalScore,
  }
}
```

### 3.4 키워드 매칭 (1차)

```typescript
async function keywordMatch(
  siteId: string,
  keyword: string,
): Promise<KeywordMatchResult[]> {
  
  // 정확 일치
  const exact = await db
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('targetKeyword', '==', keyword)
    .where('status', '==', 'published')
    .limit(5).get()
  
  // alias 일치 (authority_outline의 aliases 필드)
  const aliases = await db
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('aliases', 'array-contains', keyword)
    .where('status', '==', 'published')
    .limit(10).get()
  
  // 제목 부분 일치 (Firestore는 LIKE 검색 못함 → 클라이언트 필터)
  const recentPosts = await db
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(200).get()
  
  const titleMatches = recentPosts.docs.filter((d) => {
    const title = d.data().title.toLowerCase()
    return title.includes(keyword.toLowerCase())
  })
  
  // 점수 통합
  const candidates = new Map<string, KeywordMatchResult>()
  
  for (const doc of exact.docs) {
    candidates.set(doc.id, { ...doc.data() as any, keywordScore: 1.0 })
  }
  for (const doc of aliases.docs) {
    if (!candidates.has(doc.id)) {
      candidates.set(doc.id, { ...doc.data() as any, keywordScore: 0.85 })
    }
  }
  for (const doc of titleMatches) {
    if (!candidates.has(doc.id)) {
      candidates.set(doc.id, { ...doc.data() as any, keywordScore: 0.6 })
    }
  }
  
  return Array.from(candidates.values())
}
```

### 3.5 매칭 신뢰도 임계값

| 신뢰도 | 결정 |
|--------|------|
| ≥ 0.7 | 자동 링크 |
| 0.5 ~ 0.7 | 마커 제거 (앵커 텍스트만) — Writer가 의도하지 않은 매칭 가능 |
| < 0.5 | 매칭 안 함 — 앵커 텍스트도 남김 |

---

## 4. 자동 추천 링크 (Writer가 마커를 안 넣었어도)

> **"Writer가 마커를 깜빡해도 자동으로 좋은 링크를 찾아 넣는다."**

### 4.1 트리거

Writer/Editor 단계 후, 발행 직전에 자동 추천 링크 단계 실행.

### 4.2 알고리즘

```typescript
// lib/internal-linking/auto-suggest.ts

export async function autoSuggestLinks(
  post: CuratedPost,
  site: ChildSite,
): Promise<AutoLinkSuggestion[]> {
  
  // 1. 본문에서 명사구 추출 (한국어/영어 처리 다름)
  const phrases = extractKeyPhrases(post.body, site.language)
  // 예: ['머신러닝', '딥러닝', 'OpenAI', '프롬프트', ...]
  
  // 2. 권위 글 우선 매칭 (Phase 1 글들의 targetKeyword + aliases)
  const authorityArticles = await db
    .collection('sites').doc(site.siteId).collection('curated_posts')
    .where('phase', '==', 'authority')
    .where('status', '==', 'published')
    .get()
  
  const matches: AutoLinkSuggestion[] = []
  
  for (const phrase of phrases) {
    // 권위 글 중에서 매칭
    for (const auth of authorityArticles.docs) {
      const data = auth.data() as CuratedPost
      const aliases = data.aliases || []
      
      if (data.targetKeyword === phrase || aliases.includes(phrase)) {
        const position = post.body.indexOf(phrase)
        if (position === -1) continue
        
        // 이미 링크된 부분이면 스킵
        if (isAlreadyLinked(post.body, position, phrase)) continue
        
        matches.push({
          phrase,
          position,
          targetPostId: data.postId,
          targetSlug: data.slug,
          targetTitle: data.title,
          confidence: 0.95,
          reason: 'authority_keyword_exact',
        })
        break  // 한 phrase는 한 글에만 링크
      }
    }
  }
  
  // 3. 같은 phrase 여러 번 등장하면 첫 번째만 링크
  const dedup = dedupByPhrase(matches)
  
  // 4. 글당 최대 N개 (4.4 참조)
  const limited = dedup.slice(0, MAX_AUTO_LINKS_PER_POST)
  
  return limited
}
```

### 4.3 본문에 자동 삽입

```typescript
async function injectAutoLinks(
  body: string,
  suggestions: AutoLinkSuggestion[],
): Promise<string> {
  // 위치 역순으로 삽입 (인덱스 유지)
  const sorted = [...suggestions].sort((a, b) => b.position - a.position)
  
  let result = body
  for (const s of sorted) {
    const before = result.slice(0, s.position)
    const after = result.slice(s.position + s.phrase.length)
    result = `${before}[${s.phrase}](/articles/${s.targetSlug})${after}`
  }
  
  return result
}
```

### 4.4 링크 밀도 제어

> **"너무 많은 링크는 SEO 마이너스. 글의 흐름도 끊는다."**

규칙:
- 글당 자동 추천 링크 **최대 7개**
- 단락당 최대 2개
- 한 phrase는 글 전체에서 1번만 링크 (첫 등장)
- 권위 글 간 연결은 가중치 boost (Tier 1 글로 가는 링크 우선)

```typescript
const LINK_DENSITY_LIMITS = {
  maxAutoLinksPerPost: 7,
  maxLinksPerParagraph: 2,
  maxLinksPerKeyword: 1,
}
```

---

## 5. 양방향 링크 (역링크)

### 5.1 왜 역링크인가

새 글 A가 발행되면서 기존 글 B로 링크. 그러나 B는 A가 새로 생긴 걸 모름. SEO/UX 관점에서 양쪽 다 연결되면 좋음.

```
글 A (새 발행)
   ↓ 본문에서 글 B 링크
글 B (기존)

자동 보강:
글 B의 "관련 글" 섹션에 글 A 추가
또는 글 B 본문 자연스러운 곳에 글 A 링크
```

### 5.2 "관련 글" 섹션 자동 갱신

각 글의 푸터에 자동 생성되는 "관련 글" 섹션. 다음 글이 자동으로 들어감:

```typescript
async function updateRelatedArticles(targetPostId: string, siteId: string) {
  // targetPostId로 들어오는 모든 internalLinks 조회
  const incomingLinks = await db
    .collectionGroup('curated_posts')
    .where('siteId', '==', siteId)                  // 같은 사이트만
    .where('internalLinks.targetPostId', '==', targetPostId)
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(10)
    .get()
  
  const related = incomingLinks.docs.map((d) => ({
    title: d.data().title,
    slug: d.data().slug,
    publishedAt: d.data().publishedAt,
  }))
  
  // 기존 글의 relatedArticles 필드 갱신
  await db.collection('sites').doc(siteId).collection('curated_posts').doc(targetPostId)
    .update({ relatedArticles: related, updatedAt: serverTimestamp() })
  
  // 자식 사이트 ISR revalidate
  await revalidateSlug(siteId, targetPostId)
}
```

자식 사이트의 글 페이지 푸터:

```typescript
// 자식 사이트: app/articles/[slug]/page.tsx

export default async function ArticlePage({ params }) {
  const post = await getPost(params.slug)
  
  return (
    <article>
      {/* 본문 */}
      <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
      
      {/* 자동 관련 글 */}
      {post.relatedArticles?.length > 0 && (
        <section className="related-articles">
          <h3>관련 글</h3>
          <ul>
            {post.relatedArticles.map((r) => (
              <li key={r.slug}>
                <Link href={`/articles/${r.slug}`}>{r.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
```

### 5.3 본문 내 자연 삽입 (선택, AI 기반)

"관련 글" 섹션은 자동이지만 약함. 본문에 자연스럽게 링크가 박혀있으면 더 강함. 그러나 기존 글 본문을 수정하는 건 위험 (원래 흐름 깨짐).

> **"기존 발행 글의 본문 자동 수정은 안 한다. 운영자 알림으로만."**

```typescript
async function suggestBodyLinkInsertion(targetPost: CuratedPost, newPost: CuratedPost) {
  // newPost가 targetPost로 링크할 만한 phrase가 targetPost에 있는지 체크
  const candidatePhrases = extractCandidatePhrases(targetPost.body, newPost.targetKeyword)
  
  if (candidatePhrases.length > 0) {
    await createAlert({
      severity: 'low',
      category: 'review_request',
      siteId: targetPost.siteId,
      title: `링크 보충 제안: ${targetPost.title}`,
      message: `새 글 "${newPost.title}"로의 링크를 다음 위치에 추가 권장`,
      context: {
        targetPostId: targetPost.postId,
        suggestions: candidatePhrases.map((p) => ({
          phrase: p,
          position: targetPost.body.indexOf(p),
          newSlug: newPost.slug,
        })),
      },
    })
  }
}
```

운영자가 어드민에서 [한 클릭으로 적용].

---

## 6. Pillar Page 자동 갱신

### 6.1 갱신 트리거

Pillar Page는 **살아있는 문서**. 다음 시점에 자동 갱신:

| 트리거 | 동작 |
|--------|------|
| 새 권위 글 발행 | Pillar에 해당 글 추가 |
| 권위 글 수정 | Pillar의 해당 섹션 갱신 |
| 권위 글 archived | Pillar에서 제거 |
| 매주 일요일 자정 | 전체 재생성 (정합성 검증) |
| 운영자 [재생성] 클릭 | 즉시 재생성 |

### 6.2 점진 갱신 (incremental)

매번 AI를 호출해서 전체 재생성하면 비용 큼. 점진 갱신을 우선:

```typescript
async function incrementalUpdatePillar(
  siteId: string,
  trigger: 'authority_added' | 'authority_modified' | 'authority_removed',
  affectedArticleId: string,
) {
  const pillar = await getPillarPage(siteId)
  if (!pillar) return  // Phase 1 미완료
  
  switch (trigger) {
    case 'authority_added':
      await addArticleToPillar(pillar, affectedArticleId)
      break
    case 'authority_modified':
      await updateArticleInPillar(pillar, affectedArticleId)
      break
    case 'authority_removed':
      await removeArticleFromPillar(pillar, affectedArticleId)
      break
  }
  
  // ISR revalidate
  await revalidatePillar(siteId)
}

async function addArticleToPillar(pillar: CuratedPost, articleId: string) {
  const newArticle = await getAuthorityArticle(articleId)
  if (!newArticle) return
  
  // 어느 Tier 섹션에 들어갈지 결정
  const tierLabel = `Tier ${newArticle.tier}`
  
  // AI에게 200자 요약만 생성 의뢰 (전체 재생성 X)
  const newSection = await aiService.call({
    role: 'authority_outline_generator',
    model: 'claude-sonnet-4-6',                    // 가벼운 모델
    prompt: `다음 권위 글의 Pillar Page용 200자 요약을 작성하세요:
제목: ${newArticle.title}
요약: ${newArticle.excerpt}
페르소나: ...`,
    expectJson: false,
  })
  
  // pillar.body의 해당 Tier 섹션에 삽입
  const updated = insertIntoTierSection(pillar.body, newArticle.tier, {
    title: newArticle.title,
    summary: newSection.text,
    slug: newArticle.slug,
  })
  
  await updatePost(pillar, { body: updated, updatedAt: serverTimestamp() })
}
```

### 6.3 주간 전체 재생성

매주 일요일 자정 Cron으로 정합성 검증 + 필요 시 전체 재생성:

```typescript
async function weeklyPillarRefresh(siteId: string) {
  const pillar = await getPillarPage(siteId)
  const allAuthorityPosts = await getAllPublishedAuthorityPosts(siteId)
  
  // 정합성 검증
  const inPillar = extractArticleIdsFromPillar(pillar.body)
  const expected = new Set(allAuthorityPosts.map((p) => p.authorityArticleId))
  
  const missing = [...expected].filter((id) => !inPillar.includes(id))
  const extra = inPillar.filter((id) => !expected.has(id))
  
  if (missing.length > 0 || extra.length > 0) {
    // 점진 갱신 실패 누적 → 전체 재생성
    await regeneratePillarPage(siteId)
  } else {
    // OK: 마지막 갱신일만 갱신
    await updatePost(pillar, { 'metadata.lastVerifiedAt': serverTimestamp() })
  }
}
```

상세는 `authority-building.md` 6장 (Pillar Page 자동 생성).

---

## 7. 깨진 링크 감지와 보수

### 7.1 발생 시나리오

- 발행된 글이 archived 됨 → 링크가 가리키던 글이 사라짐
- 글 slug 변경 → URL 깨짐
- 외부 호스팅 글 삭제 → URL 404
- v2 outline에서 권위 글 articleId 변경

### 7.2 자동 감지

매일 자정 Cron으로 모든 글의 `internalLinks` 검증:

```typescript
async function dailyBrokenLinkCheck(siteId: string) {
  const allPublishedPosts = await getAllPublishedPosts(siteId)
  const brokenLinks: BrokenLink[] = []
  
  for (const post of allPublishedPosts) {
    if (!post.internalLinks) continue
    
    for (const link of post.internalLinks) {
      const target = await getCuratedPost(siteId, link.targetPostId).catch(() => null)
      
      if (!target || target.status !== 'published') {
        brokenLinks.push({
          sourcePostId: post.postId,
          sourceTitle: post.title,
          brokenLink: link,
          reason: !target ? 'target_not_found' : `target_status_${target.status}`,
        })
      }
    }
  }
  
  if (brokenLinks.length > 0) {
    await createAlert({
      severity: 'medium',
      category: 'health',
      siteId,
      title: `깨진 내부 링크 ${brokenLinks.length}건`,
      context: { brokenLinks: brokenLinks.slice(0, 20) },
    })
  }
  
  return brokenLinks
}
```

### 7.3 자동 보수

```typescript
async function autoFixBrokenLinks(siteId: string, brokenLinks: BrokenLink[]) {
  for (const broken of brokenLinks) {
    const sourcePost = await getCuratedPost(siteId, broken.sourcePostId)
    
    // 본문에서 해당 링크 찾기
    const linkPattern = new RegExp(
      `\\[([^\\]]+)\\]\\(/articles/${escapeRegex(broken.brokenLink.targetSlug)}\\)`,
      'g',
    )
    
    // 1차: 같은 키워드의 다른 글 자동 매칭
    const replacement = await findBestMatch(
      siteId,
      broken.brokenLink.anchorText,
      broken.brokenLink.anchorText,
    )
    
    if (replacement.confidence > 0.7) {
      // 자동 보수
      const fixed = sourcePost.body.replace(
        linkPattern,
        `[$1](/articles/${replacement.targetSlug})`,
      )
      await updatePost(sourcePost, {
        body: fixed,
        internalLinks: sourcePost.internalLinks!.map((l) =>
          l.targetPostId === broken.brokenLink.targetPostId
            ? { ...l, targetPostId: replacement.targetPostId, targetTitle: replacement.targetTitle }
            : l
        ),
      })
    } else {
      // 2차: 보수 실패 — 링크 제거 (앵커 텍스트만 남김)
      const cleaned = sourcePost.body.replace(linkPattern, '$1')
      await updatePost(sourcePost, { body: cleaned })
    }
  }
}
```

---

## 8. nofollow / sponsored 분리

### 8.1 nofollow 정책

내부 링크는 **모두 dofollow** (검색엔진 권한 분배 정상). 따로 표시 안 함.

예외:
- 댓글 작성자가 입력한 외부 URL → nofollow (스팸 방지)
- 광고/어필리에이트 → `rel="sponsored"`

### 8.2 link 속성 자동 부여

```typescript
function renderInternalLink(link: InternalLink): string {
  return `<a href="/articles/${link.targetSlug}">${link.anchorText}</a>`
  // dofollow 기본
}

function renderAffiliateLink(link: AffiliateLink): string {
  return `<a href="${link.url}" rel="sponsored noopener" target="_blank">${link.anchorText}</a>`
}

function renderUserComment(html: string): string {
  // 댓글 본문의 <a> 태그에 nofollow 자동 추가
  return html.replace(/<a\s+href=/g, '<a rel="nofollow noopener" href=')
}
```

---

## 9. 링크 통계와 분석

### 9.1 사이트별 링크 메트릭

`/sites/{id}/analytics`에 표시 (meta-control-spec.md [13]):

```
내부 링크 통계
─────────────
총 링크 수: 1,247
글당 평균: 8.8개
권위 글 → 권위 글: 142개
권위 글 → 일반 글: 89개
일반 글 → 권위 글: 856개 (★ 가장 많음, 좋은 신호)
일반 글 → 일반 글: 160개

가장 많이 받는 글 (Top 10)
1. auth-001 'AI란 무엇인가' — 342개 incoming
2. auth-003 '생성형 AI 작동 원리' — 198개 incoming
...

링크 받지 못하는 글 (orphan): 3편 ⚠
```

### 9.2 권위 그물 시각화

`/sites/{id}/outline` 페이지 (meta-control-spec.md [6])에서 D3.js로 의존성 + 실제 링크 그래프 시각화:

```
   [auth-001 AI란]──┬──────────►[글 A]
       ▲           │
       │           ├──────────►[글 B]
   [auth-003]──────┘
       ▲           
       │           
   [글 C]──────────►[auth-005]
```

색상으로 권위/일반 구분.

---

## 10. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 두 종류 마커 ({{ARTICLE:xxx}} / {{INTERNAL:xxx}})
- ✅ ARTICLE 마커 정확 매칭 + 미발행 처리
- ✅ INTERNAL 마커 하이브리드 매칭 (키워드 + 임베딩)
- ✅ findBestMatch 알고리즘 + 신뢰도 임계값
- ✅ 자동 추천 링크 (Writer가 마커 안 넣어도)
- ✅ 링크 밀도 제어 (글당 최대 7개)
- ✅ 양방향 링크 — relatedArticles 자동 갱신
- ✅ 본문 내 자연 링크 삽입 제안 (운영자 알림 only)
- ✅ Pillar Page 점진 갱신 + 주간 전체 재생성
- ✅ 깨진 링크 감지 + 자동 보수 (1차 매칭 / 2차 제거)
- ✅ nofollow / sponsored 정책
- ✅ 링크 통계 + 그물 시각화

이 문서가 정의하지 않은 것:
- ❌ 어필리에이트 링크의 카테고리 매핑 + 가중치 → `monetization.md`
- ❌ 광고 슬롯 마커의 코드 치환 → `monetization.md`
- ❌ 깨진 외부 링크 (citations) 검증 → `monitoring-health.md`
- ❌ 검색 결과에서 검색어 → 글 매칭 → `search-and-email.md`

---

## 11. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / authority-building.md / content-pipeline.md / seo-automation.md v1.0 기준. |

---

*이 문서는 메타사이트의 내부 링크 자동화 단일 출처다. 권위 그물의 구체 구현 + Pillar Page 살아있는 갱신 + 깨진 링크 자동 보수의 모든 결정을 담고 있다.*

*다음 문서: `monetization.md` (Tier D 3번 — 마지막)*
