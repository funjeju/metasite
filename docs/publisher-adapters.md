# META-SITE: Publisher 어댑터 레이어 (publisher-adapters.md)

> 자식 사이트의 호스팅 차이를 흡수하는 어댑터 레이어 명세.
> 메타사이트의 비즈니스 로직은 단 하나의 인터페이스(`SitePublisher`)만 본다.
> 쏙튜브의 검증된 `lib/tistory.ts` / `lib/blogger.ts`를 베이스로 어댑터 형태로 재구성한다.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ architecture.md            (시스템 구조)
  ├─ database-schema.md         (데이터 모델)
  └─ publisher-adapters.md      ★ 이 문서 — 어댑터 구현
```

이 문서가 정의하는 인터페이스 시그니처와 클래스 구조는 코드와 1:1로 일치해야 한다.

---

## 1. 어댑터 패턴 개요

### 1.1 왜 어댑터가 필요한가

자식 사이트는 3가지 호스팅 옵션이 있다:
- **Next.js (자체 도메인)** — Vercel 배포, Firestore 직접 쓰기, ISR revalidation
- **Tistory** — OAuth API, 카테고리 ID, 이미지 업로드 별도
- **Blogger** — Service Account, Atom API, HTML 직접 입력

각 호스팅의 발행 메커니즘이 완전히 다르다. 메타의 콘텐츠 파이프라인이 이 차이를 일일이 알면 안 된다. 그래서 **단 하나의 인터페이스 뒤로 숨긴다**.

```typescript
// ❌ 메타의 비즈니스 로직이 호스팅 종류를 알면 안 됨
if (site.hostingType === 'tistory') {
  await createTistoryPost(...)
} else if (site.hostingType === 'blogger') {
  await createBloggerPost(...)
}

// ✅ 어댑터로 추상화
const publisher = await getPublisher(site)
await publisher.publishPost(post)
```

### 1.2 어댑터 책임 범위

어댑터가 하는 일:
- 마크다운/메타데이터를 호스팅별 형식으로 변환
- 호스팅 API 호출
- 결과 URL/ID 반환
- 호스팅별 capability 명시 (예: Tistory는 검색 인덱스 못 만듦)

어댑터가 **하지 않는** 일:
- AI 콘텐츠 생성 (그건 M09 AI Service Layer)
- SEO 메타 생성 (그건 M11 SEO Generator)
- 내부 링크 삽입 (그건 M12 Internal Linking Engine)
- 댓글 생성 (그건 M10 Comment Bot)
- 출처 검증 (그건 M09 Verifier)

> **원칙:** 어댑터는 "마지막 km"만 담당한다. 콘텐츠 자체는 호스팅 무관하게 동일하다.

### 1.3 쏙튜브 코드와의 관계

쏙튜브는 이미 `lib/tistory.ts`와 `lib/blogger.ts`로 발행 로직을 분리해뒀다. 메타사이트는 이 코드를 **그대로 가져와서 어댑터 클래스로 감싸기만** 한다. 비즈니스 로직 변경 없음.

```
쏙튜브 lib/tistory.ts          → 메타 lib/publishers/tistory-publisher.ts
쏙튜브 lib/blogger.ts          → 메타 lib/publishers/blogger-publisher.ts
쏙튜브 lib/magazineHtml.ts     → 메타 lib/publishers/magazine-html.ts (공용)
```

---

## 2. SitePublisher 인터페이스

**파일 위치:** `lib/publishers/site-publisher.ts`

```typescript
import type { CuratedPost, ChildSite } from '@/types'

/**
 * 모든 호스팅 어댑터가 구현해야 하는 공통 계약.
 * 메타사이트의 모든 코드는 이 인터페이스만 본다.
 */
export interface SitePublisher {
  // === 식별 ===
  readonly hostingType: 'nextjs' | 'tistory' | 'blogger'
  readonly siteId: string
  readonly site: ChildSite

  // === 능력 명시 ===
  readonly capabilities: PublisherCapabilities

  // === 핵심 발행 메서드 ===

  /**
   * 글을 발행한다.
   * @returns 발행 결과 (URL, 외부 ID 등)
   * @throws PublishError — 발행 실패 시
   */
  publishPost(post: CuratedPost): Promise<PublishResult>

  /**
   * 발행된 글을 업데이트한다 (편집).
   * 호스팅이 지원하지 않으면 NotSupportedError 던짐.
   */
  updatePost(post: CuratedPost): Promise<PublishResult>

  /**
   * 발행된 글을 삭제 또는 비공개 처리한다.
   * 일부 호스팅은 hard delete, 일부는 status: draft로 변경.
   */
  unpublishPost(externalPostId: string): Promise<void>

  // === 발행 후 부가 작업 ===

  /**
   * 자식 사이트의 SEO 인프라를 갱신한다 (sitemap, RSS, llms.txt 등).
   * Next.js 호스팅만 진짜 동작. 외부 호스팅은 noop.
   */
  refreshSeoArtifacts(): Promise<void>

  /**
   * 발행된 페이지 캐시를 무효화한다.
   * Next.js: ISR on-demand revalidation
   * Tistory/Blogger: noop (외부 캐싱은 그쪽이 처리)
   */
  revalidate(paths: string[]): Promise<void>

  // === 상태 검사 ===

  /**
   * 어댑터의 인증/연결 상태를 검사한다.
   * 사이트 생성 시점, 정기 헬스체크에서 호출.
   */
  checkHealth(): Promise<HealthCheckResult>

