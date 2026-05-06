# META-SITE: SEO 자동화 (seo-automation.md)

> 자식 사이트의 모든 SEO 인프라를 자동 생성/유지하는 시스템.
> meta tags / JSON-LD / llms.txt / sitemap.xml / RSS / robots.txt / IndexNow / canonical / hreflang.
> core.md "10. SEO 자동화"의 상세 + publisher-adapters.md 능력 매트릭스에 따른 호스팅별 분기.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ ai-comment-system.md       (Tier C 마지막)
  └─ seo-automation.md          ★ 이 문서 — SEO 인프라 (Tier D 시작)
        └─ internal-linking.md       (다음 — 권위 그물 자동 링크)
```

이 문서는:
- 새 글 발행 시 자동 생성되는 모든 SEO 메타데이터를 정의한다.
- 자식 사이트 단위 SEO 인프라(/sitemap.xml 등)의 동적 생성 패턴을 정의한다.
- AI 검색 엔진(ChatGPT, Perplexity, Claude)을 위한 `/llms.txt`를 정의한다.

---

## 1. 핵심 원칙

### 1.1 두 종류의 검색엔진 시대

```
[전통 검색]
   Google / Bing / Naver / Yandex
   → meta tags, JSON-LD, sitemap, RSS

[AI 검색 (새로 부상)]
   ChatGPT / Perplexity / Claude / Gemini
   → llms.txt, 잘 구조화된 마크다운, schema.org
```

> **"두 종류 모두 잘 대접한다."**

### 1.2 자동화 원칙

- 모든 SEO 메타는 **글 생성 시 Editor가 함께 만든다** (ai-roles-and-prompts.md 6장)
- 사이트 단위 인프라(sitemap 등)는 **자식 사이트에서 동적 렌더링** (DB 직접 읽기)
- 메타사이트는 **변경 트리거**만 (revalidation 호출)

### 1.3 호스팅별 차이 (publisher-adapters.md 7장 능력 매트릭스)

| 기능 | Next.js | Tistory | Blogger |
|------|---------|---------|---------|
| 커스텀 meta tags | ✅ | ❌ | ⚠ 일부 |
| JSON-LD | ✅ | ❌ (script 막힘) | ✅ |
| canonical | ✅ | ❌ | ✅ |
| `/llms.txt` | ✅ | ❌ | ❌ |
| 커스텀 sitemap | ✅ | ❌ (기본만) | ❌ (기본만) |
| 커스텀 RSS | ✅ | ❌ (기본만) | ❌ (기본만) |
| robots.txt | ✅ | ❌ | ❌ |
| IndexNow | ✅ | ✅ | ✅ |
| hreflang | ✅ | ❌ | ⚠ |

이 문서는 **Next.js 호스팅 위주**로 정의. 외부 호스팅 제약은 각 섹션 끝에 노트.

---

## 2. 페이지 단위 SEO 메타 (글 단위)

### 2.1 모든 페이지가 가져야 할 항목

```html
<head>
  <!-- 기본 -->
  <title>{metaTitle}</title>
  <meta name="description" content="{metaDescription}">
  <meta name="keywords" content="{keywords.join(',')}">
  <link rel="canonical" href="{canonicalUrl}">
  
  <!-- 다국어 -->
  <link rel="alternate" hreflang="ko" href="https://travel-kr.com/articles/X">
  <link rel="alternate" hreflang="en" href="https://travel-en.com/articles/X">
  <link rel="alternate" hreflang="x-default" href="https://travel-kr.com/articles/X">
  
  <!-- Open Graph -->
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{metaDescription}">
  <meta property="og:image" content="{ogImageUrl}">
  <meta property="og:url" content="{canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="{siteName}">
  <meta property="og:locale" content="ko_KR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{metaDescription}">
  <meta name="twitter:image" content="{ogImageUrl}">
  
  <!-- Article 전용 -->
  <meta property="article:published_time" content="{publishedAt}">
  <meta property="article:modified_time" content="{updatedAt}">
  <meta property="article:author" content="{personaName}">
  <meta property="article:section" content="{sectionName}">
  <meta property="article:tag" content="{tag1}">
  <meta property="article:tag" content="{tag2}">
  
  <!-- JSON-LD -->
  <script type="application/ld+json">{...}</script>
