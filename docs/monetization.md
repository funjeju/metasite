# META-SITE: 수익화 시스템 (monetization.md)

> 광고 슬롯 표준화 + AdSense 통합 + 카테고리별 어필리에이트 + 마커 코드 치환 + 정책 준수.
> core.md "12. 수익화"의 상세 + ai-roles-and-prompts.md 6장의 광고/어필리에이트 마커가 실제로 어떻게 코드로 변환되는지의 완성.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ internal-linking.md       (권위 그물)
  └─ monetization.md           ★ 이 문서 — 수익화

[Tier D 완료. 다음은 Tier E — 인프라]
```

이 문서는:
- 광고 슬롯 7종의 표준 위치/크기/규칙
- AdSense + 자식 사이트 통합 패턴
- 카테고리별 어필리에이트 풀 + 자동 매칭
- Editor가 삽입한 마커 → 실제 광고/링크 코드 치환
- 호스팅별 능력 차이 (Tistory는 광고 슬롯 못함)
- AdSense 정책 위반 자동 차단

---

## 1. 핵심 원칙

### 1.1 콘텐츠 우선

> **"수익화는 콘텐츠 품질을 망가뜨리지 않는 선에서만."**

원칙:
- 글당 광고 슬롯 **최대 5개**
- 본문 위/아래/좌우 사이드 슬롯만 (중간 끼어들기 금지)
- 어필리에이트는 **글 카테고리와 연관**될 때만
- 정책 위반 키워드 자동 차단

### 1.2 어필리에이트 = 더 좋은 가치

광고는 사이트 운영 비용. 어필리에이트는 **추가 가치 제공**. 단순 광고가 아니라 "관련 도구/서비스 추천":

```
❌ 글 중간에 무관한 광고 배너
✅ "AI 글쓰기" 글 → "Claude / ChatGPT / Notion AI 비교 추천 도구"
```

### 1.3 모든 자식 사이트가 켜야 하는 건 아님

수익화는 사이트 단위 ON/OFF. Phase 1 권위 구축 중인 사이트는 **광고 비활성**이 좋다 (사용자 이탈 + AdSense 정책). Phase 2 진입 + 일정 트래픽 도달 후 단계적 활성화.

---

## 2. 광고 슬롯 7종 표준

### 2.1 슬롯 정의

| 슬롯 ID | 위치 | 크기 (권장) | 사용처 |
|---------|------|-----------|-------|
| `header` | 페이지 최상단 (헤더 아래) | 728x90 또는 반응형 | 모든 페이지 |
| `top` | 본문 도입부 직후 | 300x250 또는 반응형 | 글 페이지 |
| `mid` | 본문 중간 (50% 지점) | 반응형 | 긴 글만 (1500단어+) |
| `bottom` | 결론 직전 | 반응형 | 글 페이지 |
| `sidebar-1` | 우측 사이드바 상단 | 300x250 | 데스크톱 |
| `sidebar-2` | 우측 사이드바 하단 (스크롤 따라) | 300x600 또는 300x250 | 데스크톱 |
| `inline-cta` | 본문 자연스러운 위치 (1~2개) | 반응형 | 어필리에이트 + 뉴스레터 가입 등 |

### 2.2 슬롯 활성화 (사이트별)

`child_sites.monetization.slotsEnabled`로 ON/OFF.

```typescript
{
  slotsEnabled: ['header', 'top', 'mid', 'bottom', 'inline-cta'],
  // sidebar-1, sidebar-2는 비활성화 (모바일 우선)
}
```

운영자가 어드민 (`/sites/{id}/monetization`)에서 체크박스로.

### 2.3 글 길이별 자동 조정

```typescript
function adjustSlotsForPostLength(post: CuratedPost, enabledSlots: AdSlot[]): AdSlot[] {
  const wordCount = countWords(post.body)
  
  let slots = [...enabledSlots]
  
  // 짧은 글 (<800단어): mid 비활성
  if (wordCount < 800) {
    slots = slots.filter((s) => s !== 'mid')
  }
  
  // 매우 짧은 글 (<400단어): top과 bottom만
  if (wordCount < 400) {
    slots = slots.filter((s) => ['top', 'bottom'].includes(s))
  }
  
  // 매우 긴 글 (>3000단어): mid 2개로 분할
  if (wordCount > 3000 && slots.includes('mid')) {
    slots = [...slots, 'mid' as AdSlot]  // 33% + 66% 위치
  }
  
  return slots
}
```

---

## 3. AdSense 통합

### 3.1 등록 흐름

자식 사이트 생성 시 자동 등록 안 됨 (AdSense는 운영자 수동 신청 필요). 수동 흐름:

```
운영자가 AdSense 계정에서 사이트 등록
   ↓
