# META-SITE: Vercel Cron 명세 (vercel-cron-spec.md)

> 모든 자동화 작업의 트리거인 Cron 시스템. 정적 + 동적 등록 패턴 + Cloudflare Workers 폴백.
> 다른 모든 문서에서 "Cron으로 트리거"라고 언급된 모든 작업의 단일 출처.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ analytics-integration.md   (Tier E 마지막)
  └─ vercel-cron-spec.md        ★ 이 문서 — Tier F 시작
        └─ environment-variables.md  (다음)
```

이 문서는:
- 메타사이트의 모든 Cron 작업 카탈로그
- 정적 vs 동적 Cron 등록 패턴
- Vercel Cron 한계 + Cloudflare Workers 폴백
- 시간대 처리 + 인증 + 실패 처리
- Cron 자체 모니터링

---

## 1. 핵심 원칙

### 1.1 자동화의 심장

> **"모든 자동화는 Cron이 시작점이다. Cron이 멈추면 메타사이트도 멈춘다."**

Cron은 메타사이트 운영의 핵심 인프라:
- 콘텐츠 파이프라인 (Scout → Evaluate → Summarize → Generate)
- 헬스체크 (외부 의존 / 자식 사이트)
- 비용 모니터링
- 분석 데이터 수집
- 알림 묶음 발송
- 일일/주간 리포트

### 1.2 정적 + 동적 분리

```
[정적 Cron]
  메타사이트 vercel.json에 미리 등록
  사이트 수와 무관 (전역 작업)
  → 헬스체크, 비용 체크, 일일 리포트, 백업 등

[동적 Cron]
  자식 사이트 생성 시 자동 등록
  사이트마다 다른 schedule
  → 섹션별 발행 트리거, 사이트별 권위 트리 등