</head>
```

### 2.2 길이 규칙

| 필드 | 최소 | 최대 | 권장 |
|------|-----|------|------|
| title | 30자 | 70자 | 55~60자 |
| description | 70자 | 160자 | 140~155자 |
| og:image | 1200x630 | - | 1200x630 (최적) |

Editor가 이 길이 안에서 생성. 초과 시 자동 truncate (마지막 단어 단위).

### 2.3 자동 생성 함수

```typescript
// lib/seo/generate-meta.ts

export function generatePageMeta(post: CuratedPost, site: ChildSite): PageMeta {
  const baseUrl = `https://${site.hostingConfig.domain || site.hostingConfig.blogUrl}`
  const canonicalUrl = `${baseUrl}/articles/${post.slug}`
  
  return {
    title: truncate(post.seo.metaTitle, 60),
    description: truncate(post.seo.metaDescription, 155),
    keywords: post.seo.targetKeywords,
    canonicalUrl,
    
    // hreflang siblings (settings/seo에서)
    hreflang: site.seoConfig.hreflangSiblings || [],
    
    og: {
      title: post.title,
      description: post.seo.metaDescription,
      image: post.seo.ogImageUrl || site.seoConfig.ogImageUrl,
      url: canonicalUrl,
      type: 'article',
      siteName: site.name,
      locale: localeFromLanguage(site.language),
    },
    
    twitter: {
      card: post.seo.twitterCard,
      title: post.title,
      description: post.seo.metaDescription,
      image: post.seo.ogImageUrl || site.seoConfig.ogImageUrl,
    },
    
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      author: site.persona.name,
      section: post.sectionId ? site.sections.find(s => s.sectionId === post.sectionId)?.name : undefined,
      tags: post.tags,
    },
  }
}
```

### 2.4 자식 사이트(Next.js)에서 사용

```typescript
// 자식 사이트: app/articles/[slug]/page.tsx

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug)
  const site = await getSiteConfig()
  const meta = generatePageMeta(post, site)
  
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: meta.canonicalUrl,
      languages: Object.fromEntries(
        meta.hreflang.map(h => [h.lang, h.url])
      ),
    },
    openGraph: meta.og,
    twitter: meta.twitter,
  }
}
```

---

## 3. JSON-LD Schema

### 3.1 5종 schema 사용

```
1. Article / NewsArticle  — 글 자체
2. FAQPage                — FAQ 섹션이 있으면
3. BreadcrumbList         — 페이지 경로
4. Organization           — 사이트 운영자 정보 (홈/About 페이지)
5. WebSite                — 검색박스 (홈)
```

### 3.2 Article (또는 NewsArticle)

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "{post.title}",
  "alternativeHeadline": "{post.subtitle}",
  "description": "{post.seo.metaDescription}",
  "image": "{post.seo.ogImageUrl}",
  "datePublished": "{post.publishedAt}",
  "dateModified": "{post.updatedAt}",
  "author": {
    "@type": "Person",
    "name": "{site.persona.name}",
    "url": "{baseUrl}/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "{site.name}",
    "logo": {
      "@type": "ImageObject",
      "url": "{baseUrl}/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{canonicalUrl}"
  },
  "articleBody": "{post.body의 마크다운 → 평문 변환}",
  "wordCount": {wordCount},
  "keywords": "{post.tags.join(',')}",
  "articleSection": "{sectionName}"
}
```

`@type` 결정:
- `news` 섹션 → `NewsArticle`
- 그 외 → `Article`
- `phase: 'authority'` → `Article`
- Pillar Page → `Article` + `@type: BlogPosting` 추가

### 3.3 FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{faq.question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{faq.answer}"
      }
    }
  ]
}
```

> Article과 FAQPage 둘 다 있을 수 있음. `<script>` 태그 2개 또는 `@graph` 배열로 묶기.

### 3.4 BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "홈",
      "item": "{baseUrl}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "{section.name}",
      "item": "{baseUrl}/{section.slug}"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{post.title}"
    }
  ]
}
```

