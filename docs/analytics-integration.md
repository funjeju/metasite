# META-SITE: 분석 통합 (analytics-integration.md)

> Google Search Console + GA4 자동 등록 + 일일 데이터 수집 + AI 기반 인사이트.
> core.md "14. 분석" + seo-automation.md 11장(GSC 자동 등록) / monitoring-health.md(일일 리포트)의 통합.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ search-and-email.md         (검색 + 뉴스레터)
  └─ analytics-integration.md    ★ 이 문서 — 분석 + 인사이트

[Tier E 완료. 다음은 Tier F — 배포]
```

이 문서는:
- GSC + GA4 자동 등록 흐름
- 일일 데이터 수집 → `analytics_snapshots` 컬렉션
- AI 인사이트 자동 생성 (콘텐츠 갭 / Top 글 / 트렌드)
- 메타 어드민의 cross-site 분석 대시보드
- 외부 호스팅(Tistory/Blogger) 분석 통합 한계

---

## 1. 핵심 원칙

### 1.1 "데이터 → 자동 액션"

> **"분석은 보는 게 아니라 다음 행동의 입력이 되어야 한다."**

원칙:
- 매일 자동 fetch → 운영자가 보지 않아도 시스템이 패턴 감지
- AI가 인사이트 + 다음 액션 제안
- 액션이 자동 실행 가능하면 자동, 아니면 운영자 알림
- 단순 지표 나열 X (어떤 의미인지 + 무엇을 해야 하는지)

### 1.2 두 종류의 분석 데이터

```
[Search Console]
  검색 노출 / 클릭 / CTR / 평균 순위
  Top 검색어 / Top 페이지
  → "어떻게 사이트가 검색되는가"

[Google Analytics 4]
  세션 / 사용자 / 페이지뷰 / 체류시간 / 이탈률
  Top 페이지 / 트래픽 소스 / 디바이스
  → "사이트 내에서 무엇이 일어나는가"
```

두 데이터를 결합해야 진짜 의미 있는 인사이트 가능.

### 1.3 호스팅별 차이

| 분석 | Next.js | Tistory | Blogger |
|------|---------|---------|---------|
| GSC | ✅ 자동 | ⚠ 도메인 매핑 | ✅ 자동 |
| GA4 | ✅ 자동 (스크립트 주입) | ⚠ 본문에 수동 | ✅ 자동 |
| 페이지별 통계 | ✅ | ⚠ 제한적 | ✅ |
| Vercel Analytics | ✅ | ❌ | ❌ |

이 문서는 Next.js 호스팅 위주. 외부 호스팅은 일부 한계 있음.

---

## 2. Google Search Console 통합

### 2.1 자동 등록 (사이트 생성 시)

site-creation-flow.md "Step 4: SEO 인프라" + seo-automation.md 11장 통합:

```typescript
// lib/analytics/gsc-setup.ts