  /**
   * 발행된 글의 통계를 가져온다 (조회수 등).
   * 일부 호스팅만 지원.
   */
  fetchPostStats?(externalPostId: string): Promise<PostStats>
}

/**
 * 어댑터별 능력 명시.
 * 메타 UI는 이 정보를 보고 비활성화/숨김 처리.
 */
export interface PublisherCapabilities {
  // 콘텐츠
  supportsMarkdown: boolean             // 마크다운 직접 입력 가능?
  supportsHtml: boolean                 // HTML 입력 가능?
  supportsImages: boolean               // 이미지 업로드?
  supportsCategories: boolean           // 카테고리 분류?
  supportsTags: boolean                 // 태그?
  
  // SEO
  supportsCustomMeta: boolean           // meta tags 커스텀?
  supportsCustomSlug: boolean           // URL slug 커스텀?
  supportsJsonLd: boolean               // JSON-LD 삽입?
  supportsCanonicalUrl: boolean
  supportsLlmsTxt: boolean              // /llms.txt 페이지 게시?
  supportsCustomRss: boolean
  
  // 사이트 단위 기능
  supportsCustomTheme: boolean
  supportsAdSlots: boolean              // 임의 위치에 광고 코드 삽입?
  supportsNewsletter: boolean
  supportsSearch: boolean
  supportsComments: boolean             // 자체 댓글 시스템?
  supportsAiCommentInjection: boolean   // AI 댓글 시스템 추가?
  
  // 분석
  supportsCustomAnalytics: boolean      // GA4 등 직접 삽입?
  
  // 운영
  supportsScheduledPublish: boolean     // 예약 발행?
  supportsBatchOperations: boolean
  rateLimitPerMinute?: number           // API rate limit
  maxPostBodyBytes?: number             // 본문 최대 크기
}

export interface PublishResult {
  externalPostId: string                // 호스팅 측 글 ID
  url: string                           // 발행된 URL
  publishedAt: Date
  metadata?: Record<string, any>        // 호스팅별 부가 정보
}

export interface HealthCheckResult {
  healthy: boolean
  latencyMs: number
  issues: string[]
  lastChecked: Date
}

export interface PostStats {
  viewCount?: number
  likeCount?: number
  commentCount?: number
  fetchedAt: Date
}

/**
 * 발행 실패 시 던지는 에러.
 * retriable이면 큐에 다시 넣고, 아니면 alerts에 기록.
 */
export class PublishError extends Error {
  constructor(
    message: string,
    public code: string,                // 'AUTH_FAILED', 'RATE_LIMIT', 'CONTENT_TOO_LARGE', ...
    public retriable: boolean,
    public originalError?: unknown,
  ) {
    super(message)
  }
}

export class NotSupportedError extends Error {
  constructor(public capability: string) {
    super(`Capability not supported: ${capability}`)
  }
}
```

---

## 3. Factory 패턴

**파일 위치:** `lib/publishers/factory.ts`

메타의 비즈니스 로직은 `getPublisher(siteId)` 한 줄로 어댑터를 받는다.

```typescript
import type { ChildSite } from '@/types'
import type { SitePublisher } from './site-publisher'
import { NextjsPublisher } from './nextjs-publisher'
import { TistoryPublisher } from './tistory-publisher'
import { BloggerPublisher } from './blogger-publisher'

/**
 * 자식 사이트 ID를 받아 적절한 Publisher를 반환한다.
 * 호스팅 타입을 보고 분기.
 */
export async function getPublisher(siteId: string): Promise<SitePublisher> {
  const site = await getChildSite(siteId)
  if (!site) throw new Error(`Site not found: ${siteId}`)
  
  switch (site.hostingType) {
    case 'nextjs':
      return new NextjsPublisher(site)
    case 'tistory':
      return new TistoryPublisher(site)
    case 'blogger':
      return new BloggerPublisher(site)
    default:
      throw new Error(`Unknown hosting type: ${(site as any).hostingType}`)
  }
}

/**
 * 모든 활성 자식 사이트의 Publisher를 반환한다.
 * 일괄 헬스체크 등에서 사용.
 */
export async function getAllPublishers(): Promise<SitePublisher[]> {
  const sites = await getActiveChildSites()
  return Promise.all(sites.map((s) => getPublisher(s.siteId)))
}
```

---

## 4. NextjsPublisher (자체 도메인)

**파일 위치:** `lib/publishers/nextjs-publisher.ts`

가장 강력한 어댑터. 모든 capability 지원.

```typescript
import type { CuratedPost, ChildSite } from '@/types'
import type { SitePublisher, PublisherCapabilities, PublishResult } from './site-publisher'
import { db } from '@/lib/firebase-admin'

export class NextjsPublisher implements SitePublisher {
  readonly hostingType = 'nextjs' as const
  readonly siteId: string
  readonly site: ChildSite
  
  readonly capabilities: PublisherCapabilities = {
    supportsMarkdown: true,
    supportsHtml: true,
    supportsImages: true,
    supportsCategories: true,
    supportsTags: true,
    supportsCustomMeta: true,
    supportsCustomSlug: true,
    supportsJsonLd: true,
    supportsCanonicalUrl: true,
    supportsLlmsTxt: true,
    supportsCustomRss: true,
    supportsCustomTheme: true,
    supportsAdSlots: true,
    supportsNewsletter: true,
    supportsSearch: true,
    supportsComments: true,
    supportsAiCommentInjection: true,
    supportsCustomAnalytics: true,
    supportsScheduledPublish: true,
    supportsBatchOperations: true,
    maxPostBodyBytes: undefined,        // 무제한
  }
  