```

### 1.3 한계 인지

Vercel Cron의 한계:
- **Hobby 플랜**: 일일 1회 호출만 (사실상 불가)
- **Pro 플랜**: 분당 60회 / 월 100k 호출
- **vercel.json은 최대 정적 entries** (동적 추가 X)

자식 사이트 100개 이상 → Vercel Cron 불충분 → Cloudflare Workers 폴백 필요.

---

## 2. Cron 작업 카탈로그

### 2.1 정적 Cron (vercel.json)

메타사이트 `/api/cron/*` 엔드포인트들:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/health-check-external",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/health-check-sites",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/budget-check",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/pending-review",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/pipeline-tick",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/pipeline-stats",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/data-integrity",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/fetch-analytics",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/generate-daily-insights",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 12 * * 0"
    },
    {
      "path": "/api/cron/hourly-digest",
      "schedule": "5 * * * *"
    },
    {
      "path": "/api/cron/embedding-backfill",
      "schedule": "30 * * * *"
    },
    {
      "path": "/api/cron/auto-resume-sites",
      "schedule": "0 15 * * *"
    },
    {
      "path": "/api/cron/cleanup-orphan-data",
      "schedule": "0 17 * * *"
    },
    {
      "path": "/api/cron/newsletter-digest",
      "schedule": "0 0 * * 2"
    },
    {
      "path": "/api/cron/weekly-pillar-refresh",
      "schedule": "0 16 * * 0"
    },
    {
      "path": "/api/cron/source-weight-rebalance",
      "schedule": "0 18 * * 0"
    },
    {
      "path": "/api/cron/broken-link-check",
      "schedule": "0 19 * * *"
    },
    {
      "path": "/api/cron/gdpr-cleanup",
      "schedule": "0 20 * * *"
    },
    {
      "path": "/api/cron/firestore-backup",
      "schedule": "0 21 * * *"
    }
  ]
}
```

> 모든 schedule은 **UTC** 기준. KST = UTC + 9.

### 2.2 정적 Cron 표 (의미 정리)

| Path | 스케줄 (UTC) | KST 시각 | 빈도 | 설명 | 출처 문서 |
|------|------------|--------|------|------|----------|
| `health-check-external` | `*/5 * * * *` | 매 5분 | 5분 | 외부 API 헬스 | monitoring-health.md |
| `health-check-sites` | `*/15 * * * *` | 매 15분 | 15분 | 자식 사이트 헬스 | monitoring-health.md |
| `budget-check` | `*/5 * * * *` | 매 5분 | 5분 | 비용 한도 체크 | monitoring-health.md |
| `pending-review` | `0 * * * *` | 매 시간 0분 | 1시간 | 검수 큐 / 알림 누적 | monitoring-health.md |
| `pipeline-tick` | `*/10 * * * *` | 매 10분 | 10분 | 파이프라인 디스패처 | content-pipeline.md |
| `pipeline-stats` | `0 * * * *` | 매 시간 0분 | 1시간 | 파이프라인 메트릭 | content-pipeline.md |
| `data-integrity` | `0 0 * * *` | 09:00 | 매일 | 임베딩/링크 점검 | duplicate-prevention.md |
| `fetch-analytics` | `0 1 * * *` | 10:00 | 매일 | GSC + GA4 fetch | analytics-integration.md |
| `generate-daily-insights` | `0 2 * * *` | 11:00 | 매일 | AI 인사이트 생성 | analytics-integration.md |
| `daily-report` | `0 0 * * *` | 09:00 | 매일 | 일일 리포트 발송 | monitoring-health.md |
| `weekly-report` | `0 12 * * 0` | 일 21:00 | 매주 | 주간 리포트 | monitoring-health.md |
| `hourly-digest` | `5 * * * *` | 매 시간 5분 | 1시간 | low/medium 알림 묶음 | monitoring-health.md |
| `embedding-backfill` | `30 * * * *` | 매 시간 30분 | 1시간 | 누락 임베딩 채움 | duplicate-prevention.md |
| `auto-resume-sites` | `0 15 * * *` | 24:00 | 매일 | 비용 정지 사이트 재개 | monitoring-health.md |
| `cleanup-orphan-data` | `0 17 * * *` | 02:00 | 매일 | TTL 정리 | database-schema.md |
| `newsletter-digest` | `0 0 * * 2` | 화 09:00 | 매주 | 주간 다이제스트 | search-and-email.md |
| `weekly-pillar-refresh` | `0 16 * * 0` | 일 01:00 | 매주 | Pillar 정합성 검증 | internal-linking.md |
| `source-weight-rebalance` | `0 18 * * 0` | 일 03:00 | 매주 | 출처 가중치 조정 | content-pipeline.md |
| `broken-link-check` | `0 19 * * *` | 04:00 | 매일 | 깨진 링크 검사 | internal-linking.md |
| `gdpr-cleanup` | `0 20 * * *` | 05:00 | 매일 | IP 90일 정리 | search-and-email.md |
| `firestore-backup` | `0 21 * * *` | 06:00 | 매일 | DB 백업 | database-schema.md |

총 21개 정적 Cron. **Vercel Pro 한계 (월 100k 호출) 안에 충분히 들어감.**

```
21개 cron × 평균 일 12회 = 252 호출/일 = 7,560 호출/월
```

### 2.3 동적 Cron (자식 사이트별)

자식 사이트마다 섹션별 발행 schedule이 있음. 사이트 6개 × 섹션 3개 = 18개 추가.

```
ai-kr/news        매일 21:00 KST       → 12:00 UTC
ai-kr/tools       월수금 22:30 KST     → 13:30 UTC
ai-kr/usecases    매일 06:00 KST       → 21:00 UTC

travel-kr/domestic  매일 19:00 KST     → 10:00 UTC
travel-kr/intl      주2회 화목 21:00   → 화목 12:00 UTC
travel-kr/tips      매일 07:00 KST     → 22:00 UTC

... (사이트 6개 × 섹션 3개 = 18개)
```

이건 vercel.json에 정적 등록 가능. 단 **사이트가 추가/제거될 때마다 재배포** 필요.

---

## 3. 동적 Cron 등록 패턴

### 3.1 옵션 1: vercel.json 동적 빌드 (권장)

새 사이트 생성 시 `vercel.json`을 자동 갱신 + 재배포.

```typescript
// lib/cron/vercel-json-builder.ts