export async function setupGoogleSearchConsole(site: ChildSite): Promise<GscSetupResult> {
  if (site.hostingType !== 'nextjs' && site.hostingType !== 'blogger') {
    // Tistory는 자동 등록 어려움 (운영자가 수동)
    return { autoRegistered: false, reason: 'unsupported_hosting' }
  }
  
  // 1. Service Account 인증
  const auth = getServiceAccountAuth([
    'https://www.googleapis.com/auth/webmasters',
  ])
  
  const searchConsole = google.searchconsole({ version: 'v1', auth })
  const baseUrl = `https://${site.hostingConfig.domain}/`
  
  try {
    // 2. property 추가
    await searchConsole.sites.add({ siteUrl: baseUrl })
    
    // 3. DNS / HTML 검증
    //    Service Account가 도메인 owner라면 자동 검증
    //    아니라면 verification 메타 태그 또는 DNS TXT 레코드 안내
    
    const verification = await searchConsole.sites.get({ siteUrl: baseUrl })
    const verified = verification.data.permissionLevel === 'siteOwner' || 
                     verification.data.permissionLevel === 'siteFullUser'
    
    if (!verified) {
      // 자동 검증 실패 → 운영자에 안내
      return {
        autoRegistered: false,
        reason: 'verification_required',
        instructions: 'Search Console Property를 추가했지만 검증이 필요합니다.',
      }
    }
    
    // 4. sitemap 등록
    await searchConsole.sitemaps.submit({
      siteUrl: baseUrl,
      feedpath: `${baseUrl}sitemap.xml`,
    })
    
    // 5. child_sites에 verified=true 기록
    await db.collection('child_sites').doc(site.siteId).update({
      'seoConfig.searchConsoleVerified': true,
      'seoConfig.gscPropertyUrl': baseUrl,
    })
    
    return { autoRegistered: true, propertyUrl: baseUrl }
  } catch (err: any) {
    // Service Account 권한 부족 / API 한도 등
    return {
      autoRegistered: false,
      reason: 'api_error',
      error: err.message,
    }
  }
}
```

### 2.2 일일 데이터 수집

매일 자정 KST Cron:

```typescript
// app/api/cron/fetch-analytics/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const sites = await getActiveChildSites()
  const yesterday = formatDate(subtract(now, days(1)), 'yyyy-MM-dd')
  
  const results = await Promise.allSettled(
    sites.map((site) => fetchSiteAnalyticsForDay(site, yesterday))
  )
  
  return NextResponse.json({
    fetched: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  })
}

async function fetchSiteAnalyticsForDay(site: ChildSite, date: string) {
  if (!site.seoConfig.searchConsoleVerified) return
  
  // 1. GSC 데이터
  const gscData = await fetchGscDailyData(site, date)
  
  // 2. GA4 데이터
  const ga4Data = await fetchGa4DailyData(site, date)
  
  // 3. 광고 수익 (있으면)
  const revenue = await fetchAdsenseDailyRevenue(site, date)
  
  // 4. analytics_snapshots에 저장
  await db
    .collection('sites').doc(site.siteId)
    .collection('analytics_snapshots').doc(date)
    .set({
      date,
      searchConsole: gscData,
      ga4: ga4Data,
      revenue,
      fetchedAt: serverTimestamp(),
    }, { merge: true })
  
  // 5. 변동 감지 → 알림 (선택)
  await detectAnomaliesAndAlert(site, date, gscData, ga4Data)
}
```

### 2.3 GSC API 호출

```typescript
async function fetchGscDailyData(site: ChildSite, date: string): Promise<GscData> {
  const auth = getServiceAccountAuth(['https://www.googleapis.com/auth/webmasters.readonly'])
  const searchConsole = google.searchconsole({ version: 'v1', auth })
  const siteUrl = `https://${site.hostingConfig.domain}/`
  
  // 1. 전체 요약
  const summary = await searchConsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: [],                 // 전체
      rowLimit: 1,
    },
  })
  
  const totals = summary.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  
  // 2. Top 검색어 (50개)
  const queries = await searchConsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: ['query'],
      rowLimit: 50,
    },
  })
  
  // 3. Top 페이지 (50개)
  const pages = await searchConsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: ['page'],
      rowLimit: 50,
    },
  })
  
  // 4. 색인 상태
  const indexingStatus = await fetchIndexingStatus(site)
  
  return {
    totalClicks: totals.clicks,
    totalImpressions: totals.impressions,
    avgCtr: totals.ctr,
    avgPosition: totals.position,
    
    topQueries: (queries.data.rows || []).map((r) => ({
      query: r.keys![0],
      clicks: r.clicks!,
      impressions: r.impressions!,
      ctr: r.ctr!,
      position: r.position!,
    })),
    
    topPages: (pages.data.rows || []).map((r) => ({
      page: r.keys![0],
      clicks: r.clicks!,
      impressions: r.impressions!,
    })),
    
    indexingStatus,
  }
}

