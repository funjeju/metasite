# META-SITE: 검색과 이메일 (search-and-email.md)

> 자식 사이트의 시맨틱 검색 시스템 (키워드 + 임베딩 하이브리드) + 뉴스레터 가입/발송/추적.
> core.md "8. 검색 + 뉴스레터"의 상세 + database-schema.md `search_index` / `newsletter_subscribers` 컬렉션의 실제 동작.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ duplicate-prevention.md    (중복 방지)
  └─ search-and-email.md        ★ 이 문서 — 검색 + 뉴스레터
        └─ analytics-integration.md  (다음 — Tier E 마지막)
```

이 문서는:
- 시맨틱 검색의 키워드 + 임베딩 하이브리드 알고리즘
- 자식 사이트 `/search` 페이지 구현
- Resend (또는 SES) 통합 — 가입/확인/해지/발송
- 자동 다이제스트 (주간 뉴스레터)
- GDPR 준수 + 개인정보 처리

---

## 1. 핵심 원칙

### 1.1 검색 = "사이트가 살아있다는 증거"

> **"검색이 작동하면 사이트가 진짜고, 안 되면 SEO 문서 더미."**

자식 사이트 검색 페이지는:
- AI 검색 엔진이 인용하기 좋은 **구조화된 결과**
- 사용자가 "이 사이트에서 X 찾기" 가능 → 체류 + 만족
- 어드민 도구로도 활용 (어떤 키워드가 검색되는지 분석)

### 1.2 뉴스레터 = "트래픽 의존 탈출"

> **"검색만으로 의존하면 알고리즘 변동에 망한다. 직접 채널 보유."**

뉴스레터 가입자는:
- Google 알고리즘과 무관한 직접 트래픽
- 신뢰 + 충성도 (구독 = 적극적 동의)
- 새 글 알림 + 어필리에이트 + 직접 메시지 가능
- 사이트 매각 시 자산 가치 중 가장 높음

### 1.3 호스팅별 차이 (publisher-adapters.md 7장)

| 기능 | Next.js | Tistory | Blogger |
|------|---------|---------|---------|
| 시맨틱 검색 | ✅ | ❌ (자체 검색만) | ❌ (자체 검색만) |
| 뉴스레터 가입 | ✅ | ❌ | ❌ |
| 뉴스레터 발송 | ✅ (모든 호스팅 글 묶음 가능) | ❌ | ❌ |

이 문서는 **Next.js 호스팅 위주**. 외부 호스팅은 검색/뉴스레터 자체 미지원.

> 단 메타가 보유한 뉴스레터는 Tistory/Blogger 자식 사이트의 글도 포함 가능 (메일 발송은 메타 측).

---

## 2. 시맨틱 검색 시스템

### 2.1 검색 인덱스 (database-schema.md 4.12)

```typescript
interface SearchIndexEntry {
  indexId: string                        // 'idx_{postId}'
  postId: string
  
  title: string
  excerpt: string
  url: string
  publishedAt: Timestamp
  
  embedding: number[]                    // 본문 전체
  embeddingModel: string
  
  chunks?: {
    text: string
    embedding: number[]
    position: number
  }[]
  
  keywords: string[]                     // 키워드 검색 백업
  
  updatedAt: Timestamp
}
```

새 글 발행 시 자동 인덱싱:

```typescript
// publisher-adapters.md publishPost 후 부가 작업
async function indexNewPost(siteId: string, post: CuratedPost) {
  const fullEmbedding = post.embedding!  // 이미 Generate 단계에서 생성됨
  
  // 청크 분할 (긴 글만)
  let chunks: ChunkData[] | undefined
  if (countWords(post.body) > 1500) {
    chunks = await generateChunks(post.body)
  }
  
  // 키워드 추출 (백업 검색용)
  const keywords = extractKeywords(post)
  
  await db.collection('sites').doc(siteId).collection('search_index')
    .doc(`idx_${post.postId}`)
    .set({
      indexId: `idx_${post.postId}`,
      postId: post.postId,
      title: post.title,
      excerpt: post.excerpt,
      url: `/articles/${post.slug}`,
      publishedAt: post.publishedAt,
      embedding: fullEmbedding,
      embeddingModel: post.embeddingModel,
      chunks,
      keywords,
      updatedAt: serverTimestamp(),
    })
}