### 3.5 Organization (홈 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{site.name}",
  "url": "{baseUrl}",
  "logo": "{baseUrl}/logo.png",
  "description": "{site.seoConfig.siteDescription}",
  "sameAs": [
    "https://twitter.com/...",
    "https://linkedin.com/..."
  ]
}
```

### 3.6 WebSite + SearchAction (홈 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{site.name}",
  "url": "{baseUrl}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "{baseUrl}/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 3.7 통합 @graph

여러 schema를 한 페이지에 둘 때:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "NewsArticle", ... },
    { "@type": "FAQPage", ... },
    { "@type": "BreadcrumbList", ... }
  ]
}
```

### 3.8 자동 생성 함수

```typescript
// lib/seo/generate-jsonld.ts

export function generateArticleJsonLd(
  post: CuratedPost,
  site: ChildSite,
): Record<string, any> {
  const baseUrl = getBaseUrl(site)
  const articleType = post.sectionId === 'news' ? 'NewsArticle' : 'Article'
  
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: post.title,
    alternativeHeadline: post.subtitle,
    description: post.seo.metaDescription,
    image: post.seo.ogImageUrl,
    datePublished: toIsoString(post.publishedAt),
    dateModified: toIsoString(post.updatedAt),
    author: {
      '@type': 'Person',
      name: site.persona.name,
      url: `${baseUrl}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/articles/${post.slug}`,
    },
    articleBody: markdownToPlainText(post.body),
    wordCount: countWords(post.body),
    keywords: post.tags.join(', '),
    articleSection: site.sections.find(s => s.sectionId === post.sectionId)?.name,
  }
  
  const breadcrumbSchema = generateBreadcrumb(post, site)
  
  const schemas = [articleSchema, breadcrumbSchema]
  
  if (post.faq && post.faq.length > 0) {
    schemas.push(generateFaqSchema(post.faq))
  }
  
  // @graph로 통합
  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map(({ '@context': _, ...rest }) => rest),
  }
}
```

---

## 4. /llms.txt — AI 검색 엔진용

### 4.1 왜 llms.txt인가

> **"AI 검색이 인용할 수 있도록 사이트 정체성을 명시한다."**

ChatGPT, Perplexity, Claude 같은 AI 검색이 새로운 트래픽 원천이 되고 있다. 이들에게 "이 사이트는 무엇을 다루며 어떤 페이지가 핵심인지" 명시하는 표준 파일.

위치: `https://travel-kr.com/llms.txt`

### 4.2 형식 (Anthropic 제안 표준)

```markdown
# Travel KR

> 한국어 여행 매거진. 국내/해외 여행지 정보, 가이드, 후기를 큐레이션합니다.

## About

이 사이트는 여행 가이드 김메타가 운영하는 한국어 여행 매거진입니다.
2026년 5월 시작. 일 평균 3편 발행.

## Authority Pages

- [여행 완전 가이드](https://travel-kr.com/guide/travel-complete): 본 사이트의 핵심 통합 가이드
- [국내 여행 시작하기](https://travel-kr.com/articles/domestic-travel-basics): 입문자를 위한 기초
- [해외 여행 첫 단계](https://travel-kr.com/articles/overseas-travel-first): 해외 여행 준비
- ... (Tier 1 권위 글 10편)

## Sections

- [국내 여행](https://travel-kr.com/news): 국내 여행지 최신 정보 (매일 업데이트)
- [해외 여행](https://travel-kr.com/tools): 해외 여행 가이드 (주 3회)
- [여행 팁](https://travel-kr.com/usecases): 실전 여행 노하우 (매일)

## Optional

- [구독하기](https://travel-kr.com/newsletter): 주간 뉴스레터
- [About](https://travel-kr.com/about): 사이트 소개
- [Privacy](https://travel-kr.com/privacy): 개인정보 정책
```

### 4.3 동적 생성 (settings/seo의 llmsTextTemplate 기반)