  constructor(site: ChildSite) {
    this.site = site
    this.siteId = site.siteId
  }
  
  async publishPost(post: CuratedPost): Promise<PublishResult> {
    // Next.js 자체 도메인은 Firestore에 status='published'로 쓰기만 하면 됨.
    // 자식 사이트 Next.js 앱이 Firestore에서 읽어서 렌더링.
    
    const docRef = db
      .collection('sites').doc(this.siteId)
      .collection('curated_posts').doc(post.postId)
    
    const publishedAt = new Date()
    
    await docRef.update({
      status: 'published',
      publishedAt,
      'publishedTo.nextjs': {
        url: `https://${this.site.hostingConfig.domain}/articles/${post.slug}`,
        publishedAt,
      },
    })
    
    // ISR on-demand revalidation 호출
    await this.revalidate([
      `/articles/${post.slug}`,
      `/`,
      `/category/${post.category}`,
      '/sitemap.xml',
      '/rss.xml',
    ])
    
    return {
      externalPostId: post.postId,
      url: `https://${this.site.hostingConfig.domain}/articles/${post.slug}`,
      publishedAt,
    }
  }
  
  async updatePost(post: CuratedPost): Promise<PublishResult> {
    const docRef = db
      .collection('sites').doc(this.siteId)
      .collection('curated_posts').doc(post.postId)
    
    await docRef.update({
      ...post,
      updatedAt: new Date(),
    })
    
    await this.revalidate([`/articles/${post.slug}`])
    
    return {
      externalPostId: post.postId,
      url: `https://${this.site.hostingConfig.domain}/articles/${post.slug}`,
      publishedAt: post.publishedAt!,
    }
  }
  
  async unpublishPost(externalPostId: string): Promise<void> {
    await db
      .collection('sites').doc(this.siteId)
      .collection('curated_posts').doc(externalPostId)
      .update({ status: 'archived' })
    
    // 자식 사이트에서 404 처리되도록
    await this.revalidate([`/articles/${externalPostId}`])
  }
  
  async refreshSeoArtifacts(): Promise<void> {
    await this.revalidate([
      '/sitemap.xml',
      '/rss.xml',
      '/llms.txt',
      '/robots.txt',
    ])
  }
  
  async revalidate(paths: string[]): Promise<void> {
    const config = this.site.hostingConfig as NextjsHostingConfig
    const url = `https://${config.domain}/api/revalidate`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_REVALIDATION_TOKEN!,
      },
      body: JSON.stringify({ paths }),
    })
    
    if (!response.ok) {
      throw new PublishError(
        `Revalidation failed: ${response.status}`,
        'REVALIDATION_FAILED',
        true,
      )
    }
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now()
    const config = this.site.hostingConfig as NextjsHostingConfig
    
    try {
      const response = await fetch(`https://${config.domain}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      })
      
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
        issues: response.ok ? [] : [`HTTP ${response.status}`],
        lastChecked: new Date(),
      }
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        issues: [(err as Error).message],
        lastChecked: new Date(),
      }
    }
  }
  
  async fetchPostStats(externalPostId: string): Promise<PostStats> {
    // Vercel Analytics 또는 GA4 API에서 가져옴
    // 또는 사이트의 stats 엔드포인트 호출
    const config = this.site.hostingConfig as NextjsHostingConfig
    const response = await fetch(
      `https://${config.domain}/api/stats/${externalPostId}`,
      {
        headers: { 'X-Internal-Token': process.env.INTERNAL_REVALIDATION_TOKEN! },
      },
    )
    return await response.json()
  }
}
```

### 4.1 자식 사이트의 `/api/revalidate` 엔드포인트

자식 사이트(별도 Vercel 프로젝트)에 다음 엔드포인트가 있어야 한다.

```typescript
// 자식 사이트: app/api/revalidate/route.ts

import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('X-Internal-Token')
  if (token !== process.env.INTERNAL_REVALIDATION_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { paths } = await req.json()
  
  for (const path of paths) {
    revalidatePath(path)
  }
  
  return NextResponse.json({ revalidated: paths })
}
```

---

## 5. TistoryPublisher (쏙튜브 베이스)

**파일 위치:** `lib/publishers/tistory-publisher.ts`

쏙튜브의 검증된 `lib/tistory.ts`를 그대로 가져와서 클래스로 감싼다.

### 5.1 capability

```typescript
readonly capabilities: PublisherCapabilities = {
  supportsMarkdown: false,              // HTML만 받음
  supportsHtml: true,
  supportsImages: true,                 // 별도 업로드 API
  supportsCategories: true,             // 카테고리 ID 필요
  supportsTags: true,
  
  supportsCustomMeta: false,            // 티스토리가 자체 처리
  supportsCustomSlug: false,            // 티스토리 자동 생성
  supportsJsonLd: false,                // <script>는 막힐 수 있음
  supportsCanonicalUrl: false,
  supportsLlmsTxt: false,               // 사이트 단위 파일 게시 불가
  supportsCustomRss: false,             // 티스토리 기본 RSS만
  
  supportsCustomTheme: false,
  supportsAdSlots: false,               // 임의 위치 광고 코드 막힘
  supportsNewsletter: false,
  supportsSearch: false,
  supportsComments: true,               // 티스토리 기본 댓글
  supportsAiCommentInjection: false,    // 봇 댓글 어드민 자동 작성 불가
  
  supportsCustomAnalytics: false,       // <script> 일부만
  supportsScheduledPublish: true,       // 티스토리 자체 예약 기능
  supportsBatchOperations: false,
  rateLimitPerMinute: 10,
  maxPostBodyBytes: 1_000_000,          // 1MB 정도
}
```

### 5.2 구현 스켈레톤

```typescript
import type { CuratedPost, ChildSite, TistoryHostingConfig } from '@/types'
import type { SitePublisher, PublisherCapabilities, PublishResult } from './site-publisher'
import { NotSupportedError, PublishError } from './site-publisher'
import { buildHtmlForExport } from './magazine-html'