function extractKeywords(post: CuratedPost): string[] {
  return [
    post.targetKeyword,
    ...(post.aliases || []),
    ...post.tags,
    ...post.title.split(/\s+/).filter((w) => w.length >= 2),
  ].filter(Boolean).slice(0, 30)
}
```

### 2.2 하이브리드 검색 알고리즘

키워드 + 임베딩 하이브리드. 둘 다 점수에 반영.

```typescript
// 자식 사이트: app/api/search/route.ts

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }
  
  const siteId = await getSiteIdFromHost(req)
  
  // 1. 키워드 매칭 (1차 빠른 필터)
  const keywordResults = await keywordSearch(siteId, query, 50)
  
  if (keywordResults.length === 0) {
    // 키워드 매칭 결과 없음 → 임베딩만으로
    return await embeddingOnlySearch(siteId, query, 20)
  }
  
  // 2. 임베딩 매칭 (의미 점수 추가)
  const queryEmbedding = await aiService.embed(query, 'lightweight')
  
  const scored = await Promise.all(
    keywordResults.slice(0, 30).map(async (entry) => {
      const semScore = cosineSimilarity(queryEmbedding, entry.embedding)
      return {
        entry,
        keywordScore: entry.keywordScore,
        semanticScore: semScore,
        finalScore: entry.keywordScore * 0.4 + semScore * 0.6,
      }
    })
  )
  
  // 3. 정렬 + 최근 글 boost
  scored.sort((a, b) => {
    const recencyBoost = (e: any) => {
      const days = (now - e.entry.publishedAt) / (1000 * 60 * 60 * 24)
      if (days < 7) return 0.05         // 최근 7일 boost
      if (days < 30) return 0.02
      return 0
    }
    
    return (b.finalScore + recencyBoost(b)) - (a.finalScore + recencyBoost(a))
  })
  
  // 4. 결과 반환
  const results = scored.slice(0, 20).map((s) => ({
    title: s.entry.title,
    excerpt: highlightQuery(s.entry.excerpt, query),
    url: s.entry.url,
    publishedAt: s.entry.publishedAt,
    score: s.finalScore,
  }))
  
  // 5. 검색 로그 (트렌드 분석용)
  await logSearch(siteId, query, results.length)
  
  return NextResponse.json({ results, query })
}
```

### 2.3 키워드 검색 구현

Firestore는 LIKE 검색 못 함 → `keywords` 배열 + 클라이언트 필터.

```typescript
async function keywordSearch(
  siteId: string,
  query: string,
  limit: number,
): Promise<KeywordSearchResult[]> {
  
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2)
  if (queryWords.length === 0) return []
  
  // Firestore array-contains-any (최대 10개 단어)
  const results: any[] = []
  for (const word of queryWords.slice(0, 10)) {
    const snap = await db
      .collection('sites').doc(siteId).collection('search_index')
      .where('keywords', 'array-contains', word)
      .limit(50)
      .get()
    
    snap.docs.forEach((doc) => results.push(doc.data()))
  }
  
  // 중복 제거 + 점수 계산
  const grouped = new Map<string, KeywordSearchResult>()
  for (const entry of results) {
    const matchCount = queryWords.filter((w) => 
      entry.keywords.includes(w) || entry.title.toLowerCase().includes(w)
    ).length
    
    const score = matchCount / queryWords.length
    
    if (!grouped.has(entry.postId)) {
      grouped.set(entry.postId, { ...entry, keywordScore: score })
    }
  }
  
  return Array.from(grouped.values())
    .sort((a, b) => b.keywordScore - a.keywordScore)
    .slice(0, limit)
}
```

### 2.4 임베딩만으로 검색

키워드 매칭 결과 없을 때 (오타 / 동의어). 임베딩 fallback:

```typescript
async function embeddingOnlySearch(
  siteId: string,
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  
  const queryEmbedding = await aiService.embed(query, 'lightweight')
  
  // 최근 1년 글의 search_index fetch
  const since = subtract(now, days(365))
  const indices = await db
    .collection('sites').doc(siteId).collection('search_index')
    .where('publishedAt', '>=', since)
    .get()
  
  const scored = indices.docs.map((doc) => {
    const entry = doc.data() as SearchIndexEntry
    const similarity = cosineSimilarity(queryEmbedding, entry.embedding)
    return { entry, similarity }
  })
  
  scored.sort((a, b) => b.similarity - a.similarity)
  
  return scored.slice(0, limit)
    .filter((s) => s.similarity > 0.3)
    .map((s) => ({
      title: s.entry.title,
      excerpt: s.entry.excerpt,
      url: s.entry.url,
      publishedAt: s.entry.publishedAt,
      score: s.similarity,
    }))
}
```

### 2.5 청크 단위 검색 (긴 글)

긴 글 검색 정확도 향상. 청크에서 매칭되면 해당 부분 강조:

```typescript
async function chunkedSearch(
  siteId: string,
  query: string,
): Promise<ChunkSearchResult[]> {
  
  const queryEmbedding = await aiService.embed(query, 'lightweight')
  const indices = await getRecentSearchIndices(siteId)
  
  const chunkResults: ChunkSearchResult[] = []
  
  for (const entry of indices) {
    if (!entry.chunks) continue
    
    for (let i = 0; i < entry.chunks.length; i++) {
      const chunk = entry.chunks[i]
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
      
      if (similarity > 0.65) {
        chunkResults.push({
          postId: entry.postId,
          title: entry.title,
          url: entry.url,
          chunkText: chunk.text.slice(0, 250),
          chunkPosition: chunk.position,
          similarity,
        })
      }
    }
  }
  
  // 같은 post 내 청크는 가장 높은 것만
  const dedup = dedupByPostId(chunkResults)
  
  return dedup.sort((a, b) => b.similarity - a.similarity).slice(0, 20)
}
```

### 2.6 검색 페이지 UI (Next.js)

```typescript
// 자식 사이트: app/search/page.tsx

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q
  
  if (!query) {
    return <SearchEmptyState />
  }
  
  const { results } = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json())
  
  return (
    <div className="search-results">
      <h1>"{query}" 검색 결과 ({results.length}편)</h1>
      
      <ul>
        {results.map((r) => (
          <li key={r.url}>
            <Link href={r.url}>
              <h3 dangerouslySetInnerHTML={{ __html: r.title }} />
              <p dangerouslySetInnerHTML={{ __html: r.excerpt }} />
              <span className="meta">{formatDate(r.publishedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
      
      {results.length === 0 && (
        <div className="no-results">
          <p>검색 결과가 없습니다. 다른 검색어를 시도해보세요.</p>
          <SuggestedKeywords />
        </div>
      )}
    </div>
  )
}
```

### 2.7 검색 통계 (트렌드 분석)

각 검색을 `search_logs`에 기록:

```typescript
async function logSearch(siteId: string, query: string, resultCount: number) {
  await db.collection('sites').doc(siteId).collection('search_logs').add({
    query: query.toLowerCase().trim(),
    resultCount,
    timestamp: serverTimestamp(),
    expiresAt: Timestamp.fromDate(addDays(now, 90)),
  })
}
```

매주 일요일 자동 분석:

```
이번 주 검색어 Top 10 (travel-kr)

"제주도"           87회 → 결과 12편
"후쿠오카"         54회 → 결과 8편
"부산 맛집"        38회 → 결과 0편 ⚠ (콘텐츠 부족!)
"오사카 호텔"       29회 → 결과 5편
...

결과 0편인 검색어 (콘텐츠 갭):
- "부산 맛집"
- "강원도 펜션"
- "유럽 자유여행"
```

운영자에게 콘텐츠 갭 알림 → Phase 2 출처 풀에 키워드 추가 권장.

---

## 3. 뉴스레터 시스템

### 3.1 가입 흐름 (Double Opt-in)

> **"이메일은 받기 전에 한 번 더 확인."**

이유: GDPR + 스팸 신고 방지 + 봇 가입 차단.

```
1. 사용자가 가입 폼에 이메일 입력
2. 시스템: pending 상태로 newsletter_subscribers 생성 + 확인 메일 발송
3. 사용자가 확인 링크 클릭
4. 시스템: confirmed 상태로 변경
5. 환영 메일 + 첫 다이제스트 자동 발송
```

### 3.2 가입 폼 (Next.js)

```typescript
// 자식 사이트: app/api/newsletter/subscribe/route.ts

export async function POST(req: NextRequest) {
  const { email, source = '/' } = await req.json()
  
  // 1. 검증
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  
  // 2. reCAPTCHA 검증
  const recaptchaToken = req.headers.get('X-Recaptcha-Token')
  if (!await verifyRecaptcha(recaptchaToken)) {
    return NextResponse.json({ error: 'reCAPTCHA failed' }, { status: 400 })
  }
  
  // 3. Rate limit (IP당 분당 3회)
  const ip = getClientIp(req)
  if (await isRateLimited(`newsletter:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  
  const siteId = await getSiteIdFromHost(req)
  const emailHash = sha256(email.toLowerCase())
  
  // 4. 기존 가입 확인
  const existingRef = db
    .collection('sites').doc(siteId).collection('newsletter_subscribers').doc(emailHash)
  const existing = await existingRef.get()
  
  if (existing.exists) {
    const data = existing.data()
    
    if (data.status === 'confirmed') {
      // 이미 가입됨 → 친절한 메시지
      return NextResponse.json({ ok: true, message: '이미 구독 중입니다.' })
    }
    
    if (data.status === 'unsubscribed') {
      // 재구독 → 확인 메일 다시
      await existingRef.update({
        status: 'pending',
        subscribedAt: serverTimestamp(),
        unsubscribedAt: null,
      })
    }
  } else {
    // 신규 가입
    await existingRef.set({
      subscriberId: emailHash,
      email,
      emailHash,
      subscribedAt: serverTimestamp(),
      status: 'pending',
      totalSent: 0,
      totalOpens: 0,
      totalClicks: 0,
      source,
      ipAddress: hash(ip),                    // GDPR — 90일 후 삭제
      consentVersion: 'v1.0',
    })
  }
  
  // 5. 확인 메일 발송
  await sendConfirmationEmail(siteId, email, emailHash)
  
  return NextResponse.json({ ok: true, message: '확인 메일을 발송했습니다.' })
}
```

### 3.3 확인 메일

```typescript
async function sendConfirmationEmail(siteId: string, email: string, emailHash: string) {
  const site = await getChildSite(siteId)
  const baseUrl = `https://${site.hostingConfig.domain}`
  const confirmUrl = `${baseUrl}/newsletter/confirm?token=${generateConfirmToken(emailHash)}`
  
  const html = `
    <h1>${site.name} 구독 확인</h1>
    <p>안녕하세요!</p>
    <p>${site.name}의 뉴스레터를 구독해주셔서 감사합니다.</p>
    <p>아래 링크를 클릭하여 구독을 확인해주세요:</p>
    <p><a href="${confirmUrl}" 
          style="display:inline-block;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:6px">
       구독 확인하기
    </a></p>
    <p>이 메일이 잘못 도착했거나 가입한 적이 없다면 무시하세요.</p>
    <hr>
    <p style="color:#888;font-size:12px">
      ${site.name} | 메일 수신을 원치 않으시면 이 메일을 무시하세요.
    </p>
  `
  
  await sendEmail({
    from: site.seoConfig.newsletterFromEmail || `noreply@${site.hostingConfig.domain}`,
    to: email,
    subject: `[${site.name}] 구독 확인`,
    html,
  })
}
```

### 3.4 확인 처리

```typescript
// 자식 사이트: app/api/newsletter/confirm/route.ts

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return redirect('/newsletter/error')
  
  const emailHash = verifyConfirmToken(token)
  if (!emailHash) return redirect('/newsletter/error')
  
  const siteId = await getSiteIdFromHost(req)
  const subRef = db
    .collection('sites').doc(siteId).collection('newsletter_subscribers').doc(emailHash)
  
  await subRef.update({
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
  })
  
  // 환영 메일 + 첫 다이제스트
  const sub = await subRef.get()
  await sendWelcomeEmail(siteId, sub.data()!.email)
  
  return redirect('/newsletter/welcome')
}
```

### 3.5 해지 흐름 (One-click)

> **"한 번 클릭으로 해지. 다시 묻지 않는다."**

GDPR + CAN-SPAM 의무. 해지 어렵게 만들면 스팸 신고 받음.

```typescript
// 모든 발송 메일 푸터에:
const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe?token=${generateUnsubToken(emailHash)}`

// 자식 사이트: app/api/newsletter/unsubscribe/route.ts

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const emailHash = verifyUnsubToken(token)
  if (!emailHash) return redirect('/newsletter/error')
  
  await db.collection('sites').doc(siteId).collection('newsletter_subscribers').doc(emailHash)
    .update({
      status: 'unsubscribed',
      unsubscribedAt: serverTimestamp(),
    })
  
  return redirect('/newsletter/unsubscribed')
}
```

해지 페이지에서 사유 묻기 (선택):
- "관련 없는 콘텐츠"
- "너무 자주 보냄"
- "원하지 않은 메일"

운영자가 분석에 사용.

---

## 4. 발송 시스템

### 4.1 Resend vs SES

| | Resend | AWS SES |
|---|--------|---------|
| 셋업 | 간단 (API key) | 복잡 (도메인 검증) |
| 비용 | $0.40/1k 메일 | $0.10/1k 메일 |
| 도착률 | 우수 | 우수 (도메인 평판 따라) |
| 로그 추적 | 내장 (open/click) | 별도 셋업 |
| 추천 | **시작 / 1만 구독자 미만** | 1만+ 구독자 |

자식 사이트별 선택 가능. 운영자가 `settings/newsletter`에서.

### 4.2 단일 메일 발송 추상화

```typescript
// lib/email/send.ts

export interface EmailProvider {
  send(opts: SendEmailOptions): Promise<EmailResult>
}

export class ResendProvider implements EmailProvider {
  async send(opts: SendEmailOptions): Promise<EmailResult> {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: {
        'List-Unsubscribe': `<${opts.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    return { messageId: result.id!, success: !result.error }
  }
}

export class SESProvider implements EmailProvider {
  async send(opts: SendEmailOptions): Promise<EmailResult> {
    // AWS SES 구현
    // ...
  }
}

// Factory
export function getEmailProvider(siteId: string): EmailProvider {
  const config = await getNewsletterConfig(siteId)
  return config.provider === 'ses' ? new SESProvider() : new ResendProvider()
}
```

### 4.3 List-Unsubscribe 헤더 (Gmail 친화)

Gmail/Outlook이 메일 상단에 "구독 해지" 버튼 표시 → 신뢰 + 도착률 향상:

```
List-Unsubscribe: <https://travel-kr.com/newsletter/unsubscribe?token=...>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

---

## 5. 자동 다이제스트 (주간 뉴스레터)

### 5.1 트리거

매주 화요일 09:00 KST. 사이트별 다른 시간 가능 (`settings/newsletter.digestSchedule`).

### 5.2 다이제스트 구조

```
[ai-kr 주간 다이제스트] 2026-05-06

지난 주의 핫 이슈 (3편)

🔥 OpenAI o5 출시 — 무엇이 달라졌나
오랫동안 기다렸던 다음 세대 모델이 출시됐습니다...
[전체 읽기 →]

🔥 Claude 4.7 vs GPT-5 심층 비교
어떤 모델을 어디에 써야 하는지 ...
[전체 읽기 →]

🔥 [PILLAR] AI 활용법 완전 가이드 (업데이트)
이번 주 새로 추가된 4편을 반영했습니다.
[전체 읽기 →]

이번 주 더 보기 (8편)
- AI 코딩 도구 비교 분석
- Notion AI 사용법 가이드
- ...

추천 도구 (스폰서)
[Notion AI 어필리에이트 박스]

다음 주 예고
- "RAG 심층 분석" (수요일)
- "Vector DB 입문" (금요일)

📧 구독 해지 | 메일 환경설정
```

### 5.3 자동 생성 알고리즘

```typescript
// app/api/cron/newsletter-digest/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const todayWeekday = new Date().getDay()  // 0=일, 1=월, 2=화, ...
  const sites = await getActiveChildSites()
  
  for (const site of sites) {
    const settings = await getNewsletterSettings(site.siteId)
    if (!settings.enabled) continue
    if (settings.digestSchedule.weekday !== todayWeekday) continue
    
    await generateAndSendDigest(site)
  }
  
  return NextResponse.json({ ok: true })
}

async function generateAndSendDigest(site: ChildSite) {
  // 1. 지난 7일 발행 글 fetch
  const lastWeek = subtract(now, days(7))
  const recentPosts = await db
    .collection('sites').doc(site.siteId).collection('curated_posts')
    .where('status', '==', 'published')
    .where('publishedAt', '>=', lastWeek)
    .orderBy('publishedAt', 'desc')
    .get()
  
  if (recentPosts.empty) {
    console.log(`No recent posts for ${site.siteId}, skipping digest`)
    return
  }
  
  // 2. Top 3 선정 (조회수 + 추천 점수)
  const top3 = await selectTop3Posts(recentPosts.docs.map((d) => d.data() as CuratedPost))
  
  // 3. 다이제스트 본문 생성 (AI)
  const digestHtml = await renderDigest(site, top3, recentPosts.docs.slice(0, 8))
  
  // 4. 구독자 fetch (확인된 사람만)
  const subscribers = await db
    .collection('sites').doc(site.siteId).collection('newsletter_subscribers')
    .where('status', '==', 'confirmed')
    .get()
  
  // 5. 배치 발송 (50명씩)
  const provider = getEmailProvider(site.siteId)
  const subject = `[${site.name}] 주간 다이제스트 - ${formatDate(now, 'M월 d일')}`
  
  const batchSize = 50
  for (let i = 0; i < subscribers.size; i += batchSize) {
    const batch = subscribers.docs.slice(i, i + batchSize)
    
    await Promise.allSettled(
      batch.map(async (doc) => {
        const sub = doc.data() as NewsletterSubscriber
        
        const personalizedHtml = personalizeDigest(digestHtml, sub)
        
        try {
          const result = await provider.send({
            from: site.settings.newsletter.fromEmail,
            to: sub.email,
            subject,
            html: personalizedHtml,
            unsubscribeUrl: `${baseUrl}/newsletter/unsubscribe?token=${generateUnsubToken(sub.emailHash)}`,
          })
          
          // 발송 기록
          await doc.ref.update({
            totalSent: increment(1),
            lastSentAt: serverTimestamp(),
          })
          
          // 캠페인 로그
          await logCampaign(site.siteId, 'digest', sub.emailHash, result.messageId)
        } catch (err) {
          console.error(`Failed to send to ${sub.email}:`, err)
        }
      })
    )
    
    // 배치 사이 짧은 대기 (rate limit)
    await sleep(1000)
  }
}
```

### 5.4 Open + Click 추적

Resend는 자동 추적. SES는 설정 필요.

```typescript
// 추적 픽셀 (open)
async function trackOpen(siteId: string, emailHash: string, messageId: string) {
  await db.collection('sites').doc(siteId).collection('newsletter_subscribers').doc(emailHash)
    .update({
      totalOpens: increment(1),
    })
  
  await db.collection('sites').doc(siteId).collection('campaigns').doc(messageId)
    .update({
      opens: increment(1),
    })
}

// 클릭 추적 (URL rewriting)
function rewriteLinksForTracking(html: string, messageId: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      if (url.includes('/newsletter/unsubscribe')) return match  // 해지 링크는 추적 X
      const tracked = `${baseUrl}/api/newsletter/click?to=${encodeURIComponent(url)}&mid=${messageId}`
      return `href="${tracked}"`
    },
  )
}
```

### 5.5 Top 3 선정 알고리즘

```typescript
async function selectTop3Posts(posts: CuratedPost[]): Promise<CuratedPost[]> {
  const scored = posts.map((post) => {
    let score = 0
    
    // 조회수 (정규화)
    const viewScore = Math.log10(post.stats?.viewCount || 1) * 10
    score += viewScore
    
    // 권위 글 boost
    if (post.phase === 'authority') score += 20
    
    // Pillar Page 갱신 시 우선
    if (post.type === 'pillar') score += 50
    
    // AI 댓글 좋아요 (사용자 반응 신호)
    score += (post.stats?.aiCommentCount || 0) * 0.5
    
    // 최근 발행 boost
    const daysSince = (now - post.publishedAt.toMillis()) / (1000 * 60 * 60 * 24)
    if (daysSince < 1) score += 15
    if (daysSince < 3) score += 10
    
    return { post, score }
  })
  
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map((s) => s.post)
}
```

---

## 6. 발송 전용 Cron 분리

대량 발송은 단일 Vercel Function의 5분 한계 위험. 분할:

```typescript
// /api/cron/newsletter-digest → 디스패처
// 사이트별로 /api/newsletter/send-batch 비동기 호출

// /api/newsletter/send-batch?siteId=X&offset=0&limit=100
export async function POST(req: NextRequest) {
  const { siteId, offset, limit } = await req.json()
  
  const subscribers = await getSubscriberBatch(siteId, offset, limit)
  await sendDigestBatch(siteId, subscribers)
  
  // 다음 배치 자동 트리거
  if (subscribers.length === limit) {
    await fetch(`${baseUrl}/api/newsletter/send-batch`, {
      method: 'POST',
      body: JSON.stringify({ siteId, offset: offset + limit, limit }),
    })
  }
  
  return NextResponse.json({ ok: true, sent: subscribers.length })
}
```

---

## 7. GDPR + 개인정보 처리

### 7.1 정책 의무

- 가입 시 명시적 동의 (체크박스)
- 개인정보 처리방침 링크
- 데이터 사용 목적 명시
- 즉시 해지 가능
- 데이터 다운로드 요청 응답
- 데이터 삭제 요청 응답

### 7.2 데이터 보관

```typescript
// IP 주소: 90일 후 자동 삭제 (해시만 남김)
async function dailyGdprCleanup(siteId: string) {
  const ninetyDaysAgo = subtract(now, days(90))
  
  const oldSubs = await db
    .collection('sites').doc(siteId).collection('newsletter_subscribers')
    .where('subscribedAt', '<=', ninetyDaysAgo)
    .where('ipAddress', '!=', null)
    .limit(100)
    .get()
  
  for (const doc of oldSubs.docs) {
    await doc.ref.update({ ipAddress: null })  // IP만 제거, 가입은 유지
  }
}
```

### 7.3 데이터 다운로드 / 삭제 요청

`/sites/{id}/newsletter` 어드민에서 운영자가 처리. 사용자가 이메일로 요청 → 운영자 수동:

```typescript
// 사용자 요청에 따른 데이터 export
async function exportUserData(siteId: string, email: string): Promise<UserDataExport> {
  const emailHash = sha256(email.toLowerCase())
  const sub = await getSubscriber(siteId, emailHash)
  if (!sub) return { found: false }
  
  const campaigns = await getCampaignHistory(siteId, emailHash)
  
  return {
    found: true,
    subscriber: {
      subscribedAt: sub.subscribedAt,
      status: sub.status,
      // IP 등 민감 정보는 제외 (이미 해시됨)
    },
    campaignsReceived: campaigns,
  }
}

// 완전 삭제 (right to be forgotten)
async function deleteUserData(siteId: string, email: string) {
  const emailHash = sha256(email.toLowerCase())
  await db.collection('sites').doc(siteId).collection('newsletter_subscribers').doc(emailHash).delete()
  
  // 캠페인 로그도 익명화
  const campaigns = await db.collection('sites').doc(siteId).collection('campaigns')
    .where('subscriberEmailHash', '==', emailHash).get()
  
  for (const doc of campaigns.docs) {
    await doc.ref.update({ subscriberEmailHash: null, anonymized: true })
  }
}
```

---

## 8. 어드민 UI 통합 (meta-control-spec.md [12])

### 8.1 뉴스레터 페이지

```
구독자 1,247명  (확인됨 1,089 / 미확인 158)
7일 가입: +43 / 7일 해지: -2

마지막 다이제스트
2026-05-03  발송 1,089  Open 38%  Click 4.2%
[캠페인 상세]

[+ 새 캠페인]  [+ 즉시 다이제스트]

캠페인 히스토리 (최근 10)
─────────────
4/29 다이제스트  발송 1,067  Open 42%  Click 5.1%
4/22 다이제스트  발송 1,054  Open 39%  Click 4.5%
4/15 발송  Open 36%
...

세그먼트
- 활성 (지난 30일 open) 743명
- 비활성 (90일 open 안 함) 124명
- 신규 (이번 주 가입) 43명

설정
- 발송 일정: 화요일 09:00 KST
- From: noreply@travel-kr.com
- Provider: Resend
- Top 3 자동 선정: ON
- 어필리에이트 박스 포함: ON
```

### 8.2 즉시 캠페인 발송

운영자가 특정 글을 즉시 발송:

```
[+ 즉시 캠페인]
   ↓
글 선택: [이번 주 발행 ▾]  [OpenAI o5 출시]
세그먼트: [활성 구독자만]  [전체]  [신규만]
  → 743명에게 발송 예정

제목: [_____________________________]
본문 미리보기:
  - 글 제목 자동 표시
  - 본문 첫 200자
  - "전체 읽기 →" 링크
  - 푸터 (해지 링크)

[미리보기 발송 (운영자에게)]  [발송 시작]
```

---

## 9. 수익 통합 (newsletter via affiliate)

뉴스레터에 어필리에이트 박스 자동 삽입. monetization.md 5.5 AffiliateBox와 동일 패턴 (HTML 형태로 이메일에).

```html
<!-- 다이제스트 본문 끝 -->
<hr>
<div style="background:#f5f5f5;padding:20px;border-radius:8px">
  <small style="color:#888">관련 도구 추천 (스폰서)</small>
  <h3>Notion AI</h3>
  <p>이번 주 글에서 다룬 AI 도구 중...</p>
  <a href="...?ref=newsletter" style="...">자세히 보기 →</a>
  <small style="color:#888">※ 어필리에이트 링크</small>
</div>
```

뉴스레터 클릭이 어필리에이트 매출 → analytics_snapshots에 추적.

---

## 10. 이탈 방지 (Re-engagement)

### 10.1 비활성 사용자 감지

90일 이상 메일 열지 않은 구독자는 "비활성":

```typescript
async function findInactiveSubscribers(siteId: string): Promise<NewsletterSubscriber[]> {
  const ninetyDaysAgo = subtract(now, days(90))
  
  const subs = await db
    .collection('sites').doc(siteId).collection('newsletter_subscribers')
    .where('status', '==', 'confirmed')
    .where('totalSent', '>=', 4)                  // 4번 이상 발송
    .get()
  
  return subs.docs
    .map((d) => d.data() as NewsletterSubscriber)
    .filter((s) => s.totalOpens === 0)            // open이 한 번도 없음
}
```

### 10.2 Re-engagement 캠페인

비활성에게 "아직 관심 있나요?" 메일:

```
"travel-kr 뉴스레터, 계속 받고 싶으신가요?"

지난 90일 동안 이메일을 열어보지 않으셨네요.

계속 받기를 원하시면 [확인] 클릭
원치 않으시면 [구독 해지]

응답 없으면 30일 후 자동 해지됩니다.
```

자동 해지 → 도착률 보호 (반응 없는 메일이 많으면 스팸 분류 위험).

### 10.3 자동 정리

```typescript
async function autoCleanupInactive(siteId: string) {
  // Re-engagement 발송 후 30일 응답 없으면
  const expiredAt = subtract(now, days(30))
  
  const expired = await db
    .collection('sites').doc(siteId).collection('newsletter_subscribers')
    .where('status', '==', 'confirmed')
    .where('reEngagementSentAt', '<=', expiredAt)
    .where('totalOpens', '==', 0)
    .get()
  
  for (const doc of expired.docs) {
    await doc.ref.update({
      status: 'unsubscribed',
      unsubscribedAt: serverTimestamp(),
      unsubscribeReason: 'auto_cleanup_inactive',
    })
  }
}
```

---

## 11. 비용 추정

### 11.1 검색 비용

- 임베딩 (검색 쿼리): $0.02/1k 검색 (small 모델)
- Firestore reads: 검색당 ~50 reads = $0.0003

자식 사이트 6개 × 일 200 검색 (가정) = 일 1,200 검색 → 월 $1 미만.

### 11.2 뉴스레터 비용

- Resend: $0.40/1k 메일
- 자식 사이트 1개 × 1,000 구독자 × 주간 발송 4회 = 4,000 메일/월 = $1.60
- 자식 사이트 6개 = ~$10/월

확인 메일 + 환영 메일 추가 ~$1.

전체 검색 + 뉴스레터: 월 ~$15.

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 시맨틱 검색 (키워드 + 임베딩 하이브리드)
- ✅ 검색 인덱스 자동 갱신 (발행 후)
- ✅ 청크 단위 검색 (긴 글)
- ✅ 검색 통계 + 콘텐츠 갭 알림
- ✅ Double Opt-in 가입 흐름
- ✅ 확인/해지 메일 + Token 검증
- ✅ Resend / SES 추상화 (provider factory)
- ✅ List-Unsubscribe 헤더 (Gmail 친화)
- ✅ 자동 주간 다이제스트 (Top 3 + 더보기 + 어필리에이트)
- ✅ 발송 배치 처리 (50명씩, Vercel Function 한계 회피)
- ✅ Open + Click 추적 (픽셀 + URL rewriting)
- ✅ GDPR 준수 (IP 90일 / 데이터 다운로드 / 삭제)
- ✅ Re-engagement 자동 정리
- ✅ 어드민 UI + 즉시 캠페인 발송
- ✅ 비용 추정 ($15/월 6 사이트)

이 문서가 정의하지 않은 것:
- ❌ GSC + GA4 통합 + AI 인사이트 → `analytics-integration.md`
- ❌ Vercel Cron 동적 등록 → `vercel-cron-spec.md`
- ❌ Resend / SES 환경변수 셋업 → `environment-variables.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. database-schema.md / monitoring-health.md / duplicate-prevention.md v1.0 기준. |

---

*이 문서는 메타사이트의 검색 + 뉴스레터 단일 출처다. 시맨틱 검색 알고리즘과 GDPR 준수 메일 시스템의 모든 결정을 담고 있다.*

*다음 문서: `analytics-integration.md` (Tier E 4번 — 마지막)*