```typescript
// 자식 사이트: app/llms.txt/route.ts

export async function GET() {
  const site = await getSiteConfig()
  const seoSettings = await getSeoSettings()
  
  // 권위 글 + Pillar 가져오기
  const authorityPages = await db
    .collection('sites').doc(site.siteId).collection('curated_posts')
    .where('phase', '==', 'authority')
    .where('tier', '==', 1)
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'asc')
    .limit(15)
    .get()
  
  const pillarPage = await getPillarPage(site.siteId)
  
  // 템플릿 렌더링
  const llmsText = renderLlmsText({
    siteName: site.name,
    description: site.seoConfig.siteDescription,
    aboutText: seoSettings.llmsAboutText,
    pillarUrl: pillarPage ? `${baseUrl}/${pillarPage.slug}` : null,
    authorityPages: authorityPages.docs.map((d) => ({
      title: d.data().title,
      url: `${baseUrl}/articles/${d.data().slug}`,
      excerpt: d.data().excerpt,
    })),
    sections: site.sections.filter((s) => s.enabled).map((s) => ({
      name: s.name,
      url: `${baseUrl}/${s.slug}`,
      frequency: humanizeFrequency(s.publishFrequency),
    })),
  })
  
  return new Response(llmsText, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
```

### 4.4 갱신 트리거

다음 시점에 `/llms.txt`가 갱신:
- 새 권위 글 발행
- Pillar Page 생성/갱신
- 섹션 추가/제거
- `settings/seo.llmsTextTemplate` 변경

발행 시 publisher-adapters.md의 `refreshSeoArtifacts()`가 호출.

### 4.5 외부 호스팅 노트

Tistory/Blogger는 `/llms.txt` 게시 불가. 능력 매트릭스에서 `supportsLlmsTxt: false`. 어드민 UI에서 비활성화 처리.

---

## 5. /sitemap.xml

### 5.1 동적 생성

```typescript
// 자식 사이트: app/sitemap.xml/route.ts

export async function GET() {
  const site = await getSiteConfig()
  const baseUrl = getBaseUrl(site)
  
  // 모든 발행된 글
  const posts = await db
    .collection('sites').doc(site.siteId).collection('curated_posts')
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .limit(50000)                                  // sitemap 한계
    .get()
  
  const urls: SitemapUrl[] = [
    // 홈
    { loc: baseUrl, priority: 1.0, changefreq: 'daily' },
    
    // Pillar Page (있으면)
    ...(pillarPage ? [{
      loc: `${baseUrl}/${pillarPage.slug}`,
      priority: 1.0,
      changefreq: 'weekly',
      lastmod: pillarPage.updatedAt,
    }] : []),
    
    // 섹션 페이지
    ...site.sections.filter((s) => s.enabled).map((s) => ({
      loc: `${baseUrl}/${s.slug}`,
      priority: 0.8,
      changefreq: 'daily' as const,
    })),
    
    // 권위 글 (priority 0.9)
    ...posts.docs
      .filter((d) => d.data().phase === 'authority')
      .map((d) => ({
        loc: `${baseUrl}/articles/${d.data().slug}`,
        priority: 0.9,
        changefreq: 'monthly' as const,
        lastmod: d.data().updatedAt,
        images: [{
          loc: d.data().heroImageUrl || d.data().heroThumbnail,
          title: d.data().title,
        }].filter((i) => i.loc),
      })),
    
    // 일반 글 (priority 0.7)
    ...posts.docs
      .filter((d) => d.data().phase === 'ongoing')
      .map((d) => ({
        loc: `${baseUrl}/articles/${d.data().slug}`,
        priority: 0.7,
        changefreq: 'weekly' as const,
        lastmod: d.data().updatedAt,
      })),
    
    // 정적 페이지
    { loc: `${baseUrl}/about`, priority: 0.5, changefreq: 'yearly' },
    { loc: `${baseUrl}/privacy`, priority: 0.3, changefreq: 'yearly' },
  ]
  
  const xml = renderSitemapXml(urls)
  
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
```

### 5.2 sitemap index (글이 1만+ 시)

50,000 URL 한계. 1만 글 이상 사이트는 `sitemap-index.xml`로 분리:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://travel-kr.com/sitemap-2026-05.xml</loc>
    <lastmod>2026-05-06</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://travel-kr.com/sitemap-2026-04.xml</loc>
  </sitemap>
  ...