export class TistoryPublisher implements SitePublisher {
  readonly hostingType = 'tistory' as const
  readonly siteId: string
  readonly site: ChildSite
  
  readonly capabilities: PublisherCapabilities = {
    /* 위 5.1 그대로 */
  }
  
  private get config(): TistoryHostingConfig {
    return this.site.hostingConfig as TistoryHostingConfig
  }
  
  private get accessToken(): string {
    // Vercel env var에서 사이트별 토큰 조회
    const key = this.config.accessTokenSecretKey
    const token = process.env[key]
    if (!token) throw new PublishError(
      `Missing token: ${key}`,
      'AUTH_FAILED',
      false,
    )
    return token
  }
  
  constructor(site: ChildSite) {
    this.site = site
    this.siteId = site.siteId
  }
  
  async publishPost(post: CuratedPost): Promise<PublishResult> {
    // 1. 마크다운 → 티스토리용 HTML 변환
    const html = await buildHtmlForExport(post, {
      target: 'tistory',
      includeFaq: true,
      includeAdSlots: false,            // Tistory는 자체 광고 정책
      includeJsonLd: false,
    })
    
    // 2. 본문에 들어갈 이미지 업로드 (있으면)
    const uploadedImages = await this.uploadInlineImages(post)
    const finalHtml = this.replaceImageUrls(html, uploadedImages)
    
    // 3. 발행 API 호출 (쏙튜브 lib/tistory.ts의 createPost 그대로)
    const response = await fetch('https://www.tistory.com/apis/post/write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: this.accessToken,
        output: 'json',
        blogName: this.config.blogName,
        title: post.title,
        content: finalHtml,
        visibility: '3',                // 공개
        category: this.config.defaultCategoryId || '0',
        tag: post.tags.join(','),
        slogan: post.slug,
        acceptComment: '1',
      }),
    })
    
    if (!response.ok) {
      throw new PublishError(
        `Tistory publish failed: ${response.status}`,
        response.status === 401 ? 'AUTH_FAILED' 
          : response.status === 429 ? 'RATE_LIMIT'
          : 'API_ERROR',
        response.status === 429 || response.status >= 500,
      )
    }
    
    const data = await response.json()
    if (data.tistory.status !== '200') {
      throw new PublishError(
        `Tistory error: ${data.tistory.error_message}`,
        'API_ERROR',
        false,
      )
    }
    
    return {
      externalPostId: data.tistory.postId,
      url: data.tistory.url,
      publishedAt: new Date(),
      metadata: {
        category: this.config.defaultCategoryId,
      },
    }
  }
  
  async updatePost(post: CuratedPost): Promise<PublishResult> {
    const externalId = post.publishedTo?.tistory?.postId
    if (!externalId) {
      throw new PublishError('No external Tistory ID', 'NOT_PUBLISHED', false)
    }
    
    const html = await buildHtmlForExport(post, { target: 'tistory' })
    
    const response = await fetch('https://www.tistory.com/apis/post/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: this.accessToken,
        output: 'json',
        blogName: this.config.blogName,
        postId: externalId,
        title: post.title,
        content: html,
        tag: post.tags.join(','),
      }),
    })
    
    if (!response.ok) throw new PublishError(`Update failed`, 'API_ERROR', true)
    const data = await response.json()
    
    return {
      externalPostId: externalId,
      url: data.tistory.url,
      publishedAt: post.publishedAt!,
    }
  }
  
  async unpublishPost(externalPostId: string): Promise<void> {
    // 티스토리는 hard delete만 지원. 비공개 처리도 가능 (visibility=0).
    // 안전을 위해 비공개 처리만 한다.
    const response = await fetch('https://www.tistory.com/apis/post/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: this.accessToken,
        output: 'json',
        blogName: this.config.blogName,
        postId: externalPostId,
        visibility: '0',                // 비공개
      }),
    })
    
    if (!response.ok) throw new PublishError(`Unpublish failed`, 'API_ERROR', true)
  }
  
  async refreshSeoArtifacts(): Promise<void> {
    // Tistory는 SEO 인프라를 직접 게시할 수 없음. noop.
    return
  }
  
  async revalidate(paths: string[]): Promise<void> {
    // Tistory는 자체 캐싱. noop.
    return
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const response = await fetch(
        `https://www.tistory.com/apis/blog/info?access_token=${this.accessToken}&output=json`,
        { signal: AbortSignal.timeout(10000) },
      )
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
        issues: response.ok ? [] : [`HTTP ${response.status}`],
        lastChecked: new Date(),
      }
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        issues: [(err as Error).message],
        lastChecked: new Date(),
      }
    }
  }
  
  // === 내부 메서드 ===
  
  private async uploadInlineImages(post: CuratedPost): Promise<Map<string, string>> {
    // 본문에서 외부 이미지 URL 추출 → 티스토리에 업로드 → 매핑 반환
    // 쏙튜브 lib/tistory.ts의 uploadFile 호출
    const result = new Map<string, string>()
    // ... 구현 ...
    return result
  }
  
  private replaceImageUrls(html: string, mapping: Map<string, string>): string {
    let result = html
    for (const [original, uploaded] of mapping) {
      result = result.split(original).join(uploaded)
    }
    return result
  }
}
```

### 5.3 쏙튜브 코드에서 가져올 부분

`lib/tistory.ts`에서 이미 검증된 함수들:
- `createPost(opts)` — 위에서 publishPost 본문에 인라인됨
- `modifyPost(opts)` — updatePost 본문에 인라인됨
- `uploadFile(blob)` — uploadInlineImages 내부에서 사용
- `getCategoryList(blog)` — 카테고리 동기화 (`site-creation-flow.md`에서 사용)
- `validateAccessToken(token)` — checkHealth에서 사용

---

## 6. BloggerPublisher (쏙튜브 베이스)

**파일 위치:** `lib/publishers/blogger-publisher.ts`

### 6.1 capability

```typescript
readonly capabilities: PublisherCapabilities = {
  supportsMarkdown: false,
  supportsHtml: true,
  supportsImages: true,                 // <img> 직접 삽입, 외부 호스팅 가능
  supportsCategories: false,            // Blogger는 라벨만
  supportsTags: true,                   // labels로 매핑
  
  supportsCustomMeta: true,             // 일부 가능
  supportsCustomSlug: true,             // permalink 지정
  supportsJsonLd: true,                 // <script> 본문 삽입 가능
  supportsCanonicalUrl: true,
  supportsLlmsTxt: false,
  supportsCustomRss: false,             // Blogger 기본 RSS만
  
  supportsCustomTheme: true,            // 테마 편집 가능
  supportsAdSlots: true,                // <script> 광고 코드 가능
  supportsNewsletter: false,
  supportsSearch: false,                // 기본 Blogger 검색만
  supportsComments: true,
  supportsAiCommentInjection: false,
  
  supportsCustomAnalytics: true,
  supportsScheduledPublish: true,
  supportsBatchOperations: false,
  rateLimitPerMinute: 100,
  maxPostBodyBytes: 1_000_000,
}
```

### 6.2 구현 스켈레톤

```typescript
import { google } from 'googleapis'
import type { CuratedPost, ChildSite, BloggerHostingConfig } from '@/types'
import type { SitePublisher, PublishResult } from './site-publisher'
import { PublishError } from './site-publisher'
import { buildHtmlForExport } from './magazine-html'