운영자가 어드민의 /sites/{id}/monetization에 publisherID 입력
   ↓
시스템이 자식 사이트 환경변수로 자동 주입
   ↓
자식 사이트 코드가 AdSense 스크립트 자동 로드
```

### 3.2 환경변수 주입

```typescript
// site-creation-flow.md "Step 4: 환경변수 주입"의 확장
async function injectAdSenseToVercel(siteId: string, adsenseId: string) {
  const site = await getChildSite(siteId)
  if (site.hostingType !== 'nextjs') return
  
  await vercel.env.set(site.hostingConfig.vercelProjectId, {
    NEXT_PUBLIC_ADSENSE_ID: adsenseId,
  })
  
  // Vercel 재배포 트리거
  await vercel.deployments.create({ projectId: site.hostingConfig.vercelProjectId })
}
```

### 3.3 자식 사이트의 AdSense 스크립트

```typescript
// 자식 사이트: app/layout.tsx

import Script from 'next/script'

export default function RootLayout({ children }) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID
  
  return (
    <html>
      <head>
        {adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 3.4 광고 단위 (Ad Unit)

각 슬롯마다 AdSense Ad Unit ID 매핑. 운영자가 AdSense에서 단위 7개 만들고 ID를 매핑.

```typescript
// child_sites.monetization.adsenseSlotMapping
{
  header: 'ca-pub-XXX/1234567890',
  top: 'ca-pub-XXX/2345678901',
  mid: 'ca-pub-XXX/3456789012',
  bottom: 'ca-pub-XXX/4567890123',
  'sidebar-1': 'ca-pub-XXX/5678901234',
  'sidebar-2': 'ca-pub-XXX/6789012345',
  'inline-cta': null,                    // inline-cta는 어필리에이트 전용
}
```

### 3.5 AdSlot 컴포넌트

```typescript
// 자식 사이트: components/ads/AdSlot.tsx

'use client'

import { useEffect, useRef } from 'react'

interface AdSlotProps {
  slot: 'header' | 'top' | 'mid' | 'bottom' | 'sidebar-1' | 'sidebar-2'
  format?: 'auto' | 'fluid'
}

export function AdSlot({ slot, format = 'auto' }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null)
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID
  const slotMapping = useSlotMapping()  // child_sites.monetization에서 fetch
  
  useEffect(() => {
    if (!ref.current || !adsenseId) return
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.warn('AdSense push failed:', err)
    }
  }, [])
  
  if (!adsenseId || !slotMapping[slot]) return null
  
  return (
    <div className={`ad-slot ad-slot-${slot}`}>
      <small>광고</small>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsenseId}
        data-ad-slot={slotMapping[slot].split('/')[1]}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
```

`<small>광고</small>` 표시는 한국 표시광고 의무.

---

## 4. 마커 → 코드 치환

### 4.1 본문 마커 (Editor가 삽입)

ai-roles-and-prompts.md 6.1 Editor가 본문에 삽입:

```markdown
... 본문 도입부 ...

<!-- AD_SLOT:top -->

본문 H2 섹션 1 ...

<!-- AD_SLOT:mid -->

본문 H2 섹션 2 ...

<!-- AD_SLOT:bottom -->

결론 ...

<!-- AFFILIATE:category=ai_tools position=mid -->
```

### 4.2 발행 시점 치환

publisher-adapters.md의 `buildHtmlForExport`에서 처리.

```typescript
// lib/publishers/magazine-html.ts

export async function buildHtmlForExport(
  post: CuratedPost,
  opts: BuildHtmlOptions,
): Promise<string> {
  let body = await marked.parse(post.body)
  
  if (opts.target === 'nextjs') {
    // 자체 도메인 → React 컴포넌트 마커로 (자식 사이트가 처리)
    body = convertAdMarkersToReactPlaceholders(body, post)
  } else if (opts.target === 'blogger') {
    // Blogger → AdSense 코드 직접 삽입
    body = injectAdSenseInline(body, post)
    body = injectAffiliateInline(body, post)
  } else if (opts.target === 'tistory') {
    // Tistory → 마커 모두 제거 (Tistory는 자체 광고 정책)
    body = removeAllMonetizationMarkers(body)
  }
  
  return body
}
```

### 4.3 Next.js 호스팅 — Placeholder 변환

자체 도메인은 React 컴포넌트로 처리:

```typescript
function convertAdMarkersToReactPlaceholders(body: string, post: CuratedPost): string {
  // <!-- AD_SLOT:top --> → <div data-ad-slot="top"></div>
  let result = body.replace(
    /<!--\s*AD_SLOT:(\w+)\s*-->/g,
    '<div data-ad-slot="$1"></div>',
  )
  
  // <!-- AFFILIATE:category=X position=Y --> → <div data-affiliate-category="X" data-position="Y"></div>
  result = result.replace(
    /<!--\s*AFFILIATE:category=(\w+)(?:\s+position=(\w+))?\s*-->/g,
    '<div data-affiliate-category="$1" data-position="$2"></div>',
  )
  
  return result
}
```

자식 사이트의 마크다운 렌더러가 이 placeholder를 React 컴포넌트로:

```typescript
// 자식 사이트: components/article/ArticleRenderer.tsx

'use client'

import { useEffect, useRef } from 'react'
import { AdSlot } from './ads/AdSlot'
import { AffiliateBox } from './affiliate/AffiliateBox'

export function ArticleRenderer({ html, post }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!ref.current) return
    
    // 1. AdSlot placeholders
    const adPlaceholders = ref.current.querySelectorAll('[data-ad-slot]')
    adPlaceholders.forEach((el) => {
      const slot = el.getAttribute('data-ad-slot') as AdSlot
      const root = ReactDOM.createRoot(el)
      root.render(<AdSlot slot={slot} />)
    })
    
    // 2. Affiliate placeholders
    const affPlaceholders = ref.current.querySelectorAll('[data-affiliate-category]')
    affPlaceholders.forEach((el) => {
      const category = el.getAttribute('data-affiliate-category')!
      const position = el.getAttribute('data-position')
      const root = ReactDOM.createRoot(el)
      root.render(<AffiliateBox category={category} position={position} postId={post.postId} />)
    })
  }, [html])
  
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
```

### 4.4 Blogger 호스팅 — 직접 코드 삽입

Blogger는 React 못 쓰니 HTML 직접:

```typescript
function injectAdSenseInline(body: string, post: CuratedPost): string {
  const site = post.site
  const adsenseId = site.monetization.adsenseId
  if (!adsenseId) return removeAllMonetizationMarkers(body)
  
  return body.replace(
    /<!--\s*AD_SLOT:(\w+)\s*-->/g,
    (_, slot) => {
      const slotId = site.monetization.adsenseSlotMapping[slot]
      if (!slotId) return ''  // 비활성화된 슬롯
      
      return `
<div class="ad-slot ad-slot-${slot}">
  <small>광고</small>
  <ins class="adsbygoogle"
    style="display:block"
    data-ad-client="${adsenseId}"
    data-ad-slot="${slotId.split('/')[1]}"
    data-ad-format="auto"
    data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
`.trim()
    },
  )
}
```

### 4.5 Tistory 호스팅 — 모두 제거

Tistory는 자체 광고 정책. 메타가 광고 코드 못 넣음.

```typescript
function removeAllMonetizationMarkers(body: string): string {
  let result = body
  result = result.replace(/<!--\s*AD_SLOT:[\w]+\s*-->/g, '')
  result = result.replace(/<!--\s*AFFILIATE:[\w=\s]+\s*-->/g, '')
  return result
}
```

---

## 5. 어필리에이트 시스템

### 5.1 카테고리별 어필리에이트 풀

`child_sites.monetization.affiliatePool`에 카테고리 → 링크 매핑:

```typescript
{
  affiliatePool: {
    'ai_tools': [
      {
        partnerId: 'aff_notion_ai',
        url: 'https://notion.so/?ref=...',
        label: 'Notion AI',
        imageUrl: 'https://...',
        weight: 0.4,                    // 가중 무작위
      },
      {
        partnerId: 'aff_jasper',
        url: 'https://jasper.ai/?ref=...',
        label: 'Jasper AI',
        weight: 0.3,
      },
      {
        partnerId: 'aff_copyai',
        url: 'https://copy.ai/?ref=...',
        label: 'Copy.ai',
        weight: 0.3,
      },
    ],
    'hosting': [...],
    'travel_booking': [...],
    'finance_tools': [...],
  }
}
```

### 5.2 카테고리 자동 매핑

글의 `category` + `tags`를 보고 어필리에이트 카테고리 자동 결정.

```typescript
// lib/monetization/category-matcher.ts

const CATEGORY_TO_AFFILIATE = {
  // AI 사이트
  'tools': 'ai_tools',
  'tutorial': 'ai_tools',
  
  // 여행 사이트
  'domestic_travel': 'travel_booking',
  'international_travel': 'travel_booking',
  
  // 보험 사이트
  'health_insurance': 'finance_tools',
  
  // 일반
  'tech': 'tech_gear',
}

function matchAffiliateCategory(post: CuratedPost): string | null {
  // 1. 직접 매핑
  if (CATEGORY_TO_AFFILIATE[post.category]) {
    return CATEGORY_TO_AFFILIATE[post.category]
  }
  
  // 2. 태그 기반 매칭
  for (const tag of post.tags) {
    for (const [cat, affCat] of Object.entries(CATEGORY_TO_AFFILIATE)) {
      if (tag.includes(cat)) return affCat
    }
  }
  
  return null
}
```

### 5.3 가중 무작위 선택

같은 카테고리에 어필리에이트 N개 있으면 가중 무작위로 1개. 글마다 다른 어필리에이트 표시.

```typescript
function pickAffiliate(category: string, site: ChildSite): AffiliateLink | null {
  const pool = site.monetization.affiliatePool[category]
  if (!pool || pool.length === 0) return null
  
  // 가중치 합 정규화
  const totalWeight = pool.reduce((sum, l) => sum + (l.weight || 1), 0)
  let random = Math.random() * totalWeight
  
  for (const link of pool) {
    random -= (link.weight || 1)
    if (random <= 0) return link
  }
  
  return pool[0]  // 폴백
}
```

### 5.4 Editor가 마커 삽입 시 카테고리 추출

Editor 프롬프트(ai-roles-and-prompts.md 6.1):

```
### E. 어필리에이트 마커
이 글의 카테고리({{category}})와 관련된 어필리에이트 추천이 있다면 마커 삽입:
- `<!-- AFFILIATE:category=ai_tools position=mid -->`
```

발행 시점에 시스템이:
1. `data-affiliate-category="ai_tools"` placeholder
2. `<AffiliateBox>` 컴포넌트가 가중 무작위로 1개 선택
3. 박스 형태로 렌더링

### 5.5 AffiliateBox 컴포넌트

```typescript
// 자식 사이트: components/affiliate/AffiliateBox.tsx

'use client'

import { useEffect, useState } from 'react'

export function AffiliateBox({ category, position, postId }: Props) {
  const [affiliate, setAffiliate] = useState<AffiliateLink | null>(null)
  
  useEffect(() => {
    fetchRandomAffiliate(category).then(setAffiliate)
  }, [category])
  
  if (!affiliate) return null
  
  return (
    <div className="affiliate-box">
      <div className="affiliate-label">관련 도구 추천</div>
      
      {affiliate.imageUrl && (
        <img src={affiliate.imageUrl} alt={affiliate.label} />
      )}
      
      <div className="affiliate-content">
        <div className="affiliate-title">{affiliate.label}</div>
        <a
          href={affiliate.url}
          rel="sponsored noopener"
          target="_blank"
          onClick={() => trackAffiliateClick(affiliate.partnerId, postId, position)}
        >
          자세히 보기 →
        </a>
      </div>
      
      <div className="affiliate-disclosure">
        ※ 이 링크는 어필리에이트 링크입니다 (구매 시 사이트에 수수료가 지급될 수 있음)
      </div>
    </div>
  )
}
```

> **`affiliate-disclosure` 의무.** 한국 공정거래법 + FTC 규정. 모든 어필리에이트 링크는 명시 안내.

### 5.6 클릭/전환 추적

```typescript
async function trackAffiliateClick(partnerId: string, postId: string, position?: string) {
  // 클라이언트에서 서버 함수 호출
  await fetch('/api/track-affiliate-click', {
    method: 'POST',
    body: JSON.stringify({ partnerId, postId, position }),
  })
}

// 자식 사이트: app/api/track-affiliate-click/route.ts
export async function POST(req: NextRequest) {
  const { partnerId, postId, position } = await req.json()
  
  // sites/{siteId}/affiliate_clicks 컬렉션
  await db.collection('sites').doc(siteId).collection('affiliate_clicks').add({
    partnerId,
    postId,
    position,
    timestamp: serverTimestamp(),
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
    ip: hash(getClientIp(req)),  // 해시만 저장 (GDPR)
  })
  
  return NextResponse.json({ ok: true })
}
```

---

## 6. 정책 위반 자동 차단

### 6.1 AdSense 정책 핵심

자동 차단해야 할 것:
- 폭력/혐오/차별 콘텐츠
- 성인 콘텐츠
- 무허가 약물/주류 (지역별)
- 도박/베팅 (지역별)
- 무기 판매
- 저작권 침해 의심

### 6.2 정책 위반 감지

글 발행 직전 검사:

```typescript
// lib/monetization/policy-check.ts

const POLICY_KEYWORDS = {
  ko: {
    violence: ['살인', '자살 방법', '폭탄 제조', /* ... */],
    sexual: [/* 18+ */],
    drugs: ['마약', '대마초 구매', /* ... */],
    gambling: ['카지노', '도박 사이트', /* ... */],
  },
  en: {
    violence: ['murder', 'suicide method', /* ... */],
    sexual: [/* ... */],
    drugs: [/* ... */],
    gambling: [/* ... */],
  },
}

export async function checkAdPolicyCompliance(
  post: CuratedPost,
  site: ChildSite,
): Promise<PolicyCheckResult> {
  const keywords = POLICY_KEYWORDS[site.language] || POLICY_KEYWORDS.en
  const issues: PolicyIssue[] = []
  
  const text = `${post.title}\n\n${post.body}`.toLowerCase()
  
  // 키워드 매칭
  for (const [category, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (text.includes(word.toLowerCase())) {
        issues.push({
          category,
          keyword: word,
          severity: 'high',
        })
      }
    }
  }
  
  // AI 기반 추가 검사 (gemini-flash 등 가벼운 모델)
  const aiCheck = await aiService.call({
    role: 'evaluator',
    model: 'gemini-flash',
    prompt: `다음 글이 Google AdSense 정책을 위반하는지 평가:
제목: ${post.title}
본문 (앞 1000자): ${post.body.slice(0, 1000)}

특히 폭력/성인/마약/도박/저작권 침해 가능성 검사.
JSON: { "violation": true|false, "category": "...", "severity": "low|high", "reasoning": "..." }`,
    expectJson: true,
  })
  
  if (aiCheck.parsed.violation && aiCheck.parsed.severity === 'high') {
    issues.push({
      category: aiCheck.parsed.category,
      keyword: 'ai_detected',
      severity: 'high',
      reasoning: aiCheck.parsed.reasoning,
    })
  }
  
  return {
    passed: issues.length === 0,
    issues,
    recommendation: issues.length > 0 ? 'disable_ads' : 'enable_ads',
  }
}
```

### 6.3 자동 광고 비활성

정책 위반 감지 시 해당 글만 광고 비활성:

```typescript
async function applyPolicyDecision(post: CuratedPost, check: PolicyCheckResult) {
  if (!check.passed) {
    // 1. 글의 광고 비활성
    await updatePost(post, {
      'monetization.adsDisabled': true,
      'monetization.disableReason': check.issues[0].category,
    })
    
    // 2. 운영자 알림
    await createAlert({
      severity: 'high',
      category: 'security',
      siteId: post.siteId,
      postId: post.postId,
      title: `정책 위반 의심 — 광고 자동 비활성: ${post.title}`,
      message: `사유: ${check.issues.map(i => i.category).join(', ')}`,
      context: { issues: check.issues },
    })
    
    // 3. 글 자체는 발행됨 (수익화만 막음)
    // → 운영자가 검토 후 [수익화 다시 활성] 또는 [글 archived]
  }
}
```

### 6.4 자식 사이트 렌더링에서 차단

```typescript
// 자식 사이트의 AdSlot 컴포넌트
export function AdSlot({ slot }: AdSlotProps) {
  const post = usePost()  // 현재 글 컨텍스트
  
  // 정책 위반 글이면 광고 안 보여줌
  if (post?.monetization?.adsDisabled) return null
  
  // ... 일반 렌더링
}
```

---

## 7. 호스팅별 능력 차이

publisher-adapters.md 7장 매트릭스 + 수익화 관점:

| 기능 | Next.js | Tistory | Blogger |
|------|---------|---------|---------|
| AdSense 임의 위치 | ✅ | ❌ (자체 정책) | ✅ |
| 어필리에이트 박스 | ✅ | ⚠ (HTML만) | ✅ |
| 정책 자동 차단 | ✅ | ❌ (Tistory가 처리) | ✅ |
| 클릭 추적 | ✅ | ❌ | ⚠ |
| A/B 테스트 | ✅ | ❌ | ❌ |
| 뉴스레터 CTA | ✅ | ❌ | ❌ |

### 7.1 Tistory 자식 사이트의 수익화

Tistory의 광고 정책은 자체 시스템(애드핏 등). 메타사이트는 수익화 관여 안 함:

- AdSlot 마커 모두 제거
- 어필리에이트는 HTML 박스로 본문 삽입 (수동 추적)
- 수익 데이터는 Tistory 운영자 페이지에서만 확인

### 7.2 Blogger 자식 사이트의 수익화

Blogger는 AdSense 친화적. Next.js와 거의 동일하게 작동:

- AdSlot 마커 → AdSense `<ins>` 태그 직접 삽입
- 어필리에이트 → HTML 박스 + 트래킹 픽셀
- 단 자식 사이트 코드가 없으니 클릭 추적은 외부 서비스 (UTM)

---

## 8. 수익 추적

### 8.1 일별 수익 스냅샷

매일 자정 자동:

```typescript
// app/api/cron/fetch-revenue/route.ts

export async function GET(req: NextRequest) {
  const sites = await getActiveChildSites()
  
  for (const site of sites) {
    if (!site.monetization.adsenseId) continue
    
    // AdSense Reporting API
    const adsenseRevenue = await fetchAdSenseRevenue(site.monetization.adsenseId, yesterday)
    
    // 어필리에이트 클릭 + 전환 (수동 입력 또는 partner API)
    const affiliateRevenue = await fetchAffiliateRevenue(site.siteId, yesterday)
    
    // 분석 스냅샷에 추가
    await db.collection('sites').doc(site.siteId)
      .collection('analytics_snapshots').doc(yesterday)
      .set({
        revenue: {
          adsense: adsenseRevenue,
          affiliate: affiliateRevenue,
          total: adsenseRevenue.estimated + affiliateRevenue.estimated,
        },
      }, { merge: true })
  }
  
  return NextResponse.json({ ok: true })
}
```

### 8.2 메타 어드민 수익 대시보드

`/sites/{id}/monetization`에 (meta-control-spec.md [11]):

```
이번 달 수익 (예상)
─────────────
AdSense: $34.20
어필리에이트: $12.50  (클릭 87, 전환 3)
총: $46.70

7일 추이 (sparkline)
$5.40 $4.20 $7.80 $6.10 $5.90 $7.40 $8.30

Top 수익 글 (이번 달)
1. 'OpenAI o5 출시' — $8.20 (조회 1.2k, RPM $6.83)
2. 'AI 코딩 도구 비교' — $5.40 (조회 890, RPM $6.07)
...

어필리에이트 성과
파트너 / 클릭 / 전환 / 매출
- Notion AI: 34/2 / $12
- Jasper:    23/1 / $8
- Copy.ai:   30/0 / $0  (전환 없음 ⚠ 풀에서 가중치 낮춤?)
```

### 8.3 비용 vs 수익

전체 운영 비용 (`/costs`) 대비 수익. ROI 계산:

```typescript
async function calculateRoi(siteId: string, days: number) {
  const cost = await getTotalCost(siteId, days)
  const revenue = await getTotalRevenue(siteId, days)
  
  return {
    cost,
    revenue,
    profit: revenue - cost,
    roi: cost > 0 ? (revenue - cost) / cost : 0,
  }
}
```

---

## 9. A/B 테스트

### 9.1 테스트 가능 항목

- 어필리에이트 풀 (파트너 A vs 파트너 B)
- 광고 슬롯 위치 (top vs no-top)
- AffiliateBox 디자인 (텍스트 vs 이미지)
- 뉴스레터 CTA 문구

### 9.2 테스트 셋업

```typescript
// 자식 사이트에서 50:50 분할
function getAbVariant(userId: string, testId: string): 'A' | 'B' {
  const hash = sha256(`${userId}-${testId}`).slice(0, 8)
  const num = parseInt(hash, 16)
  return num % 2 === 0 ? 'A' : 'B'
}

// 사용
function AffiliateBox({ category }: Props) {
  const userId = useUserId()
  const variant = getAbVariant(userId, 'affiliate-design-v1')
  
  if (variant === 'A') return <AffiliateBoxClassic ... />
  else return <AffiliateBoxNew ... />
}
```

### 9.3 결과 추적

각 클릭에 variant 기록:

```typescript
await db.collection('sites').doc(siteId).collection('affiliate_clicks').add({
  // ...
  abTestId: 'affiliate-design-v1',
  abVariant: 'A',
})
```

운영자가 어드민에서 결과 확인 → 승자 변형을 모든 사용자에게.

---

## 10. 단계적 활성화 (Phase 1 사이트)

> **"Phase 1 권위 구축 중에는 광고 안 켠다."**

```typescript
async function shouldEnableMonetization(site: ChildSite): Promise<boolean> {
  // Phase 1은 무조건 광고 비활성
  if (site.currentPhase === 'authority') return false
  
  // Phase 2지만 발행 글 < 30편 → 비활성 권장
  if (site.stats.publishedPosts < 30) return false
  
  // 7일 트래픽 < 100 sessions → 비활성 권장 (AdSense 의미 없음)
  if (site.stats.weeklyTrafficEstimate < 100) return false
  
  return true
}
```

운영자가 사이트 생성 후 일정 시점에 활성화 결정. 단계적 활성화 알림:

```
travel-kr가 Phase 2 진입 + 글 30편 + 트래픽 200 sessions/주 도달.
이제 광고 활성화를 검토할 시점입니다.

[광고 활성화 →]  [나중에]
```

---

## 11. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 광고 슬롯 7종 표준 (header/top/mid/bottom/sidebar-1/sidebar-2/inline-cta)
- ✅ 글 길이별 자동 슬롯 조정
- ✅ AdSense 통합 (환경변수 주입 + Script + AdSlot 컴포넌트)
- ✅ 마커 → 코드 치환 (Next.js placeholder / Blogger 직접 / Tistory 제거)
- ✅ 카테고리별 어필리에이트 풀 + 가중 무작위 선택
- ✅ AffiliateBox 컴포넌트 + 의무 disclosure
- ✅ 클릭/전환 추적 (해시 IP, GDPR)
- ✅ AdSense 정책 자동 검사 (키워드 + AI 기반)
- ✅ 정책 위반 시 글별 광고 자동 비활성
- ✅ 호스팅별 능력 차이
- ✅ 일별 수익 스냅샷 + ROI
- ✅ A/B 테스트 패턴
- ✅ Phase 1 광고 비활성화 정책

이 문서가 정의하지 않은 것:
- ❌ 일일 비용 한도 + 자동 사이트 정지 → `monitoring-health.md`
- ❌ 수익 분석 인사이트 (AI 기반) → `analytics-integration.md`
- ❌ 뉴스레터 캠페인 발송 → `search-and-email.md`

---

## 12. Tier D 완료 체크포인트

**Tier D 핵심 — "사이트가 자동으로 트래픽 + 수익 만들기":**

| 문서 | 역할 |
|------|-----|
| `seo-automation.md` | 검색엔진 + AI 검색이 사이트 잘 인식 |
| `internal-linking.md` | 권위 그물로 사이트 내부 흐름 + topical authority |
| `monetization.md` | 광고 + 어필리에이트로 수익 + 정책 자동 준수 |

세 문서가 함께: 사이트 → 검색 발견 → 사이트 내 흐름 → 수익 전환의 전체 funnel.

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / publisher-adapters.md / ai-roles-and-prompts.md / seo-automation.md / internal-linking.md v1.0 기준. |

---

*이 문서는 메타사이트의 수익화 단일 출처다. 광고 슬롯 표준 + AdSense 통합 + 어필리에이트 풀 + 정책 자동 준수의 모든 결정을 담고 있다.*

*Tier D 완료. 다음 문서: `monitoring-health.md` (Tier E 1번)*