</sitemapindex>
```

월별 분리. 자동 트리거 — 글 1만 도달 시 분할.

### 5.3 외부 호스팅

Tistory/Blogger는 자체 sitemap. 메타가 직접 만들지 않음.

---

## 6. /rss.xml

### 6.1 두 종류 RSS

```
/rss.xml                    — 전체 사이트 (모든 글)
/{section}/rss.xml          — 섹션별 (예: /news/rss.xml)
```

### 6.2 형식

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{site.name}</title>
    <link>{baseUrl}</link>
    <description>{site.seoConfig.siteDescription}</description>
    <language>{site.language}-{country}</language>
    <pubDate>{최근 글 발행일}</pubDate>
    <lastBuildDate>{now}</lastBuildDate>
    <atom:link href="{baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    
    <item>
      <title>{post.title}</title>
      <link>{baseUrl}/articles/{post.slug}</link>
      <description><![CDATA[{post.excerpt}]]></description>
      <pubDate>{post.publishedAt}</pubDate>
      <guid isPermaLink="true">{baseUrl}/articles/{post.slug}</guid>
      <category>{post.category}</category>
      <author>{site.persona.name}</author>
      <enclosure url="{post.heroImageUrl}" type="image/jpeg" />
    </item>
    ...
  </channel>
</rss>
```

### 6.3 최근 N편만

RSS는 최근 30~50편만. 전체 글이 아님.

```typescript
const recentPosts = await db
  .collection('sites').doc(site.siteId).collection('curated_posts')
  .where('status', '==', 'published')
  .orderBy('publishedAt', 'desc')
  .limit(30)
  .get()
```

---

## 7. /robots.txt

### 7.1 동적 생성

```typescript
// 자식 사이트: app/robots.txt/route.ts

export async function GET() {
  const site = await getSiteConfig()
  const baseUrl = getBaseUrl(site)
  
  const content = `
User-agent: *
Allow: /

# AI 크롤러 명시 허용 (LLM 학습 + 검색 인용 환영)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# AdSense
User-agent: Mediapartners-Google
Allow: /

# 검색엔진 보조
Sitemap: ${baseUrl}/sitemap.xml
${pillarUrl ? `Sitemap: ${baseUrl}/sitemap-pillar.xml` : ''}

# 어드민 차단 (자식 사이트엔 어드민 없지만 안전)
Disallow: /admin
Disallow: /api/internal
`.trim()
  
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400',
    },
  })
}
```

### 7.2 AI 크롤러 정책

> **"AI 학습/검색은 환영한다."**

GPTBot, ClaudeBot, PerplexityBot, Google-Extended를 명시 허용. 이게 AI 검색 트래픽의 시작점.

운영자가 이 정책을 바꾸려면 `settings/seo.robotsAiPolicy` 옵션:
- `'allow_all'` (기본)
- `'allow_search_only'`: 검색은 허용, 학습은 차단
- `'block_all'`: AI 크롤러 모두 차단

---

## 8. IndexNow API

### 8.1 왜 IndexNow

전통 sitemap은 검색엔진이 다음에 크롤링할 때까지 대기. IndexNow는 **즉시 알림** (Bing/Yandex/Naver 지원).

새 글 발행 즉시 색인 요청 → 검색엔진이 빠르게 색인.

### 8.2 키 발급 + 호스팅

각 자식 사이트가 고유 키 보유.

```typescript
// site-creation-flow.md에서 자동 생성
function generateIndexNowKey(): string {
  return crypto.randomBytes(16).toString('hex')   // 32자 hex
}

// 자식 사이트의 정해진 위치에 키 파일 호스팅
// 자식 사이트: app/{indexNowKey}.txt/route.ts
export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname
  const expected = await getIndexNowKey()
  
  if (path !== `/${expected}.txt`) return new Response('Not found', { status: 404 })
  
  return new Response(expected, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

### 8.3 호출

```typescript
// lib/seo/index-now.ts