export class BloggerPublisher implements SitePublisher {
  readonly hostingType = 'blogger' as const
  readonly siteId: string
  readonly site: ChildSite
  
  readonly capabilities: PublisherCapabilities = { /* 6.1 */ }
  
  private get config(): BloggerHostingConfig {
    return this.site.hostingConfig as BloggerHostingConfig
  }
  
  private getBloggerClient() {
    // Vercel env var에서 base64 인코딩된 Service Account JSON 디코드
    const key = this.config.serviceAccountSecretKey
    const json = Buffer.from(process.env[key]!, 'base64').toString('utf-8')
    const credentials = JSON.parse(json)
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/blogger'],
    })
    
    return google.blogger({ version: 'v3', auth })
  }
  
  constructor(site: ChildSite) {
    this.site = site
    this.siteId = site.siteId
  }
  
  async publishPost(post: CuratedPost): Promise<PublishResult> {
    const blogger = this.getBloggerClient()
    
    const html = await buildHtmlForExport(post, {
      target: 'blogger',
      includeFaq: true,
      includeAdSlots: true,             // Blogger는 광고 슬롯 OK
      includeJsonLd: true,              // <script> OK
    })
    
    try {
      const response = await blogger.posts.insert({
        blogId: this.config.blogId,
        requestBody: {
          title: post.title,
          content: html,
          labels: post.tags,             // tags → labels 매핑
        },
      })
      
      return {
        externalPostId: response.data.id!,
        url: response.data.url!,
        publishedAt: new Date(response.data.published!),
        metadata: {
          selfLink: response.data.selfLink,
        },
      }
    } catch (err: any) {
      throw new PublishError(
        `Blogger publish failed: ${err.message}`,
        err.code === 401 ? 'AUTH_FAILED'
          : err.code === 429 ? 'RATE_LIMIT'
          : 'API_ERROR',
        err.code === 429 || err.code >= 500,
        err,
      )
    }
  }
  
  async updatePost(post: CuratedPost): Promise<PublishResult> {
    const externalId = post.publishedTo?.blogger?.postId
    if (!externalId) throw new PublishError('Not published', 'NOT_PUBLISHED', false)
    
    const blogger = this.getBloggerClient()
    const html = await buildHtmlForExport(post, { target: 'blogger' })
    
    const response = await blogger.posts.update({
      blogId: this.config.blogId,
      postId: externalId,
      requestBody: {
        title: post.title,
        content: html,
        labels: post.tags,
      },
    })
    
    return {
      externalPostId: externalId,
      url: response.data.url!,
      publishedAt: post.publishedAt!,
    }
  }
  
  async unpublishPost(externalPostId: string): Promise<void> {
    const blogger = this.getBloggerClient()
    // Blogger는 revert (DRAFT 상태로) 또는 delete 지원
    await blogger.posts.revert({
      blogId: this.config.blogId,
      postId: externalPostId,
    })
  }
  
  async refreshSeoArtifacts(): Promise<void> {
    return  // Blogger는 자동
  }
  
  async revalidate(paths: string[]): Promise<void> {
    return  // 외부 캐싱
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const blogger = this.getBloggerClient()
      await blogger.blogs.get({ blogId: this.config.blogId })
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        issues: [],
        lastChecked: new Date(),
      }
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        issues: [(err as Error).message],
        lastChecked: new Date(),
      }
    }
  }
}
```

### 6.3 쏙튜브 코드에서 가져올 부분

`lib/blogger.ts`에서:
- Service Account JSON 디코딩 로직
- `googleapis` 사용 패턴
- 에러 코드별 분기 (401/403/429/500)

---

## 7. 능력 매트릭스 (Capability Matrix)

메타 어드민 UI는 이 매트릭스를 보고 비활성화/숨김 처리.

| 기능 | Next.js | Tistory | Blogger |
|------|---------|---------|---------|
| **콘텐츠** | | | |
| 마크다운 렌더링 | ✅ | ❌ (HTML 변환) | ❌ (HTML 변환) |
| 이미지 업로드 | ✅ | ✅ | ✅ |
| 카테고리 분류 | ✅ | ✅ (ID 기반) | ⚠️ (라벨 사용) |
| 태그 | ✅ | ✅ | ✅ (라벨) |
| **SEO** | | | |
| 커스텀 meta tags | ✅ | ❌ | ⚠️ (제한적) |
| 커스텀 URL slug | ✅ | ❌ | ✅ |
| JSON-LD 삽입 | ✅ | ❌ | ✅ |
| canonical URL | ✅ | ❌ | ✅ |
| `/llms.txt` 게시 | ✅ | ❌ | ❌ |
| 커스텀 RSS | ✅ | ❌ (기본만) | ❌ (기본만) |
| **사이트 기능** | | | |
| 광고 슬롯 (임의 위치) | ✅ | ❌ | ✅ |
| 뉴스레터 | ✅ | ❌ | ❌ |
| 시맨틱 검색 | ✅ | ❌ | ❌ |
| AI 댓글 시스템 | ✅ | ❌ | ❌ |
| 커스텀 분석 | ✅ | ❌ | ✅ |
| **운영** | | | |
| 예약 발행 | ✅ | ✅ | ✅ |
| ISR 즉시 갱신 | ✅ | N/A | N/A |
| API 한도 | 무제한 | 분당 ~10 | 분당 ~100 |

### 7.1 능력 매트릭스가 메타 UI에 미치는 영향

```typescript
// 메타 어드민의 사이트 상세 페이지