export async function rebuildVercelJson() {
  const sites = await getActiveChildSites()
  
  // 정적 Cron + 동적 Cron 통합
  const staticCrons = STATIC_CRONS_DEFINITION
  
  const dynamicCrons: VercelCron[] = []
  for (const site of sites) {
    for (const section of site.sections.filter((s) => s.enabled)) {
      dynamicCrons.push({
        path: `/api/cron/section-tick?siteId=${site.siteId}&sectionId=${section.sectionId}`,
        schedule: section.schedule.cronExpression,
      })
    }
  }
  
  // 한도 체크
  const total = staticCrons.length + dynamicCrons.length
  if (total > 80) {
    // Vercel Pro 한계 가까워짐 → 통합 디스패처로 전환
    return rebuildWithDispatcher()
  }
  
  // vercel.json 작성
  const config = {
    // ... 다른 설정 ...
    crons: [...staticCrons, ...dynamicCrons],
  }
  
  await writeFile('vercel.json', JSON.stringify(config, null, 2))
  
  // GitHub commit + push → Vercel 자동 재배포
  await gitCommitPush('chore: update vercel.json crons', ['vercel.json'])
  
  return { total, deployed: true }
}
```

### 3.2 옵션 2: 통합 디스패처 (사이트 50+ 시)

자식 사이트가 늘어나면 vercel.json entries가 너무 많아짐. 통합 디스패처 패턴:

```typescript
// vercel.json 단순화
{
  "crons": [
    // ... 정적 Cron ...
    
    {
      "path": "/api/cron/section-dispatcher",
      "schedule": "*/5 * * * *"           // 5분마다 1번만
    }
  ]
}

// app/api/cron/section-dispatcher/route.ts
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const now = new Date()
  const sites = await getActiveChildSites()
  
  // 각 사이트의 각 섹션마다 schedule 평가
  for (const site of sites) {
    for (const section of site.sections.filter((s) => s.enabled)) {
      // cron-parser로 다음 실행 시각 계산
      const cronExpression = section.schedule.cronExpression
      const lastRun = section.schedule.lastRun?.toMillis() || 0
      
      const interval = cronParser.parseExpression(cronExpression)
      const prevTrigger = interval.prev().getTime()
      
      // 마지막 트리거 시각 이후라면 실행
      if (prevTrigger > lastRun) {
        await triggerSectionPipeline(site.siteId, section.sectionId)
        await updateSectionLastRun(site.siteId, section.sectionId, prevTrigger)
      }
    }
  }
  
  return NextResponse.json({ ok: true })
}
```

장점:
- vercel.json 변경 없음 (자식 사이트 무한 추가)
- 메타가 모든 일정 통제

단점:
- 5분 간격 정확도 (분 단위 정확한 schedule 어려움)
- 디스패처 함수 한 번에 여러 작업 처리 (timeout 위험)

### 3.3 결정 기준

```
자식 사이트 < 10개:    옵션 1 (vercel.json 동적 빌드)
자식 사이트 10~50개:   옵션 1 + 통합 디스패처 혼합
자식 사이트 50+:       옵션 2 (통합 디스패처) + Cloudflare Workers
```

기본은 옵션 1로 시작. site-creation-flow.md의 "Step 7: Phase 부트스트랩"에서 자동 트리거.

---

## 4. Cloudflare Workers 폴백

### 4.1 왜 폴백이 필요한가

Vercel 한계 도달 시나리오:
- 자식 사이트 100+
- 분당 호출 60+ (Pro 한계)
- 월 100k 호출 초과

Cloudflare Workers는:
- **무료 플랜**: 일 100k 호출 (충분)
- **Cron Triggers**: 분 단위 schedule
- **Vercel 함수보다 가벼움**

### 4.2 사용 패턴

> **"Cloudflare Workers는 외부 트리거 역할. 실제 작업은 Vercel 함수가."**

```
[Cloudflare Worker Cron]
   매 분 / 시간 schedule
   ↓
   HTTP POST → 메타사이트 Vercel 엔드포인트
   ↓
[Vercel Function]
   실제 작업 처리 (Firestore, AI, etc.)
```

Cloudflare는 Cron 트리거만, 작업 자체는 Vercel.

### 4.3 셋업

```typescript
// cloudflare-workers/cron-trigger/src/index.ts