export async function pingIndexNow(siteId: string, urls: string[]) {
  const site = await getChildSite(siteId)
  const seoSettings = await getSeoSettings(siteId)
  const key = seoSettings.indexNowKey
  const baseUrl = getBaseUrl(site)
  
  const payload = {
    host: site.hostingConfig.domain,
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: urls,
  }
  
  // 다중 endpoint 동시 호출
  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
    'https://searchadvisor.naver.com/indexnow',     // Naver
  ]
  
  await Promise.allSettled(
    endpoints.map((endpoint) =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  )
}
```

### 8.4 호출 시점

발행 직후 + 글 수정 시 + sitemap 갱신 시.

publisher-adapters.md의 publishPost 후 부가 작업으로 자동 호출.

```typescript
// 발행 후 부가 작업
await Promise.allSettled([
  publisher.refreshSeoArtifacts(),
  pingIndexNow(siteId, [
    `${baseUrl}/articles/${post.slug}`,
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/rss.xml`,
  ]),
  // ...
])
```

### 8.5 외부 호스팅도 지원

Tistory/Blogger도 IndexNow 호출 가능 (어댑터의 `supportsIndexNow: true`). 단 키 호스팅은 그쪽 시스템에 맞게.

Tistory의 경우: 운영자가 직접 키 페이지 글로 작성 (1회).

---

## 9. canonical URL

### 9.1 자식 사이트 1개 = 1 canonical

같은 글이 여러 URL에서 접근 가능할 때 (`/articles/X`, `/?p=123`, `/news/X`) canonical을 명시.

```html
<link rel="canonical" href="https://travel-kr.com/articles/great-trip">
```

기본 패턴: `{baseUrl}/articles/{slug}`. 다른 URL에서도 같은 canonical을 가리킴.

### 9.2 외부 호스팅과 다중 발행

> **"같은 글이 자체 도메인 + Tistory 양쪽 발행되면 어디가 canonical?"**

원칙: **자체 도메인이 우선**. Tistory는 자체 도메인을 canonical로 가리킴.

```typescript
async function setCanonicalForMultiplePublishings(post: CuratedPost) {
  if (post.publishedTo.nextjs) {
    // 자체 도메인 우선
    const canonical = post.publishedTo.nextjs.url
    await updatePost(post, { 'seo.canonicalUrl': canonical })
    return
  }
  
  if (post.publishedTo.tistory && !post.publishedTo.nextjs) {
    // Tistory만 발행한 경우
    await updatePost(post, { 'seo.canonicalUrl': post.publishedTo.tistory.url })
  }
}
```

> Tistory 글 본문에 직접 canonical 헤더 못 넣음 (능력 매트릭스). 그래서 본문 첫 단락에 "이 글의 원본은 [travel-kr.com/...]에 있습니다" 같은 안내. 또는 동시 발행 안 함.

### 9.3 같은 글의 여러 변형 (영문/한국어)

자식 사이트 travel-kr.com과 travel-en.com은 **별도 사이트**. 자동 번역 X. 그러나 같은 토픽 글이면 hreflang으로 연결.

```html
<link rel="canonical" href="https://travel-kr.com/articles/jeju-tour">
<link rel="alternate" hreflang="ko" href="https://travel-kr.com/articles/jeju-tour">
<link rel="alternate" hreflang="en" href="https://travel-en.com/articles/jeju-tour-guide">
<link rel="alternate" hreflang="x-default" href="https://travel-kr.com/articles/jeju-tour">
```

---

## 10. hreflang (다국어)

### 10.1 어떻게 매칭하는가

같은 토픽의 글이 여러 사이트에 있으면 매칭. 매칭은 임베딩 유사도 + topicCluster:

```typescript
async function findCrossLanguageSiblings(post: CuratedPost): Promise<HreflangSibling[]> {
  // 같은 운영자의 다른 언어 사이트들
  const otherSites = await getOtherLanguageSites(post.siteId)
  
  const siblings: HreflangSibling[] = []
  for (const otherSite of otherSites) {
    // topicCluster가 같으면 1차 후보
    let candidates: CuratedPost[] = []
    if (post.topicCluster) {
      candidates = await db
        .collection('sites').doc(otherSite.siteId).collection('curated_posts')
        .where('topicCluster', '==', post.topicCluster)
        .where('status', '==', 'published')
        .get().then(s => s.docs.map(d => d.data() as CuratedPost))
    }
    
    if (candidates.length === 0) continue
    
    // 임베딩 유사도 0.85+ 1편 선택
    const best = await findMostSimilarPost(post.embedding!, candidates, 0.85)
    if (best) {
      siblings.push({
        lang: otherSite.language,
        url: `https://${otherSite.hostingConfig.domain}/articles/${best.slug}`,
      })
    }
  }
  
  return siblings
}
```

### 10.2 hreflang 자동 갱신

다른 언어 사이트에 새 글 발행 시 → 같은 topicCluster의 다른 사이트 글의 hreflang 업데이트 트리거.

이건 cross-site 작업이라 메타사이트가 조정.

---

## 11. Google Search Console 자동 등록

### 11.1 도메인 검증

새 자식 사이트(Next.js) 생성 시 자동:

1. Vercel 환경변수에 `GOOGLE_SITE_VERIFICATION` 자동 주입
2. 자식 사이트 root에 verification meta tag 자동 렌더링:

```html
<meta name="google-site-verification" content="{token}">
```

3. Google Search Console API로 자동 등록:

```typescript
async function registerWithSearchConsole(site: ChildSite) {
  const auth = getServiceAccountAuth()
  const searchConsole = google.searchconsole({ version: 'v1', auth })
  
  // 1. property 추가
  await searchConsole.sites.add({
    siteUrl: `https://${site.hostingConfig.domain}/`,
  })
  
  // 2. sitemap 등록
  await searchConsole.sitemaps.submit({
    siteUrl: `https://${site.hostingConfig.domain}/`,
    feedpath: `https://${site.hostingConfig.domain}/sitemap.xml`,
  })
  
  return { verified: true }
}
```

### 11.2 GSC 데이터 수집

매일 자정 Cron으로 GSC API에서 일별 검색 성과 fetch → `analytics_snapshots` 컬렉션:

```typescript
async function fetchGscDailySnapshot(siteId: string, date: string) {
  const site = await getChildSite(siteId)
  const searchConsole = google.searchconsole({ ... })
  
  const response = await searchConsole.searchanalytics.query({
    siteUrl: `https://${site.hostingConfig.domain}/`,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: ['query', 'page'],
      rowLimit: 1000,
    },
  })
  
  const totals = response.data.rows?.reduce(...)
  
  await db.collection('sites').doc(siteId).collection('analytics_snapshots').doc(date).set({
    date,
    searchConsole: {
      totalClicks: totals.clicks,
      totalImpressions: totals.impressions,
      avgCtr: totals.ctr,
      avgPosition: totals.position,
      topQueries: response.data.rows?.slice(0, 20).map(r => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
      })),
    },
    fetchedAt: serverTimestamp(),
  }, { merge: true })
}
```

상세는 `analytics-integration.md` (Tier E).

---

## 12. SEO 모니터링

### 12.1 자동 체크

매일 자정 자동:

```typescript
async function dailyseoHealthCheck(siteId: string) {
  const issues: string[] = []
  
  // 1. sitemap에 있는 URL 중 색인된 것 비율
  const indexedRatio = await getIndexedRatio(siteId)
  if (indexedRatio < 0.7) issues.push(`색인율 낮음: ${indexedRatio * 100}%`)
  
  // 2. canonical URL 일관성
  const inconsistent = await findInconsistentCanonicals(siteId)
  if (inconsistent.length > 0) issues.push(`canonical 불일치 ${inconsistent.length}건`)
  
  // 3. /llms.txt 접근 가능성
  if (site.hostingType === 'nextjs') {
    const llmsTxtOk = await fetch(`${baseUrl}/llms.txt`).then(r => r.ok)
    if (!llmsTxtOk) issues.push('/llms.txt 접근 불가')
  }
  
  // 4. JSON-LD 검증 (글 무작위 5편)
  const jsonLdErrors = await validateRandomPostJsonLd(siteId, 5)
  if (jsonLdErrors.length > 0) issues.push(`JSON-LD 오류 ${jsonLdErrors.length}편`)
  
  // 5. 메타 description 누락
  const missingMeta = await findPostsWithMissingMeta(siteId)
  if (missingMeta.length > 0) issues.push(`메타 누락 ${missingMeta.length}편`)
  
  if (issues.length > 0) {
    await createAlert({
      severity: 'medium',
      category: 'health',
      siteId,
      title: `SEO 이슈 ${issues.length}건: ${siteId}`,
      context: { issues },
    })
  }
}
```

### 12.2 주간 SEO 리포트

매주 일요일 자정 자동 생성:

```
이번 주 SEO 리포트 (travel-kr)