const publisher = await getPublisher(siteId)
const caps = publisher.capabilities

// "뉴스레터" 탭은 nextjs만 표시
if (caps.supportsNewsletter) {
  showNewsletterTab()
}

// "AI 댓글" 설정은 nextjs만 활성화
if (caps.supportsAiCommentInjection) {
  enableCommentSettings()
} else {
  disableCommentSettings('이 호스팅은 AI 댓글을 지원하지 않습니다')
}

// "광고 슬롯" 설정은 tistory에서 비활성화
if (!caps.supportsAdSlots) {
  showWarning('Tistory는 자체 광고 정책을 따릅니다')
}
```

---

## 8. magazineHtml: 외부 호스팅용 HTML 빌더

**파일 위치:** `lib/publishers/magazine-html.ts`

쏙튜브의 `magazineHtml.ts` 베이스. 마크다운 + 메타데이터 → 호스팅별 HTML 변환.

```typescript
import { marked } from 'marked'
import type { CuratedPost } from '@/types'

export interface BuildHtmlOptions {
  target: 'nextjs' | 'tistory' | 'blogger'
  includeFaq?: boolean
  includeAdSlots?: boolean
  includeJsonLd?: boolean
  includeAuthorBio?: boolean
  imageBaseUrl?: string                 // 외부 호스팅 시 이미지 절대 URL
}