async function fetchIndexingStatus(site: ChildSite) {
  // GSC URL Inspection API로 sitemap의 URL들이 색인됐는지
  // 매일 다 검사하면 quota 초과 → 무작위 10개만
  // ... 구현
}
```

---

## 3. Google Analytics 4 통합

### 3.1 자동 등록 (사이트 생성 시)

GA4 property 자동 생성 + Measurement ID를 자식 사이트에 주입:

```typescript
async function setupGa4(site: ChildSite): Promise<Ga4SetupResult> {
  if (site.hostingType !== 'nextjs') {
    return { autoRegistered: false, reason: 'manual_setup_required' }
  }
  
  const auth = getServiceAccountAuth([
    'https://www.googleapis.com/auth/analytics.edit',
  ])
  
  const analytics = google.analyticsadmin({ version: 'v1beta', auth })
  
  try {
    // 1. Property 생성
    const property = await analytics.properties.create({
      requestBody: {
        displayName: site.name,
        timeZone: 'Asia/Seoul',
        currencyCode: 'USD',
      },
    })
    
    // 2. Web Stream 생성 (Measurement ID 받기)
    const dataStream = await analytics.properties.dataStreams.create({
      parent: property.data.name!,
      requestBody: {
        type: 'WEB_DATA_STREAM',
        webStreamData: {
          defaultUri: `https://${site.hostingConfig.domain}`,
        },
        displayName: 'Main',
      },
    })
    
    const measurementId = dataStream.data.webStreamData!.measurementId!
    
    // 3. Vercel 환경변수에 주입
    await vercel.env.set(site.hostingConfig.vercelProjectId, {
      NEXT_PUBLIC_GA4_MEASUREMENT_ID: measurementId,
    })
    
    // 4. 재배포 트리거
    await vercel.deployments.create({ projectId: site.hostingConfig.vercelProjectId })
    
    // 5. child_sites 갱신
    await db.collection('child_sites').doc(site.siteId).update({
      'analytics.ga4MeasurementId': measurementId,
      'analytics.ga4PropertyId': property.data.name,
    })
    
    return { autoRegistered: true, measurementId }
  } catch (err: any) {
    return { autoRegistered: false, reason: 'api_error', error: err.message }
  }
}
```

### 3.2 자식 사이트의 GA4 스크립트

```typescript
// 자식 사이트: app/layout.tsx

import Script from 'next/script'