색인 상태
- 색인됨: 142편 / 발행됨 156편 (91%)
- 새로 색인된 글: 18편
- 색인 제외된 글: 0편

검색 성과 (GSC)
- 노출수 12,4K (+18%)
- 클릭수 524 (+22%)
- 평균 CTR 4.2%
- 평균 위치 14.3 (+1.2 향상)

Top 검색어
1. "후쿠오카 여행" 클릭 38, 노출 1,234
2. "제주도 추천" 클릭 24, 노출 892
...

이슈
- ⚠ 6편의 글에서 hreflang 누락 (영문 사이트 매칭 실패)
- ⚠ /llms.txt 마지막 갱신 7일 전 (트리거 누락 가능)
```

---

## 13. 페이지별 SEO 자동 생성 흐름 종합

```
[글 발행 트리거 (publisher.publishPost)]
        ↓
┌──────────────────────────────────────────┐
│ 1. Editor 단계에서 SEO 메타 생성 (M11)    │
│    - metaTitle / description / keywords  │
│    - OG 이미지 (heroImageUrl)            │
│    - JSON-LD (Article + FAQ + Breadcrumb)│
│    → curated_posts.seo                   │
└──────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────┐
│ 2. 발행 후 부가 작업 (병렬)              │
│    a. publisher.refreshSeoArtifacts()    │
│       - /llms.txt 갱신                   │
│       - /sitemap.xml 갱신                │
│       - /rss.xml 갱신                    │
│    b. pingIndexNow()                     │
│    c. hreflang siblings 매칭 + 갱신     │
└──────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────┐
│ 3. 자식 사이트(Next.js) ISR revalidation │
│    - /articles/{slug}                    │
│    - /sitemap.xml                        │
│    - /rss.xml                            │
│    - /llms.txt                           │
│    - /                                   │
└──────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────┐
│ 4. 검색엔진 자동 발견                    │
│    - Google: sitemap fetch (~수시간)     │
│    - Bing: IndexNow 즉시 (~분)           │
│    - Naver: IndexNow 즉시                │
│    - AI 검색: /llms.txt + 자연 크롤링    │
└──────────────────────────────────────────┘
```

---

## 14. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 페이지 단위 SEO 메타 (basic / og / twitter / article)
- ✅ JSON-LD 5종 schema (Article / NewsArticle / FAQPage / BreadcrumbList / Organization / WebSite)
- ✅ /llms.txt — AI 검색용 동적 생성 (Anthropic 표준)
- ✅ /sitemap.xml + sitemap-index 분할 (1만+ 글)
- ✅ /rss.xml — 사이트 + 섹션별
- ✅ /robots.txt — AI 크롤러 명시 허용 정책
- ✅ IndexNow API — 발행 즉시 4개 endpoint 호출
- ✅ canonical URL — 자체 도메인 우선
- ✅ hreflang — 임베딩 매칭으로 자동 cross-language siblings
- ✅ Google Search Console 자동 등록 + 일일 데이터 수집
- ✅ 호스팅별 능력 차이 명시
- ✅ SEO 자동 모니터링 + 주간 리포트
- ✅ 발행 시 자동 흐름 종합도

이 문서가 정의하지 않은 것:
- ❌ 권위 그물 (글끼리 자동 링크) → `internal-linking.md`
- ❌ 광고/어필리에이트 마커의 실제 코드 치환 → `monetization.md`
- ❌ Search Console + GA4 통합 분석 + AI 인사이트 → `analytics-integration.md`
- ❌ 자식 사이트 코드의 정확한 라우트 구조 → `deployment-guide.md`

---

## 15. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / database-schema.md / publisher-adapters.md / ai-roles-and-prompts.md v1.0 기준. |

---

*이 문서는 자식 사이트의 SEO 자동화 단일 출처다. 전통 검색 + AI 검색 양쪽을 위한 모든 메타/인프라를 자동 생성하는 시스템.*

*다음 문서: `internal-linking.md` (Tier D 2번)*