export async function buildHtmlForExport(
  post: CuratedPost,
  opts: BuildHtmlOptions,
): Promise<string> {
  const sections: string[] = []
  
  // 1. 메타 헤더 (옵션)
  if (opts.includeJsonLd) {
    sections.push(`<script type="application/ld+json">${JSON.stringify(post.seo.jsonLd)}</script>`)
  }
  
  // 2. 부제목 + 발행 정보
  if (post.subtitle) {
    sections.push(`<p class="subtitle"><em>${escapeHtml(post.subtitle)}</em></p>`)
  }
  
  // 3. 히어로 이미지
  if (post.heroImageUrl) {
    sections.push(`<img src="${absoluteUrl(post.heroImageUrl, opts.imageBaseUrl)}" alt="${escapeHtml(post.title)}" />`)
  }
  
  // 4. 본문 (마크다운 → HTML)
  let body = await marked.parse(post.body)
  
  // 5. 광고 슬롯 마커 → 실제 광고 코드로 변환 (옵션)
  if (opts.includeAdSlots) {
    body = injectAdSlots(body, post.adSlots, post.affiliateLinks)
  } else {
    // 마커 제거 (Tistory)
    body = removeAdSlotMarkers(body)
  }
  
  sections.push(body)
  
  // 6. 심층 분석 (있으면)
  if (post.deepDive) {
    sections.push('<h2>심층 분석</h2>')
    sections.push(`<p>${escapeHtml(post.deepDive.coreConceptExplanation)}</p>`)
    sections.push(`<h3>배경</h3><p>${escapeHtml(post.deepDive.backgroundContext)}</p>`)
    if (post.deepDive.practicalSteps?.length) {
      sections.push('<h3>실전 단계</h3><ol>')
      for (const step of post.deepDive.practicalSteps) {
        sections.push(`<li>${escapeHtml(step)}</li>`)
      }
      sections.push('</ol>')
    }
  }
  
  // 7. FAQ (옵션, Google PAA 최적화)
  if (opts.includeFaq && post.faq?.length) {
    sections.push('<h2>자주 묻는 질문</h2>')
    for (const item of post.faq) {
      sections.push(`<h3>${escapeHtml(item.question)}</h3>`)
      sections.push(`<p>${escapeHtml(item.answer)}</p>`)
    }
  }
  
  // 8. YouTube 댓글 인사이트 (있으면)
  if (post.comments) {
    sections.push('<h2>관련 의견 모음</h2>')
    sections.push(`<p>${escapeHtml(post.comments.popularSummary)}</p>`)
  }
  
  // 9. 출처
  if (post.citations?.length) {
    sections.push('<h2>출처</h2><ul>')
    for (const c of post.citations) {
      const linkText = c.url ? `<a href="${c.url}">${escapeHtml(c.source)}</a>` : escapeHtml(c.source)
      sections.push(`<li>${linkText}${c.publishedYear ? ` (${c.publishedYear})` : ''}</li>`)
    }
    sections.push('</ul>')
  }
  
  // 10. 호스팅별 변환
  let html = sections.join('\n\n')
  
  if (opts.target === 'tistory') {
    html = transformForTistory(html)
  } else if (opts.target === 'blogger') {
    html = transformForBlogger(html)
  }
  
  return html
}

function transformForTistory(html: string): string {
  // Tistory는 일부 태그 막힘. <script>, <style>, <iframe>(YouTube 외) 제거.
  let result = html
  result = result.replace(/<script[\s\S]*?<\/script>/g, '')
  result = result.replace(/<style[\s\S]*?<\/style>/g, '')
  // class/id 속성은 유지 (티스토리 자체 CSS와 충돌 가능성 검토 필요)
  return result
}

function transformForBlogger(html: string): string {
  // Blogger는 거의 모든 HTML 허용. <script> JSON-LD는 그대로.
  return html
}

function injectAdSlots(html: string, adSlots: any[], affiliateLinks: any[]): string {
  // 본문 위치별로 광고 코드 / 어필리에이트 박스 삽입
  // 자세한 건 monetization.md 참조
  return html
}