export default {
  async scheduled(event, env, ctx) {
    const url = `https://meta.example.com/api/cron/cloudflare-tick`
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CRON_SECRET}`,
        'X-Trigger-Source': 'cloudflare',
        'X-Cron-Pattern': event.cron,
      },
      body: JSON.stringify({
        cron: event.cron,
        scheduledTime: event.scheduledTime,
      }),
    })
  },
}

// wrangler.toml
[triggers]
crons = ["*/5 * * * *"]
```

### 4.4 부분 마이그레이션

```
[정적 Cron — 메타 전역]
  Vercel Cron (그대로)

[동적 Cron — 사이트별 발행 트리거]
  Cloudflare Workers (사이트 50+ 시 마이그레이션)
```

마이그레이션 시점: Vercel 호출이 80k/월 도달 시 자동 알림 → 운영자가 옵션 2 + Cloudflare로 전환.

---

## 5. 시간대 처리

### 5.1 표준: 모든 schedule은 UTC

Vercel Cron, Cloudflare Workers 모두 UTC. 혼동 금지.

```typescript
// ❌ 나쁜 예
schedule: '0 21 * * *'  // KST 21시? UTC 21시?

// ✅ 좋은 예
schedule: '0 12 * * *'  // UTC 12:00 = KST 21:00
// 코드 옆에 KST 시각 주석
```

### 5.2 KST → UTC 변환 헬퍼

```typescript
// lib/cron/timezone.ts

export function kstToUtcCron(kstHour: number, kstMinute: number = 0): string {
  // KST = UTC + 9
  let utcHour = kstHour - 9
  if (utcHour < 0) utcHour += 24
  
  return `${kstMinute} ${utcHour} * * *`
}

// 사용
const schedule = kstToUtcCron(21, 0)        // KST 21:00 → UTC 12:00
// → '0 12 * * *'

const newsletter = kstToUtcCron(9, 0)       // KST 09:00 → UTC 00:00
// → '0 0 * * *'
```

### 5.3 사이트별 timezone

자식 사이트가 다른 timezone (예: travel-en은 EST)이면 → 사이트의 `language` 따라 발행 시간 자동 조정.

```typescript
function getSectionScheduleForSite(site: ChildSite, hour: number): string {
  const tzOffset = getTimezoneOffsetForLanguage(site.language)
  // ko: +9, en: 0 (UTC), ja: +9, zh: +8 등
  
  let utcHour = hour - tzOffset
  if (utcHour < 0) utcHour += 24
  if (utcHour >= 24) utcHour -= 24
  
  return `0 ${utcHour} * * *`
}
```

---

## 6. Cron 인증

### 6.1 CRON_SECRET 헤더 검증

모든 Cron 엔드포인트는 인증 필수. 외부 호출 차단.

```typescript
// lib/cron/auth.ts

export function verifyCronSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  
  const token = authHeader.slice(7)
  return token === process.env.CRON_SECRET
}

// 사용
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // ... 작업 ...
}
```

### 6.2 Vercel Cron 자동 헤더

Vercel Cron은 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더 추가. `vercel env`에서 `CRON_SECRET` 설정해두면 자동.

### 6.3 추가 보안

```typescript
function verifyCronSecret(req: NextRequest): boolean {
  // 1. CRON_SECRET 검증
  const authValid = checkAuthHeader(req)
  if (!authValid) return false
  
  // 2. Vercel-id 헤더 (Vercel만 추가)
  const vercelId = req.headers.get('x-vercel-id')
  if (process.env.NODE_ENV === 'production' && !vercelId) return false
  
  // 3. User-Agent 체크 (Vercel Cron 또는 Cloudflare)
  const ua = req.headers.get('user-agent') || ''
  const isCron = ua.includes('vercel-cron') || ua.includes('Cloudflare-Workers')
  
  return authValid && isCron
}
```

---

## 7. Cron 실패 처리

### 7.1 Cron 함수의 Idempotency

Cron은 가끔 중복 호출될 수 있음 (Vercel 재시도). 함수가 **idempotent**해야 함.

```typescript
async function dailyReport() {
  // 1. 오늘 이미 발송됐는지 체크
  const today = formatDate(new Date(), 'yyyy-MM-dd')
  const existing = await db.collection('cron_locks').doc(`daily-report-${today}`).get()
  
  if (existing.exists && existing.data()!.status === 'completed') {
    return { skipped: 'already_sent_today' }
  }
  
  // 2. lock 획득
  await db.collection('cron_locks').doc(`daily-report-${today}`).set({
    status: 'running',
    startedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(addHours(new Date(), 1)),  // 1시간 후 자동 해제
  })
  
  try {
    // 3. 실제 작업
    await generateAndSendDailyReport()
    
    // 4. 완료 마킹
    await db.collection('cron_locks').doc(`daily-report-${today}`).update({
      status: 'completed',
      completedAt: serverTimestamp(),
    })
  } catch (err) {
    // 5. 실패 시 lock 해제 (재시도 가능)
    await db.collection('cron_locks').doc(`daily-report-${today}`).delete()
    throw err
  }
}
```

### 7.2 실패 재시도

Vercel Cron은 자동 재시도 안 함. 실패해도 다음 schedule만 트리거.

→ 중요한 작업은 자체 재시도 큐 사용:

```typescript
async function fetchAnalytics() {
  try {
    await doFetchAnalytics()
  } catch (err) {
    // failed_jobs에 등록
    await db.collection('failed_jobs').add({
      type: 'fetch_analytics',
      params: { date: yesterdayDate },
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: Timestamp.fromDate(addMinutes(new Date(), 30)),
      createdAt: serverTimestamp(),
    })
  }
}

// 매시간 실행되는 retry-failed-jobs Cron
async function retryFailedJobs() {
  const jobs = await db.collection('failed_jobs')
    .where('nextRetryAt', '<=', new Date())
    .where('retryCount', '<', 'maxRetries')
    .limit(20)
    .get()
  
  for (const doc of jobs.docs) {
    const job = doc.data()
    try {
      await executeJob(job.type, job.params)
      await doc.ref.delete()
    } catch (err) {
      await doc.ref.update({
        retryCount: increment(1),
        lastError: err.message,
        nextRetryAt: Timestamp.fromDate(
          addMinutes(new Date(), Math.pow(2, job.retryCount + 1) * 30)  // exponential backoff
        ),
      })
      
      if (job.retryCount + 1 >= job.maxRetries) {
        // 영구 실패 → critical 알림
        await createAlert({
          severity: 'high',
          category: 'health',
          title: `Job 영구 실패: ${job.type}`,
          message: err.message,
        })
      }
    }
  }
}
```

### 7.3 Cron 자체 모니터링

Cron이 실행됐는지 추적. `cron_executions` 컬렉션:

```typescript
async function logCronExecution(name: string, status: 'success' | 'failed', error?: string) {
  await db.collection('cron_executions').add({
    name,
    status,
    error,
    executedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(addDays(new Date(), 30)),
  })
}

// 사용
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  try {
    await dailyReport()
    await logCronExecution('daily-report', 'success')
  } catch (err) {
    await logCronExecution('daily-report', 'failed', err.message)
    throw err
  }
  
  return NextResponse.json({ ok: true })
}
```

매일 자정 별도 Cron이 어제 누락된 작업 검사:

```typescript
async function detectMissingCronExecutions() {
  const expectedDailyCrons = [
    'daily-report',
    'fetch-analytics',
    'data-integrity',
    'firestore-backup',
    // ...
  ]
  
  const yesterday = subtract(now, days(1))
  const missing: string[] = []
  
  for (const cronName of expectedDailyCrons) {
    const executed = await db.collection('cron_executions')
      .where('name', '==', cronName)
      .where('executedAt', '>=', yesterday)
      .where('status', '==', 'success')
      .limit(1).get()
    
    if (executed.empty) missing.push(cronName)
  }
  
  if (missing.length > 0) {
    await createAlert({
      severity: 'critical',
      category: 'health',
      title: `Cron 실행 누락 감지`,
      message: `다음 Cron이 어제 실행되지 않았습니다: ${missing.join(', ')}`,
      context: { missing },
    })
  }
}
```

이게 Cron의 **데드맨 스위치**. Cron 자체가 멈췄는지 검증.

---

## 8. Vercel Function 시간 한계

### 8.1 한계

- **Hobby**: 10초
- **Pro**: 300초 (5분)
- **Enterprise**: 900초 (15분)

5분 안에 안 끝나는 작업은 분할 필요.

### 8.2 분할 패턴

```typescript
// ❌ 나쁜 예 (한 함수에서 다 처리)
async function dailyReport() {
  for (const site of allSites) {            // 100개 사이트
    await fetchData(site)                    // 각 30초
    await generateReport(site)               // 각 60초
  }
  // → 100 × 90 = 9000초 → timeout!
}

// ✅ 좋은 예 (디스패처 + 사이트별 분할)
async function dailyReportDispatcher() {
  for (const site of allSites) {
    // 비동기로 다른 함수 트리거 (5분 안에 끝남)
    await fetch(`${baseUrl}/api/process-site-report?siteId=${site.siteId}`, {
      method: 'POST',
      headers: { 'X-Internal': 'true' },
    })
  }
}

async function processSiteReport(siteId) {
  await fetchData(siteId)
  await generateReport(siteId)
  // 90초 안에 끝남
}
```

### 8.3 큰 작업 분할 패턴

content-pipeline.md 6.2 Generate Post의 3단계 분할:

```
Stage A (Writer) → 60초
Stage B (Verifier) → 60초
Stage C (Editor + 후처리) → 60초

각 stage가 다음 stage를 비동기로 트리거.
```

대량 데이터 작업은 페이지네이션:

```typescript
async function processLargeDataset(offset = 0, limit = 50) {
  const batch = await db.collection('...')
    .orderBy('createdAt')
    .startAfter(offset)
    .limit(limit)
    .get()
  
  for (const doc of batch.docs) {
    await processDoc(doc)
  }
  
  // 다음 배치 비동기 트리거
  if (batch.size === limit) {
    await fetch(`${baseUrl}/api/process-large?offset=${offset + limit}`, {
      method: 'POST',
    })
  }
}
```

---

## 9. Cron 모니터링 + 어드민 통합

### 9.1 Cron 상태 페이지

`/cron-status` 어드민 (선택):

```
[Cron 상태 - 24시간]

정적 Cron (21개)
─────────────
✅ health-check-external          매 5분    288/288 success
✅ health-check-sites             매 15분   96/96 success
✅ budget-check                   매 5분    288/288 success
🟡 pipeline-tick                  매 10분   142/144 success (2회 실패)
✅ daily-report                   매일      1/1 success
🔴 firestore-backup               매일      0/1 (어제 실행 안됨!)
...

동적 Cron (18개)
─────────────
✅ ai-kr/news        매일 21:00 KST     1/1
✅ ai-kr/tools       월수금 22:30 KST   1/1
...
```

🔴 빨간색은 즉시 알림 트리거.

### 9.2 메트릭

`cron_executions` 컬렉션에서 24시간 통계:

```typescript
async function getCronMetrics(name: string, hours: number = 24) {
  const since = subtract(now, hours)
  const executions = await db.collection('cron_executions')
    .where('name', '==', name)
    .where('executedAt', '>=', since)
    .get()
  
  const success = executions.docs.filter((d) => d.data().status === 'success').length
  const failed = executions.docs.filter((d) => d.data().status === 'failed').length
  
  return {
    total: executions.size,
    success,
    failed,
    successRate: executions.size > 0 ? success / executions.size : 0,
  }
}
```

### 9.3 알림 트리거

```typescript
const CRON_ALERT_THRESHOLDS = {
  success_rate_min: 0.95,             // 95% 미만이면 알림
  consecutive_failures_max: 3,         // 3회 연속 실패
  no_execution_max_hours: 2,           // 예상 빈도의 2배 이상 미실행
}

async function checkCronHealth(name: string, schedule: string) {
  const metrics = await getCronMetrics(name)
  
  if (metrics.successRate < CRON_ALERT_THRESHOLDS.success_rate_min) {
    await createAlert({
      severity: 'high',
      category: 'health',
      title: `Cron 성공률 낮음: ${name}`,
      message: `최근 24시간 성공률 ${(metrics.successRate * 100).toFixed(0)}%`,
    })
  }
}
```

---

## 10. 사이트 생성 시 Cron 자동 등록

site-creation-flow.md "Step 7: Phase 부트스트랩"의 상세:

```typescript
// lib/site-creation/register-crons.ts

export async function registerSectionCronsForSite(site: ChildSite) {
  // Phase 1 사이트는 동적 Cron 미등록 (권위 빌더가 직접 트리거)
  if (site.currentPhase === 'authority') return
  
  // 옵션 1: vercel.json 갱신
  if (await getActiveSitesCount() < 10) {
    await rebuildVercelJson()
    return
  }
  
  // 옵션 2: 통합 디스패처 (자식 사이트 정보만 Firestore에 — 디스패처가 읽음)
  // 별도 코드 변경 X (디스패처가 child_sites에서 자동 fetch)
}

export async function unregisterSectionCronsForSite(site: ChildSite) {
  // 사이트 삭제/일시정지 시 Cron 제거
  if (await getActiveSitesCount() < 10) {
    await rebuildVercelJson()
  }
  // 옵션 2는 자동 (sections.enabled=false면 디스패처가 스킵)
}
```

---

## 11. 비용 추정

### 11.1 Vercel Pro 한계

- 월 100k cron 호출
- 함수당 300초

### 11.2 메타사이트 사용량

```
정적 Cron 21개:
  high-frequency (5~10분): 8개 × ~250 호출/일 = 2,000/일
  medium (1시간): 9개 × 24 호출/일 = 216/일
  daily/weekly: 4개 × 1 호출/일 = 4/일
  → ~2,220/일 = ~67k/월

동적 Cron (사이트 6개 × 섹션 3개):
  18개 × ~3 호출/일 = 54/일 = ~1,620/월

총: ~70k/월 (Vercel Pro 한계의 70%)
```

자식 사이트 늘어나면 Cloudflare Workers 폴백 검토.

### 11.3 Cloudflare Workers 비용

무료 플랜으로 일 100k 호출 가능. 매우 저렴.

---

## 12. 예제 — 새 자식 사이트 생성 시 Cron 흐름

```
1. /sites/new에서 운영자가 사이트 생성 폼 제출
   ↓
2. createSite() 트랜잭션 (site-creation-flow.md)
   ↓ Step 7: Phase 부트스트랩
3. registerSectionCronsForSite() 호출
   ↓
4. 옵션 1 분기:
   사이트 5개 + 새 사이트 1개 = 6개 (< 10) → vercel.json 빌드
   ↓
5. rebuildVercelJson() 실행
   - 21개 정적 Cron + 18개 + 3개 새 섹션 = 42 entries
   - vercel.json 작성 → git commit → push
   ↓
6. Vercel 자동 재배포 (~2분)
   ↓
7. Cron 활성화. 다음 schedule부터 트리거.
```

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 21개 정적 Cron 카탈로그 + 시간/빈도/출처 문서
- ✅ 정적 vs 동적 Cron 분리
- ✅ 옵션 1 (vercel.json 동적 빌드) vs 옵션 2 (통합 디스패처)
- ✅ Cloudflare Workers 폴백 패턴 (사이트 50+)
- ✅ KST → UTC 변환 헬퍼
- ✅ CRON_SECRET 인증 + 추가 보안 (vercel-id, user-agent)
- ✅ Idempotency + cron_locks
- ✅ failed_jobs 큐 + exponential backoff
- ✅ Cron 자체 모니터링 (cron_executions + 데드맨 스위치)
- ✅ Vercel 5분 한계 + 분할 패턴
- ✅ 사이트 생성 시 Cron 자동 등록
- ✅ 비용 추정 (월 70k/100k)

이 문서가 정의하지 않은 것:
- ❌ 환경변수 정리 (CRON_SECRET 등) → `environment-variables.md`
- ❌ 자식 사이트 배포 자체 → `deployment-guide.md`
- ❌ 사이트 생성 후 검증 체크리스트 → `testing-checklist.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 다른 문서의 Cron 트리거 통합. |

---

*이 문서는 메타사이트의 Cron 시스템 단일 출처다. 21개 정적 + 동적 Cron + 폴백 + 모니터링의 모든 결정을 담고 있다.*

*다음 문서: `environment-variables.md` (Tier F 2번)*