export default function RootLayout({ children }) {
  const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  
  return (
    <html>
      <head>
        {ga4Id && (
          <>
            <Script 
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', {
                  'anonymize_ip': true,
                  'cookie_flags': 'SameSite=None;Secure',
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 3.3 GA4 Data API 호출

```typescript
async function fetchGa4DailyData(site: ChildSite, date: string): Promise<Ga4Data> {
  if (!site.analytics?.ga4PropertyId) return defaultGa4Data()
  
  const auth = getServiceAccountAuth([
    'https://www.googleapis.com/auth/analytics.readonly',
  ])
  
  const data = google.analyticsdata({ version: 'v1beta', auth })
  
  // 1. 전체 메트릭
  const summary = await data.properties.runReport({
    property: site.analytics.ga4PropertyId,
    requestBody: {
      dateRanges: [{ startDate: date, endDate: date }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    },
  })
  
  const row = summary.data.rows?.[0]?.metricValues || []
  
  // 2. Top 페이지
  const pages = await data.properties.runReport({
    property: site.analytics.ga4PropertyId,
    requestBody: {
      dateRanges: [{ startDate: date, endDate: date }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 30,
    },
  })
  
  // 3. 트래픽 소스
  const sources = await data.properties.runReport({
    property: site.analytics.ga4PropertyId,
    requestBody: {
      dateRanges: [{ startDate: date, endDate: date }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    },
  })
  
  return {
    sessions: parseInt(row[0]?.value || '0'),
    users: parseInt(row[1]?.value || '0'),
    pageviews: parseInt(row[2]?.value || '0'),
    avgSessionDurationSec: parseFloat(row[3]?.value || '0'),
    bounceRate: parseFloat(row[4]?.value || '0'),
    
    topPages: (pages.data.rows || []).map((r) => ({
      page: r.dimensionValues![0].value!,
      pageviews: parseInt(r.metricValues![0].value!),
    })),
    
    sources: (sources.data.rows || []).map((r) => ({
      source: r.dimensionValues![0].value!,
      sessions: parseInt(r.metricValues![0].value!),
    })),
  }
}
```

---

## 4. AI 인사이트 자동 생성

### 4.1 일일 인사이트

매일 자정 데이터 수집 직후 → AI 호출 → 운영자 일일 리포트에 첨부.

```typescript
// app/api/cron/generate-daily-insights/route.ts (자정 데이터 수집 후)

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const sites = await getActiveChildSites()
  
  for (const site of sites) {
    const insights = await generateInsightsForSite(site)
    
    // 일일 리포트에 첨부
    await db.collection('sites').doc(site.siteId)
      .collection('analytics_snapshots').doc(yesterday)
      .update({ insights }, { merge: true })
  }
  
  return NextResponse.json({ ok: true })
}

async function generateInsightsForSite(site: ChildSite) {
  // 1. 어제 데이터
  const yesterday = await getSnapshot(site.siteId, yesterdayDate)
  
  // 2. 비교 기준 (지난 주 같은 요일 + 지난 7일 평균)
  const lastWeekSameDay = await getSnapshot(site.siteId, sameDayLastWeekDate)
  const last7DayAvg = await getAvgSnapshots(site.siteId, 7)
  
  // 3. AI 호출
  const prompt = `
당신은 콘텐츠 사이트의 분석가입니다. 운영자에게 어제 사이트 성과를 보고하고 액션 아이템을 제시하세요.

사이트: ${site.name} (${site.topic})
어제 데이터:
- 클릭: ${yesterday.searchConsole.totalClicks} (지난 주 같은 요일: ${lastWeekSameDay.searchConsole.totalClicks})
- 노출: ${yesterday.searchConsole.totalImpressions}
- CTR: ${(yesterday.searchConsole.avgCtr * 100).toFixed(1)}%
- 평균 순위: ${yesterday.searchConsole.avgPosition.toFixed(1)}
- 세션: ${yesterday.ga4.sessions}
- 페이지뷰: ${yesterday.ga4.pageviews}

Top 검색어 (어제):
${yesterday.searchConsole.topQueries.slice(0, 10).map(q => `- "${q.query}": ${q.clicks} clicks (pos ${q.position.toFixed(1)})`).join('\n')}

Top 페이지 (어제):
${yesterday.ga4.topPages.slice(0, 10).map(p => `- ${p.page}: ${p.pageviews} views`).join('\n')}

분석:
1. 어제 가장 의미 있는 변화 (긍정/부정)
2. 패턴 (반복되는 트렌드)
3. 권장 액션 (운영자가 오늘 할 일 1~3개)

다음 형식으로 JSON 응답:
{
  "summary": "한 줄 요약 (어제 어땠는지)",
  "highlights": ["주목할 점 1", "주목할 점 2"],
  "concerns": ["걱정되는 점"],
  "actions": ["오늘 할 일 1", "오늘 할 일 2"]
}
`
  
  const response = await aiService.call({
    role: 'analytics_aggregator',
    model: 'claude-sonnet-4-6',         // 가벼운 모델로 충분
    prompt,
    expectJson: true,
  })
  
  return response.parsed
}
```

### 4.2 인사이트 예시

```json
{
  "summary": "어제 클릭 +18%, 노출 +24%. 'AI 코딩 도구' 검색어가 평소의 2배.",
  "highlights": [
    "'Claude vs Cursor' 검색에서 4위 → 2위 상승 (CTR 8%까지)",
    "Pillar Page 페이지뷰 +34% (다이제스트 발송 효과)"
  ],
  "concerns": [
    "'AI 코딩 가이드' 키워드 평균 순위 12 → 18로 하락. 경쟁 글 늘어남."
  ],
  "actions": [
    "'AI 코딩 도구' 검색어 노출 늘었지만 CTR 낮음 (1.8%). 이 카테고리 글 메타 description 점검",
    "'AI 코딩 가이드'로 새로운 각도의 글 작성 검토",
    "'Claude vs Cursor' 글에 내부 링크 보강 (현재 1개만 들어옴)"
  ]
}
```

운영자가 일일 리포트에서 보고 즉시 행동 가능.

---

## 5. 콘텐츠 갭 자동 발견

### 5.1 패턴 1: GSC 노출 많은데 사이트 페이지 없음

```typescript
async function findGapInSearchImpressions(site: ChildSite): Promise<ContentGap[]> {
  const last30 = await getSnapshots(site.siteId, 30)
  
  // 30일 누적 검색어
  const queryStats = aggregateQueryStats(last30)
  
  const gaps: ContentGap[] = []
  
  for (const query of queryStats) {
    if (query.totalImpressions > 100 && query.totalClicks < 5) {
      // 노출 많지만 클릭 적음 = 사이트가 노출되지만 매력 없음
      // 해당 검색어 page에 글이 있는지 확인
      const matchingPosts = await findPostsForQuery(site.siteId, query.query)
      
      if (matchingPosts.length === 0) {
        gaps.push({
          query: query.query,
          impressions: query.totalImpressions,
          reason: 'no_matching_post',
          recommendation: `"${query.query}" 키워드로 새 글 작성 검토`,
        })
      } else if (matchingPosts.length > 1) {
        gaps.push({
          query: query.query,
          impressions: query.totalImpressions,
          reason: 'cannibalization',
          recommendation: `같은 키워드 글 ${matchingPosts.length}편이 경쟁 중. 통합 또는 차별화`,
        })
      } else {
        // 글은 있는데 CTR 낮음
        gaps.push({
          query: query.query,
          impressions: query.totalImpressions,
          reason: 'low_ctr',
          recommendation: `'${matchingPosts[0].title}' 메타 description 개선 필요`,
        })
      }
    }
  }
  
  return gaps
}
```

### 5.2 패턴 2: 사이트 검색 결과 0건

search-and-email.md 2.7에서 검색 로그 수집. 결과 0건 검색어 → 콘텐츠 갭:

```typescript
async function findGapInSiteSearch(site: ChildSite): Promise<ContentGap[]> {
  const lastWeek = subtract(now, days(7))
  const zeroResultSearches = await db
    .collection('sites').doc(site.siteId).collection('search_logs')
    .where('timestamp', '>=', lastWeek)
    .where('resultCount', '==', 0)
    .get()
  
  // 같은 쿼리 그룹핑
  const grouped = groupBy(zeroResultSearches.docs, (d) => d.data().query)
  
  const gaps: ContentGap[] = []
  for (const [query, docs] of Object.entries(grouped)) {
    if (docs.length >= 5) {                  // 5회 이상 검색됐는데 결과 0
      gaps.push({
        query,
        impressions: 0,
        searchCount: docs.length,
        reason: 'site_search_no_result',
        recommendation: `사이트 내 검색 ${docs.length}회 발생, 결과 0편. 글 작성 검토`,
      })
    }
  }
  
  return gaps
}
```

### 5.3 주간 콘텐츠 갭 리포트

매주 일요일 자동:

```
[ai-kr 콘텐츠 갭 발견 - 5/6]

GSC 노출은 많은데 글 없는 키워드 (3개)
1. "AI 마케팅 도구" — 노출 1,234 / 글 없음
   → 권장: 새 글 작성

2. "Claude API 사용법" — 노출 892 / 글 1편 (CTR 1.2%)
   → 권장: 메타 description 개선

3. "GPT-5 한국어" — 노출 678 / 글 2편 (cannibalization 의심)
   → 권장: 통합 또는 차별화

사이트 검색 결과 0편 키워드 (2개)
1. "Anthropic 한국 지사" (8회 검색)
2. "AI 도구 한국 결제" (5회 검색)
```

운영자가 어드민 `/sites/{id}/analytics`에서 [글 작성 큐에 추가] 버튼 → Phase 2 outline에 임시 토픽 추가.

---

## 6. 트렌드 감지

### 6.1 갑작스런 검색어 급증

```typescript
async function detectTrendingQueries(site: ChildSite): Promise<TrendingQuery[]> {
  const last7DayQueries = await getQueriesFromLastDays(site.siteId, 7)
  const last30DayBaseline = await getQueriesFromLastDays(site.siteId, 30)
  
  const trending: TrendingQuery[] = []
  
  for (const recent of last7DayQueries) {
    const baseline = last30DayBaseline.find((b) => b.query === recent.query)
    if (!baseline) {
      // 30일에 없던 키워드가 7일에 등장 → 신규 트렌드
      if (recent.impressions > 50) {
        trending.push({
          query: recent.query,
          impressions: recent.impressions,
          type: 'new',
        })
      }
    } else {
      // 기존 키워드의 급증
      const growthFactor = recent.impressions / (baseline.impressions / 4.3)  // 7일 vs 30일 평균 비교
      if (growthFactor > 3) {
        trending.push({
          query: recent.query,
          impressions: recent.impressions,
          growthFactor,
          type: 'spike',
        })
      }
    }
  }
  
  return trending
}
```

급증 키워드 발견 → 즉시 알림:

```
[ai-kr] 검색 트렌드 감지

🔥 'OpenAI o5' 검색 노출 4.2배 증가 (24h)
   - 어제 노출: 234회
   - 평소 평균: 56회
   - 권장: 관련 글 우선 발행 (이미 있으면 sitemap priority 상향)
```

### 6.2 시즌 패턴 인식

매년 반복되는 패턴 자동 학습 (1년 데이터 누적 후):

- 12월 = "연말 정산"
- 5월 = "어버이날"
- 학기 시작 = "AI 학습 도구"
- ...

운영자에게 "다음 주 X 키워드 시즌입니다, 미리 글 준비" 알림.

---

## 7. 메타 어드민 통합

### 7.1 사이트별 분석 페이지 (meta-control-spec.md [13])

```
[ai-kr 분석 - 7일]                       [기간 ▾] [GSC ✅] [GA4 ✅]

┌─────────────────────────────────────────────────────┐
│ 트래픽 오버뷰 (큰 라인 차트)                        │
│   세션 / 사용자 / 페이지뷰 — 일별                   │
└─────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────┐
│ Top 검색어 (GSC)     │ Top 페이지 (GA4)            │
├──────────────────────┼──────────────────────────────┤
│ "ai 도구 비교"       │ /articles/ai-tools-comparison │
│   3,421 imp / 152 cl │   1,232 pv                   │
│ "노션 ai 사용법"     │ /articles/notion-ai-guide    │
│   2,109 imp / 89 cl  │   987 pv                     │
└──────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 색인 상태 (GSC)                                     │
│   ✅ 색인됨: 142 / 156 (91%)                         │
│   ⚠ 발견됨 미색인: 11편                              │
│   ❌ 제외됨: 3편                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🤖 AI 인사이트 (이번 주)                            │
│                                                     │
│ 요약: 검색 트래픽 +18%, 'AI 코딩 도구' 검색어 +120%  │
│                                                     │
│ 주목할 점:                                          │
│ • 'Claude vs Cursor' 4위 → 2위 (CTR 8%)             │
│ • Pillar Page 트래픽 +34%                           │
│                                                     │
│ 걱정되는 점:                                        │
│ • 'AI 코딩 가이드' 순위 12 → 18 하락                │
│                                                     │
│ 콘텐츠 갭:                                          │
│ • 'AI 마케팅 도구' 노출 1.2k / 글 없음              │
│   [글 작성 큐에 추가]                               │
│                                                     │
│ 오늘 할 일:                                         │
│ 1. 'AI 코딩 도구' 카테고리 메타 description 개선    │
│ 2. 'AI 마케팅 도구' 새 글 작성                      │
│ 3. 'Claude vs Cursor' 글에 내부 링크 보강            │
└─────────────────────────────────────────────────────┘
```

### 7.2 Cross-Site 분석 (`/analytics`)

모든 자식 사이트 통합 뷰:

```
[전체 사이트 분석 - 7일]

총 클릭 12,453 / 총 노출 234,891 / 평균 CTR 5.3%

사이트별 7일 성과
사이트         │클릭   │노출    │CTR  │순위 │신규색인│
ai-kr          │4,234  │78,234  │5.4% │11.2 │  18    │
travel-kr      │3,121  │56,789  │5.5% │13.5 │  12    │
travel-en      │2,453  │45,123  │5.4% │14.1 │  9     │
insurance-kr   │1,234  │23,456  │5.3% │15.8 │  6     │
ai-en-tist     │876    │18,234  │4.8% │18.3 │  5     │
ai-en-blog     │535    │13,055  │4.1% │21.0 │  3     │

🤖 메타 인사이트
• ai-kr이 전체 클릭의 34% → ROI 우수, 자원 집중 검토
• travel-en CTR이 travel-kr 동일 (영문 시장도 정상)
• ai-en-blog 평균 순위 21 → 권위 글 추가 우선
```

### 7.3 글별 성과 매트릭스

```
글별 성과 (7일, 클릭 정렬)

제목                                │ 사이트  │조회 │클릭 │CTR  │체류 │순위│
'AI 코딩 도구 비교'                  │ai-kr   │1,234│ 89  │7.2% │3:24 │ 4 │
'OpenAI o5 출시 정리'                │ai-kr   │987  │ 76  │7.7% │2:45 │ 5 │
'후쿠오카 3박4일'                    │travel-kr│823  │ 54  │6.6% │4:12 │ 8 │
...

성과 분석:
🟢 상위: 'AI 코딩 도구 비교' (CTR 7.2%, 체류 3분 24초)
   → 같은 패턴의 글 더 작성 권장

🔴 부진: 'AI 윤리 입문' (CTR 1.2%, 체류 30초)
   → 메타 description 점검 필요
```

---

## 8. 외부 호스팅 분석 (Tistory / Blogger)

### 8.1 Tistory 한계

- GSC: 도메인이 `*.tistory.com`이라 자동 등록 어려움. 운영자가 수동 GSC 설정.
- GA4: Tistory는 본문에 `<script>` 일부 제한. 운영자가 Tistory 관리자에서 GA4 추적 코드 직접 설정.
- API: Tistory는 통계 API 없음. 메타가 페이지별 조회수 못 가져옴.

### 8.2 우회 — Tistory 자체 통계 임포트

운영자가 Tistory 관리자 페이지의 통계를 CSV로 export → 어드민에 업로드:

```
/sites/{id}/analytics → [Tistory 통계 import]
   ↓
CSV 업로드 폼
   ↓
열 매핑 (제목/조회수/날짜)
   ↓
analytics_snapshots에 통합
```

수동이지만 데이터는 통합됨.

### 8.3 Blogger

Blogger는 GSC + GA4 모두 자동 등록 가능. Next.js와 거의 동일.

---

## 9. 데이터 보관 정책

### 9.1 analytics_snapshots TTL

```typescript
{
  date: '2026-05-06',
  // ...
  expiresAt: Timestamp.fromDate(addDays(now, 730)),    // 2년 보관
}
```

2년치 보관 → 시즌 패턴 학습 + 장기 트렌드 분석.

### 9.2 압축 (선택)

365일 지난 스냅샷은 일별 → 월별 집계로 변환:

```typescript
async function compressOldSnapshots(siteId: string) {
  const oneYearAgo = subtract(now, days(365))
  
  const oldSnapshots = await db
    .collection('sites').doc(siteId).collection('analytics_snapshots')
    .where('date', '<=', formatDate(oneYearAgo, 'yyyy-MM-dd'))
    .get()
  
  // 월별 그룹핑 + 합산
  const monthlyAgg = aggregateMonthly(oldSnapshots.docs)
  
  // 월별 문서로 저장
  for (const [month, agg] of Object.entries(monthlyAgg)) {
    await db.collection('sites').doc(siteId).collection('analytics_monthly').doc(month).set(agg)
  }
  
  // 일별 원본 삭제
  for (const doc of oldSnapshots.docs) {
    await doc.ref.delete()
  }
}
```

---

## 10. 비용 추정

### 10.1 API 호출 비용

```
GSC API: 무료 (일일 quota 충분)
GA4 Data API: 무료 (일일 quota 충분)
AdSense Reporting: 무료
```

### 10.2 AI 인사이트 비용

```
일일 인사이트 (Claude Sonnet):
  - 입력 ~3,000 토큰 + 출력 ~500 토큰
  - 비용: ~$0.012/사이트/일
  - 자식 사이트 6개: $0.07/일 = $2.10/월

주간 콘텐츠 갭 분석:
  - 더 큰 입력 (~10,000 토큰)
  - 비용: ~$0.04/사이트/주
  - 6 사이트 × 4주: $0.96/월

월 총 인사이트 비용: ~$3
```

### 10.3 Firestore 비용

```
analytics_snapshots:
  일일 1회 쓰기 × 6 사이트 × 30일 = 180 writes/월
  → ~$0.001
  
조회: 어드민에서 7일 / 30일 fetch → 무시 가능
```

전체 분석 통합 비용: 월 **약 $3**.

---

## 11. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ GSC 자동 등록 + 검증 + sitemap 등록
- ✅ GA4 Property + Web Stream 자동 생성 + Measurement ID 주입
- ✅ 일일 데이터 fetch (GSC + GA4 + 광고 수익)
- ✅ AI 일일 인사이트 (Claude Sonnet, $0.07/일/6사이트)
- ✅ 콘텐츠 갭 자동 발견 (GSC + 사이트 검색 0건)
- ✅ 트렌드 감지 (검색어 급증 / 시즌 패턴)
- ✅ 메타 어드민 cross-site 분석 + 글별 성과 매트릭스
- ✅ Tistory 한계 + CSV 임포트 우회
- ✅ 데이터 보관 (2년 + 월별 압축)
- ✅ 비용 ~$3/월 (전체 분석)

이 문서가 정의하지 않은 것:
- ❌ Vercel Cron 동적 등록 → `vercel-cron-spec.md` (다음)
- ❌ 환경변수 정리 → `environment-variables.md`
- ❌ 자식 사이트 배포 자체 → `deployment-guide.md`

---

## 12. Tier E 완료 체크포인트

**Tier E 핵심 — "운영자 1인이 N개 사이트를 안전 운영":**

| 문서 | 역할 |
|------|-----|
| `monitoring-health.md` | 자동 헬스체크 + 알림 + 자동 복구 |
| `duplicate-prevention.md` | 4레벨 임베딩 중복 차단 |
| `search-and-email.md` | 시맨틱 검색 + 뉴스레터 (직접 채널) |
| `analytics-integration.md` | GSC + GA4 + AI 인사이트 → 자동 액션 |

이 4개가 함께: 사이트 → 자동 운영 → 자동 모니터링 → 자동 인사이트 → 자동 액션의 완전 자동화 루프.

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. seo-automation.md / monitoring-health.md / search-and-email.md v1.0 기준. |

---

*이 문서는 메타사이트의 분석 통합 단일 출처다. GSC/GA4 자동 등록 + 일일 데이터 수집 + AI 인사이트 자동 생성의 모든 결정을 담고 있다.*

*Tier E 완료. 다음 문서: `vercel-cron-spec.md` (Tier F 1번)*