function removeAdSlotMarkers(html: string): string {
  return html.replace(/<!-- AD_SLOT:.*? -->/g, '')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function absoluteUrl(url: string, baseUrl?: string): string {
  if (url.startsWith('http')) return url
  if (!baseUrl) return url
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}
```

---

## 9. 발행 후 부가 작업 (자동 트리거)

발행이 성공하면 메타 코드는 다음 작업을 **병렬로** 실행한다.

```typescript
// lib/pipeline/publish-orchestrator.ts

async function publishPost(post: CuratedPost): Promise<void> {
  const publisher = await getPublisher(post.siteId!)
  
  try {
    // 1. 메인 발행
    const result = await publisher.publishPost(post)
    
    // 2. Firestore 업데이트
    await updatePostWithPublishResult(post, result)
    
    // 3. 부가 작업 (병렬, 실패해도 메인 발행은 성공)
    await Promise.allSettled([
      publisher.refreshSeoArtifacts(),
      pingIndexNow(post.siteId!, result.url),       // M11
      schedulePostComments(post),                    // M10
      createBackupCommit(post),                      // GitHub 마크다운 백업
      logSuccess(post, result),                      // M15
    ])
    
  } catch (err) {
    if (err instanceof PublishError && err.retriable) {
      await enqueueRetry(post, err)                 // 재시도 큐
    } else {
      await markPostAsFailed(post, err)
      await createAlert(post, err)                  // M16
    }
  }
}
```

상세는 `vercel-cron-spec.md`와 `monitoring-health.md` 참조.

---

## 10. 발행 실패 처리와 재시도 정책

### 10.1 PublishError code별 대응

| code | 의미 | retriable | 즉시 대응 |
|------|------|-----------|----------|
| `AUTH_FAILED` | 토큰 만료/유효하지 않음 | false | 운영자에 critical 알림 |
| `RATE_LIMIT` | API 한도 초과 | true | 5분 대기 후 재시도 |
| `CONTENT_TOO_LARGE` | 본문 크기 초과 | false | 본문 축약 후 재발행 (수동) |
| `API_ERROR` (5xx) | 서버 오류 | true | exponential backoff 재시도 |
| `API_ERROR` (4xx) | 요청 오류 | false | 운영자에 high 알림 |
| `REVALIDATION_FAILED` | ISR 갱신 실패 | true | 5분 후 재시도 (메인 발행은 성공) |
| `NOT_PUBLISHED` | 업데이트 시 외부 ID 없음 | false | 발행으로 전환 |

### 10.2 재시도 큐

Firestore 컬렉션 `failed_jobs`에 실패한 발행을 저장. Vercel Cron이 매시간 재처리.

```typescript
interface FailedJob {
  jobId: string
  type: 'publish' | 'revalidate' | 'index_now'
  siteId: string
  postId: string
  error: { code: string; message: string }
  retryCount: number
  maxRetries: number                  // 5
  nextRetryAt: Timestamp
  lastTriedAt: Timestamp
  createdAt: Timestamp
}
```

5회 실패 시 영구 실패로 처리하고 critical 알림.

---

## 11. 새 어댑터 추가 가이드

WordPress / Medium / Substack 등 새 호스팅을 추가할 때.

### 단계

1. **호스팅 capability 조사**
   - HTML/마크다운 어느 쪽 받는가
   - SEO 커스텀 가능 범위
   - 광고/JSON-LD 허용 여부
   - API rate limit
   - 인증 방식 (OAuth / API Key / Service Account)

2. **`PublisherCapabilities` 작성**

3. **`SitePublisher` 인터페이스 구현**
   - `publishPost`, `updatePost`, `unpublishPost`
   - `checkHealth`
   - `revalidate`, `refreshSeoArtifacts` (지원 안 하면 noop)

4. **`buildHtmlForExport`에 새 target 추가**
   - `transformForWordpress` 같은 변환 함수

5. **`getPublisher` factory에 분기 추가**

6. **`child_sites.hostingType` 타입에 추가**

7. **메타 어드민 사이트 생성 폼에 옵션 추가**

8. **테스트 사이트 1개로 검증** (production 사이트 N개에 배포 전)

### 예: 가상의 WordPress 어댑터

```typescript
// lib/publishers/wordpress-publisher.ts
export class WordPressPublisher implements SitePublisher {
  readonly hostingType = 'wordpress' as const
  
  readonly capabilities: PublisherCapabilities = {
    supportsMarkdown: false,
    supportsHtml: true,
    supportsImages: true,
    supportsCategories: true,
    supportsTags: true,
    supportsCustomMeta: true,           // Yoast/RankMath 플러그인 가정
    supportsCustomSlug: true,
    supportsJsonLd: true,
    supportsCanonicalUrl: true,
    supportsLlmsTxt: false,
    supportsCustomRss: true,
    supportsCustomTheme: true,
    supportsAdSlots: true,
    supportsNewsletter: false,
    supportsSearch: true,
    supportsComments: true,
    supportsAiCommentInjection: false,
    supportsCustomAnalytics: true,
    supportsScheduledPublish: true,
    supportsBatchOperations: true,
    rateLimitPerMinute: 60,
  }
  
  // ... publishPost 등 구현
}
```

---

## 12. 테스트 전략

### 12.1 단위 테스트

각 어댑터마다 다음을 mock으로 검증:
- 정상 발행 → 올바른 API 호출 페이로드
- 인증 실패 → `AUTH_FAILED` 에러
- Rate limit → `RATE_LIMIT` 에러 + retriable=true
- 본문 크기 초과 → `CONTENT_TOO_LARGE`

### 12.2 통합 테스트

별도의 테스트 자식 사이트 3종으로 실제 발행 → 삭제 사이클 검증.

```
test-site-nextjs.example.com
test-mytravel.tistory.com
test-meta-site.blogspot.com
```

매 배포 전 `pnpm test:integration`으로 전체 검증.

### 12.3 카오스 테스트

운영 중 어댑터 1개를 강제로 실패시켜 다른 사이트가 영향받지 않는지 검증.

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ `SitePublisher` 인터페이스 + `PublisherCapabilities` + `PublishResult` 등 모든 타입
- ✅ Factory 패턴 (`getPublisher(siteId)` 한 줄로 받기)
- ✅ `NextjsPublisher` 전체 구현 (capability + 모든 메서드 본문)
- ✅ `TistoryPublisher` 구현 + 쏙튜브 코드 매핑
- ✅ `BloggerPublisher` 구현 + 쏙튜브 코드 매핑
- ✅ Capability Matrix 표 (UI에서 그대로 활용)
- ✅ `buildHtmlForExport` 함수 시그니처와 본문
- ✅ 발행 후 부가 작업 (병렬 실행 패턴)
- ✅ PublishError code 7종 + 재시도 정책 + `failed_jobs` 큐
- ✅ 새 어댑터 추가 가이드 (WordPress 예시 포함)
- ✅ 테스트 전략 3계층

이 문서가 정의하지 않은 것:
- ❌ 어댑터별 인증 토큰 발급 절차 (Tistory OAuth 등) → `site-creation-flow.md`
- ❌ 발행 후 부가 작업의 구체 스케줄링 (Cron 등록) → `vercel-cron-spec.md`
- ❌ ad slot 코드의 구체 형식과 위치 결정 알고리즘 → `monetization.md`
- ❌ JSON-LD의 정확한 schema (Article / NewsArticle / FAQPage) → `seo-automation.md`
- ❌ 마크다운 렌더링 시 커스텀 변환 (코드 하이라이팅 등) → `content-pipeline.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md v1.0 + architecture.md v1.0 + database-schema.md v1.0 기준. |

---

*이 문서는 메타사이트의 어댑터 레이어를 정의한다. 호스팅별 차이를 흡수하는 단일 인터페이스의 단일 출처.*

*Tier A 완료. 다음 문서: `meta-control-spec.md` (Tier B 1번)*
