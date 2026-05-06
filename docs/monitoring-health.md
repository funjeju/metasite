# META-SITE: 모니터링과 헬스 (monitoring-health.md)

> 운영자 1인이 자식 사이트 N개를 안전하게 운영하기 위한 자동 모니터링/알림/복구 시스템.
> 임계값 정의 + 알림 채널 통합 + 자동 복구 액션 + 비용 한도 + 일일/주간 리포트.
> core.md "13. 모니터링"의 상세 + 모든 다른 문서에서 언급된 알림/실패 처리의 구체 구현.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ monetization.md           (Tier D 마지막)
  └─ monitoring-health.md      ★ 이 문서 — Tier E 시작
        └─ duplicate-prevention.md   (다음)
```

이 문서는:
- 모든 자동 헬스체크의 구체 임계값
- `alerts` 컬렉션 기반 알림 라이프사이클
- Slack / Discord / Email 통합
- 자동 복구 액션 (사이트 정지 / 출처 비활성화 / 폴백 등)
- 비용 한도 + 자동 사이트 정지
- 일일/주간 자동 리포트

---

## 1. 핵심 원칙

### 1.1 운영자 1인 가정

> **"운영자가 매일 30분 미만 보면서도 N개 사이트를 안전 운영해야 한다."**

원칙:
- **알림 폭격 금지** — 같은 이슈 30분 내 1번만
- **자동 복구 우선** — 사람 개입은 마지막 수단
- **심각도 기반 라우팅** — critical만 Slack 즉시, low는 일일 리포트로 묶음
- **실패는 시스템화** — 재시도 큐 / 폴백 체인 / 점진적 격리

### 1.2 4단계 심각도 매트릭스

```
critical   →  서비스 지속 불가능 (즉시 운영자 개입 필요)
high       →  중요 기능 장애 (몇 시간 안에 해결 필요)
medium     →  주의 필요 (오늘 안에 검토)
low        →  정보성 (주간 리포트로 묶음)
```

각 심각도는 다른 알림 채널/즉시성/UI 표시.

### 1.3 자동화 우선

운영자 알림은 **자동 복구 실패 후 마지막 수단**:

```
[이상 감지]
   ↓
[자동 복구 시도]
   ├─ 성공 → 로그만, 알림 X
   └─ 실패 → 재시도 (최대 N회)
              ├─ 성공 → low 알림 (사후 인지용)
              └─ 영구 실패 → 심각도별 알림
```

---

## 2. 헬스체크 분류

### 2.1 무엇을 헬스체크하는가

```
[L1] 외부 의존
   AI API (Anthropic / OpenAI / Google)
   Firebase
   Vercel API
   Tistory / Blogger API
   YouTube Data API
   검색 API (Tavily / Perplexity)
   GSC / GA4

[L2] 자식 사이트
   각 사이트의 도메인 응답
   ISR revalidation 동작
   /llms.txt /sitemap.xml 접근

[L3] 콘텐츠 파이프라인
   Scout 단계 후보 수집률
   Evaluate AI 평가율
   Summarize 처리율
   Generate 성공률
   발행 성공률

[L4] 데이터 일관성
   curated_posts.embedding 누락
   internalLinks 깨진 링크
   인덱스 누락 (sitemap 검색 결과 비교)

[L5] 비용
   AI 토큰 누적
   사이트별 일일 한도
   월 예산 진행

[L6] 운영자 결정 대기
   검수 큐 누적
   권위 트리 승인 대기
```

### 2.2 헬스체크 주기

| 레벨 | 주기 | 위치 |
|------|------|------|
| L1 외부 의존 | 5분마다 | `/api/cron/health-check-external` |
| L2 자식 사이트 | 15분마다 | `/api/cron/health-check-sites` |
| L3 파이프라인 | 발행 시마다 + 1시간 통계 | inline + `/api/cron/pipeline-stats` |
| L4 데이터 일관성 | 매일 자정 | `/api/cron/data-integrity` |
| L5 비용 | 5분마다 | `/api/cron/budget-check` |
| L6 운영자 대기 | 1시간마다 | `/api/cron/pending-review` |

---

## 3. 임계값 정의

각 항목별 자동 액션 트리거 기준.

### 3.1 외부 의존 (L1)

```typescript
const L1_THRESHOLDS = {
  ai_api: {
    p50_latency_ms: 5000,
    p95_latency_ms: 15000,
    error_rate_5min: 0.1,           // 10% 실패 → high 알림
    consecutive_failures: 5,         // 5회 연속 실패 → 폴백 모델 사용
  },
  firebase: {
    p95_latency_ms: 2000,
    error_rate_5min: 0.05,           // 5% 실패 → critical
    consecutive_failures: 3,
  },
  vercel_api: {
    p95_latency_ms: 10000,
    error_rate_5min: 0.2,
  },
  tistory_api: {
    p95_latency_ms: 5000,
    consecutive_failures: 3,         // → 토큰 만료 의심 알림
  },
  blogger_api: {
    p95_latency_ms: 5000,
    consecutive_failures: 3,
  },
  youtube_api: {
    p95_latency_ms: 3000,
    quota_remaining_pct: 0.1,       // 일일 쿼터 10% 미만 → high 알림
  },
}
```

### 3.2 자식 사이트 (L2)

```typescript
const L2_THRESHOLDS = {
  domain_response: {
    timeout_ms: 10000,
    consecutive_failures: 3,         // → 사이트 'critical' 표시
  },
  revalidate_endpoint: {
    timeout_ms: 5000,
    consecutive_failures: 5,
  },
  llms_txt: {
    last_updated_max_age_days: 7,    // 7일 넘게 갱신 안 됐으면 ⚠
  },
  sitemap: {
    expected_url_count_min: 10,      // 10개 미만이면 의심
    actual_vs_expected_diff_pct: 0.2, // 20% 이상 차이 → medium 알림
  },
}
```

### 3.3 파이프라인 (L3)

```typescript
const L3_THRESHOLDS = {
  scout: {
    min_candidates_per_run: 3,       // 3개 미만이면 출처 풀 점검
    consecutive_low_runs: 3,         // 3회 연속 → medium 알림
  },
  evaluate: {
    avg_score_min: 50,               // 평균 점수 50 미만 → 출처 풀 품질 의심
  },
  summarize: {
    failure_rate_24h: 0.1,           // 24시간 실패율 10% 초과 → high
    duplicate_skip_rate_24h: 0.3,    // 30% 이상 중복으로 스킵 → 출처 다양화 필요
  },
  generate: {
    failure_rate_24h: 0.05,          // 5% 초과 → high (3인 체제 문제)
    fake_citation_rate_24h: 0.1,     // 10% 초과 → critical (모델/프롬프트 문제)
    avg_duration_ms: 180000,         // 3분 초과 → medium (Vercel 5분 한계 위험)
  },
  publish: {
    failure_rate_24h: 0.05,
    consecutive_failures: 3,         // → 사이트 자동 일시정지
  },
}
```

### 3.4 데이터 일관성 (L4)

```typescript
const L4_THRESHOLDS = {
  embedding_missing_count: 5,         // 임베딩 누락 5편 이상 → 백필 자동 시작
  broken_internal_links_pct: 0.05,    // 깨진 내부 링크 5% 초과 → medium
  orphan_posts_count: 10,             // 들어오는 링크 0개인 글 10편 → low
  unindexed_posts_count_pct: 0.3,     // 검색엔진 미색인 30% 초과 → high
}
```

### 3.5 비용 (L5)

```typescript
const L5_THRESHOLDS = {
  daily_per_site: {
    warning_pct: 0.7,                 // 일일 한도 70% → low 알림
    critical_pct: 0.95,               // 95% → high 알림 + 자동 정지 준비
    cutoff_pct: 1.0,                  // 100% → 자동 사이트 정지
  },
  daily_global: {
    warning_pct: 0.6,                 // 글로벌 60% → low 알림
    critical_pct: 0.9,                // 90% → high 알림
  },
  monthly_global: {
    warning_pct: 0.7,                 // 월 70% → 운영자 검토 권장
  },
  hourly_anomaly: {
    spike_factor: 5.0,                // 평소 대비 5배 이상 → critical (이상 감지)
  },
}
```

### 3.6 운영자 대기 (L6)

```typescript
const L6_THRESHOLDS = {
  review_queue_size: 5,                // 검수 대기 5편+ → medium
  review_queue_age_hours: 48,          // 48시간 넘은 검수 대기 → high (사이트 정체)
  authority_outline_pending_hours: 72, // 권위 트리 승인 72시간 → medium
  alert_unresolved_critical_hours: 1,  // critical 알림 1시간+ 미처리 → 추가 알림
}
```

---

## 4. 알림 라이프사이클

### 4.1 Alert 객체 (database-schema.md 3.4)

```typescript
interface Alert {
  alertId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'health' | 'publish_failure' | 'review_request' | 
            'budget' | 'security' | 'source_dead' | 'fake_citation' |
            'cost_anomaly' | 'data_integrity'
  
  siteId?: string
  postId?: string
  
  title: string
  message: string
  context: Record<string, any>
  
  status: 'open' | 'acknowledged' | 'resolved' | 'archived'
  
  notificationsSent: {
    slack: boolean
    discord: boolean
    email: boolean
  }
  
  createdAt: Timestamp
  resolvedAt?: Timestamp
  resolvedBy?: string
  resolution?: string
  
  expiresAt?: Timestamp                // TTL 90일
  
  // 중복 방지
  dedupeKey?: string                   // 동일 이슈 30분 내 1회만
  dedupeUntil?: Timestamp
}
```

### 4.2 알림 생성 함수

```typescript
// lib/monitoring/create-alert.ts

export async function createAlert(input: AlertInput): Promise<Alert | null> {
  // 1. dedupe 체크
  if (input.dedupeKey) {
    const existing = await db.collection('alerts')
      .where('dedupeKey', '==', input.dedupeKey)
      .where('dedupeUntil', '>', new Date())
      .limit(1).get()
    
    if (!existing.empty) {
      // 이미 같은 이슈로 알림 보냈음 → 스킵
      return null
    }
  }
  
  // 2. 알림 생성
  const alert: Alert = {
    alertId: generateId(),
    ...input,
    status: 'open',
    notificationsSent: { slack: false, discord: false, email: false },
    createdAt: serverTimestamp(),
    dedupeUntil: input.dedupeKey 
      ? Timestamp.fromDate(addMinutes(new Date(), 30))
      : undefined,
    expiresAt: Timestamp.fromDate(addDays(new Date(), 90)),
  }
  
  await db.collection('alerts').add(alert)
  
  // 3. 즉시 알림 발송 (severity별)
  await dispatchNotifications(alert)
  
  return alert
}
```

### 4.3 라이프사이클

```
[open]
   ↓ 운영자가 어드민에서 [확인]
[acknowledged]
   ↓ 운영자가 [해결됨] 클릭 또는 자동 해결
[resolved]
   ↓ 90일 후
[archived (TTL)]
```

자동 해결 케이스:
- L1 외부 의존 헬스체크: 다음 체크에서 정상 → 자동 resolved
- L5 비용 한도: 다음 날 자정 reset → 자동 resolved

---

## 5. 알림 채널 라우팅

### 5.1 심각도별 채널

| 심각도 | Slack | Discord | Email | 어드민 UI |
|-------|-------|---------|-------|----------|
| critical | ✅ 즉시 | ✅ 즉시 | ✅ 즉시 | ✅ 빨간 배지 |
| high | ✅ 즉시 | ✅ 즉시 | ⚠ 1시간 묶음 | ✅ 노란 배지 |
| medium | ⚠ 1시간 묶음 | ⚠ 1시간 묶음 | ⚠ 일일 리포트 | ✅ 노란 배지 |
| low | ❌ | ❌ | ⚠ 일일 리포트 | ✅ 회색 배지 |

### 5.2 Slack/Discord 발송

```typescript
// lib/monitoring/notifications.ts

export async function sendSlack(alert: Alert): Promise<boolean> {
  const config = await getMetaConfig()
  const webhook = config.notifications.slackWebhookUrl
  if (!webhook) return false
  
  const color = {
    critical: '#dc2626',
    high: '#f59e0b',
    medium: '#fbbf24',
    low: '#9ca3af',
  }[alert.severity]
  
  const payload = {
    attachments: [{
      color,
      title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      text: alert.message,
      fields: [
        ...(alert.siteId ? [{ title: 'Site', value: alert.siteId, short: true }] : []),
        { title: 'Category', value: alert.category, short: true },
        { title: 'Time', value: formatTime(alert.createdAt), short: true },
      ],
      actions: [{
        type: 'button',
        text: '어드민에서 보기',
        url: `https://meta.example.com/alerts/${alert.alertId}`,
      }],
    }],
  }
  
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendDiscord(alert: Alert): Promise<boolean> {
  // 동일 패턴, embed 형식
  // ...
}
```

### 5.3 Email 발송 (Resend)

```typescript
export async function sendEmail(alert: Alert): Promise<boolean> {
  const config = await getMetaConfig()
  if (!config.notifications.emailFrom || !config.notifications.emailTo?.length) {
    return false
  }
  
  const subject = `[${alert.severity}] ${alert.title}`
  const html = renderAlertEmail(alert)
  
  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: config.notifications.emailFrom,
    to: config.notifications.emailTo,
    subject,
    html,
  })
  
  return !!result.id
}
```

### 5.4 묶음 발송 (1시간 / 일일)

low / medium 알림은 즉시 발송 X. 1시간 또는 일일 리포트로 묶음.

```typescript
// app/api/cron/hourly-digest/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  // 지난 1시간 medium 알림 조회
  const since = subtract(now, hours(1))
  const medium = await db.collection('alerts')
    .where('severity', '==', 'medium')
    .where('createdAt', '>=', since)
    .where('notificationsSent.slack', '==', false)
    .get()
  
  if (medium.empty) return NextResponse.json({ skipped: true })
  
  // 카테고리별 그룹핑
  const grouped = groupBy(medium.docs, (d) => d.data().category)
  
  // 묶음 메시지 생성
  const summary = Object.entries(grouped).map(([cat, alerts]) => 
    `**${cat}** (${alerts.length}건)\n${alerts.slice(0, 3).map(a => `- ${a.data().title}`).join('\n')}`
  ).join('\n\n')
  
  await sendSlack({
    severity: 'medium',
    title: `지난 1시간 알림 ${medium.size}건`,
    message: summary,
    // ...
  } as any)
  
  // 발송 표시
  for (const doc of medium.docs) {
    await doc.ref.update({ 'notificationsSent.slack': true })
  }
  
  return NextResponse.json({ sent: medium.size })
}
```

---

## 6. 자동 복구 액션

> **"사람이 개입하기 전에 시스템이 먼저 시도한다."**

### 6.1 액션 카탈로그

```typescript
// lib/monitoring/recovery-actions.ts

export const RECOVERY_ACTIONS = {
  // 외부 의존
  ai_api_failure: async (context) => {
    // 폴백 모델로 전환
    return await switchToFallbackModel(context.role, context.failedModel)
  },
  
  source_consecutive_failures: async (context) => {
    // 출처 자동 비활성화 (5회 연속 실패)
    if (context.failures >= 5) {
      await updateSource(context.siteId, context.sourceId, { status: 'dead' })
      return { action: 'source_disabled', sourceId: context.sourceId }
    }
    if (context.failures >= 3) {
      await updateSource(context.siteId, context.sourceId, { status: 'failing' })
      return { action: 'source_marked_failing', sourceId: context.sourceId }
    }
    return null
  },
  
  // 자식 사이트
  publish_consecutive_failures: async (context) => {
    if (context.failures >= 3) {
      // 자동 일시정지
      await pauseSite(context.siteId, 'consecutive_publish_failures')
      return { action: 'site_paused', reason: '연속 발행 실패 3회' }
    }
    return null
  },
  
  // 비용
  daily_budget_exceeded: async (context) => {
    // 사이트 자동 정지 (자정에 자동 재개)
    await pauseSite(context.siteId, 'budget_exceeded')
    await scheduleAutoResume(context.siteId, getNextMidnight())
    return { action: 'site_paused_until_midnight' }
  },
  
  cost_anomaly_spike: async (context) => {
    // 5배 이상 급증 → 즉시 정지 (이상 감지)
    await pauseSite(context.siteId, 'cost_anomaly')
    return { action: 'site_paused_emergency' }
  },
  
  // 데이터 일관성
  embedding_missing: async (context) => {
    // 백필 자동 시작
    await scheduleEmbeddingBackfill(context.siteId, context.missingPostIds)
    return { action: 'embedding_backfill_scheduled' }
  },
  
  broken_internal_links: async (context) => {
    // 자동 보수 시도 (internal-linking.md 7.3)
    const fixed = await autoFixBrokenLinks(context.siteId, context.brokenLinks)
    return { action: 'links_auto_fixed', count: fixed.length }
  },
  
  // 검수 큐
  review_queue_overflow: async (context) => {
    // 자동 발행 임시 비활성화 (검수 큐 줄일 때까지)
    await disableAutoPublish(context.siteId, 'review_queue_overflow')
    return { action: 'auto_publish_disabled' }
  },
}
```

### 6.2 자동 복구 흐름

```typescript
async function detectAndRecover(checkResult: HealthCheckResult) {
  const issues = checkResult.issues
  
  for (const issue of issues) {
    const recoveryAction = RECOVERY_ACTIONS[issue.type]
    if (!recoveryAction) {
      // 자동 복구 불가 → 즉시 알림
      await createAlert({
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        message: issue.message,
        context: issue.context,
      })
      continue
    }
    
    // 자동 복구 시도
    try {
      const result = await recoveryAction(issue.context)
      
      if (result) {
        // 복구 성공 → low 알림 (사후 인지)
        await createAlert({
          severity: 'low',
          category: 'health',
          title: `자동 복구: ${issue.title}`,
          message: `시스템이 자동으로 처리했습니다: ${result.action}`,
          context: { ...issue.context, recovery: result },
          status: 'resolved',
          resolvedBy: 'system',
        })
      } else {
        // 복구 시도 안 함 → 원래 심각도로 알림
        await createAlert({ /* ... */ })
      }
    } catch (recoveryErr) {
      // 복구 자체 실패 → critical 알림
      await createAlert({
        severity: 'critical',
        category: 'health',
        title: `자동 복구 실패: ${issue.title}`,
        message: `자동 복구 시도 중 에러: ${recoveryErr.message}`,
        context: { issue, error: recoveryErr },
      })
    }
  }
}
```

### 6.3 사이트 자동 일시정지

여러 자동 복구 액션이 사용. 안전망 메커니즘:

```typescript
async function pauseSite(siteId: string, reason: string) {
  await db.collection('child_sites').doc(siteId).update({
    status: 'paused',
    'healthStatus.overall': 'critical',
    'healthStatus.lastHealthCheck': serverTimestamp(),
    'healthStatus.issues': [reason],
  })
  
  // 1. 모든 cron 일시정지 (Vercel API)
  await vercel.crons.disable(siteId)
  
  // 2. 진행 중인 파이프라인 중단
  await stopActivePipelines(siteId)
  
  // 3. 운영자 알림
  await createAlert({
    severity: 'high',
    category: 'health',
    siteId,
    title: `사이트 자동 일시정지: ${siteId}`,
    message: `사유: ${reason}`,
  })
  
  // 4. 감사 로그
  await db.collection('audit_logs').add({
    actorEmail: 'system',
    action: 'site_paused_auto',
    targetType: 'site',
    targetId: siteId,
    after: { reason },
    createdAt: serverTimestamp(),
  })
}
```

자동 정지 사유:
- 연속 발행 실패 3회
- 일일 비용 한도 초과
- 비용 이상 급증 (5배+)
- 검수 큐 24편+ (한 사이트가 운영자 시간 독점)

운영자가 어드민에서 [재개] 또는 자동 재개 (예: 비용 정지는 자정 재개).

---

## 7. 비용 모니터링 + 자동 한도

### 7.1 실시간 비용 추적

`magazine_logs.tokenUsage`에서 지속 누적. 5분 Cron이 합산:

```typescript
// app/api/cron/budget-check/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const sites = await getActiveChildSites()
  const config = await getMetaConfig()
  
  for (const site of sites) {
    const todayCost = await calculateTodayCost(site.siteId)
    const dailyLimit = config.perSiteDailyBudgetUSD
    const pct = todayCost / dailyLimit
    
    // 캐시 갱신
    await db.collection('child_sites').doc(site.siteId).update({
      'stats.todayCostUSD': todayCost,
    })
    
    // 임계값 체크
    if (pct >= 1.0) {
      // 한도 초과 → 즉시 정지
      if (site.status === 'active') {
        await pauseSite(site.siteId, 'daily_budget_exceeded')
      }
    } else if (pct >= 0.95) {
      await createAlert({
        severity: 'high',
        category: 'budget',
        siteId: site.siteId,
        title: `일일 예산 95% 도달: ${site.siteId}`,
        message: `오늘 $${todayCost.toFixed(2)} / $${dailyLimit} (${(pct * 100).toFixed(0)}%)`,
        dedupeKey: `budget-95-${site.siteId}-${formatDate(new Date())}`,
      })
    } else if (pct >= 0.7) {
      await createAlert({
        severity: 'low',
        category: 'budget',
        siteId: site.siteId,
        title: `일일 예산 70% 도달: ${site.siteId}`,
        message: `오늘 $${todayCost.toFixed(2)} / $${dailyLimit}`,
        dedupeKey: `budget-70-${site.siteId}-${formatDate(new Date())}`,
      })
    }
  }
  
  // 글로벌 한도 체크
  const todayGlobal = sites.reduce((sum, s) => sum + s.stats.todayCostUSD, 0)
  if (todayGlobal >= config.dailyAiBudgetUSD * 0.9) {
    await createAlert({
      severity: 'high',
      category: 'budget',
      title: '글로벌 일일 예산 90%',
      message: `오늘 $${todayGlobal} / $${config.dailyAiBudgetUSD}`,
      dedupeKey: `global-budget-90-${formatDate(new Date())}`,
    })
  }
  
  return NextResponse.json({ ok: true })
}
```

### 7.2 비용 이상 감지

평소보다 5배 이상 급증 시 즉시 정지:

```typescript
async function detectCostAnomaly(siteId: string): Promise<boolean> {
  // 지난 7일 시간당 평균
  const last7DaysAvg = await getLast7DaysHourlyAvgCost(siteId)
  
  // 이번 시간 비용
  const thisHour = await getThisHourCost(siteId)
  
  if (thisHour > last7DaysAvg * 5) {
    // 5배 이상 → 이상 감지
    await pauseSite(siteId, 'cost_anomaly')
    
    await createAlert({
      severity: 'critical',
      category: 'cost_anomaly',
      siteId,
      title: `비용 이상 급증: ${siteId}`,
      message: `시간당 평균 $${last7DaysAvg.toFixed(2)} → $${thisHour.toFixed(2)} (${(thisHour / last7DaysAvg).toFixed(1)}x)`,
    })
    
    return true
  }
  
  return false
}
```

### 7.3 자정 자동 재개

비용 정지된 사이트는 자정 재개:

```typescript
// app/api/cron/daily-reset/route.ts (매일 자정 KST)

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  // 비용 한도로 정지된 사이트들 재개
  const pausedSites = await db.collection('child_sites')
    .where('status', '==', 'paused')
    .where('healthStatus.issues', 'array-contains-any', 
      ['daily_budget_exceeded', 'cost_anomaly'])
    .get()
  
  for (const doc of pausedSites.docs) {
    const site = doc.data() as ChildSite
    
    // cost_anomaly는 운영자 검토 필요 (자동 재개 X)
    if (site.healthStatus.issues.includes('cost_anomaly')) continue
    
    // budget_exceeded만 자동 재개
    await resumeSite(site.siteId, 'auto_resume_after_midnight')
  }
  
  return NextResponse.json({ resumed: pausedSites.size })
}
```

---

## 8. 일일 리포트

매일 KST 09:00 자동 발송. 운영자가 아침에 보는 첫 화면:

### 8.1 리포트 구조

```
[일일 리포트] 2026-05-06 (월)

📊 어제 요약
사이트 6개 활성 / 18편 발행 / 비용 $4.20 / 알림 3건

🟢 사이트 상태
ai-kr        ✅ 정상  발행 3편  비용 $0.94  트래픽 1.2k
travel-kr    ✅ 정상  발행 3편  비용 $0.78  트래픽 890
travel-en    🟡 주의  발행 2편  비용 $0.62  트래픽 340
              └ 출처 1개 다운: TheAIShow 3일 연속
insurance-kr ⏸ 정지   비용 $0    트래픽 0
              └ 운영자 일시정지 (1주일 전)
ai-en-tist   ✅ 정상  발행 3편  비용 $1.20  트래픽 670
ai-en-blog   ✅ 정상  발행 3편  비용 $0.66  트래픽 480

⚠️ 미처리 알림 (3건)
- [high] travel-kr: 가짜 출처 의심 — 'AI 트렌드 5가지' 검수 요청
- [medium] ai-kr: 권위 트리 진행 30% 지연
- [medium] ai-en-blog: AdSense 정책 위반 의심 — 'X 마약' 글

📝 검수 대기 (5편)
- ai-kr: 'AI 코딩 도구 비교' (3시간 전)
- travel-en: 'Best Coffee Shops in Seoul' (어제)
- ...

💰 7일 비용 vs 수익
비용 $32.40 / 수익 $46.20 / 순이익 $13.80 (ROI 43%)

📈 검색 성과 (7일)
GSC 클릭 +18% / 노출 +24% / 신규 색인 142편

🎯 오늘 할 일
1. ai-kr 글 검수 1편
2. travel-kr 가짜 출처 의심 글 처리
3. travel-en 출처 풀 점검 (TheAIShow 다운)
```

### 8.2 생성 함수

```typescript
// app/api/cron/daily-report/route.ts (매일 09:00 KST)

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  const yesterday = subtract(now, days(1))
  
  // 데이터 수집
  const sites = await getActiveChildSites()
  const sitesData = await Promise.all(sites.map(async (s) => ({
    site: s,
    yesterdayPosts: await countPostsPublished(s.siteId, yesterday),
    yesterdayCost: await getCostForDay(s.siteId, yesterday),
    yesterdayTraffic: await getTrafficForDay(s.siteId, yesterday),
    issues: s.healthStatus.issues,
  })))
  
  const unresolvedAlerts = await db.collection('alerts')
    .where('status', 'in', ['open', 'acknowledged'])
    .orderBy('severity', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
  
  const reviewQueue = await getReviewQueueAcrossAllSites()
  
  const weekRoi = await calculateWeekRoi()
  
  const gscWeek = await getWeekGscSummary()
  
  // AI에게 인사이트 + 오늘 할 일 생성 의뢰
  const insights = await aiService.call({
    role: 'analytics_aggregator',
    model: 'claude-sonnet-4-6',
    prompt: `다음 데이터를 보고 운영자에게 오늘 할 일 3~5개를 우선순위로 제시:
${JSON.stringify({ sitesData, unresolvedAlerts, reviewQueue, weekRoi, gscWeek })}`,
  })
  
  // 마크다운 + HTML 렌더링
  const reportMarkdown = renderDailyReport({
    sitesData, unresolvedAlerts, reviewQueue, weekRoi, gscWeek, insights,
  })
  
  // Email 발송
  await sendEmail({
    severity: 'low',
    title: '[일일 리포트] ' + formatDate(now, 'yyyy-MM-dd (E)'),
    message: reportMarkdown,
  } as any)
  
  // Slack 발송 (요약본)
  await sendSlack({
    severity: 'low',
    title: '일일 리포트',
    message: extractSlackSummary(reportMarkdown),
  } as any)
  
  return NextResponse.json({ ok: true })
}
```

---

## 9. 주간 리포트

매주 일요일 21:00 KST 자동 발송. 더 깊은 분석.

### 9.1 추가 항목

일일 리포트의 모든 + 다음:

- 7일 트래픽 차트 (사이트별)
- Top 10 글 (조회수)
- Top 10 검색어 (GSC)
- 권위 트리 진행 상황
- 출처 풀 헬스 종합
- 페르소나 사용 분포
- 비용 추이 차트 (4주)
- AI 인사이트 (이번 주 패턴 분석)

### 9.2 AI 기반 인사이트

```typescript
const insights = await aiService.call({
  role: 'analytics_aggregator',
  prompt: `다음 데이터를 보고 운영자에게 가치 있는 인사이트 5가지 제시:

1. 어떤 콘텐츠가 잘 됐는지 (조회/체류 기준)
2. 어떤 출처가 고품질 (높은 점수 → 발행 → 트래픽 연결)
3. 어떤 페르소나가 좋은 댓글 생성 (좋아요 받은 댓글 비율)
4. 비용 효율 (사이트별 ROI)
5. 다음 주 권장 액션

데이터:
${JSON.stringify({ /* 모든 메트릭 */ })}
`,
})
```

---

## 10. 어드민 UI 통합 (meta-control-spec.md)

### 10.1 알림 표시

`/alerts` 페이지 (meta-control-spec.md [17]):
- 미처리 critical/high 우선
- 카테고리/사이트 필터
- 일괄 [확인] 액션

### 10.2 헬스 상태 인디케이터

`/sites` 리스트의 상태 컬럼 (meta-control-spec.md [2]):
```
🟢  healthy  / 🟡 warning / 🔴 critical / ⏸ paused / 📦 archived
```

### 10.3 헬스체크 히스토리

`/sites/{id}` 사이트 개요에 7일 헬스 sparkline:
```
헬스 7일: 🟢🟢🟡🟢🟢🟢🟢
```

### 10.4 비용 대시보드

`/costs` (meta-control-spec.md [18]):
- 일일/월간 비용
- 사이트별/모델별 분포
- 한도 진행률 바

---

## 11. 외부 의존 폴백 체인 통합

ai-roles-and-prompts.md 12장 모델 폴백 + 다음 외부 의존:

### 11.1 검색 API 폴백

```typescript
const SEARCH_API_CHAIN = ['tavily', 'perplexity', 'serpapi']

async function searchWithFallback(query: string): Promise<SearchResult[]> {
  for (const provider of SEARCH_API_CHAIN) {
    try {
      return await callSearchApi(provider, query)
    } catch (err) {
      if (isRateLimitOrQuota(err)) continue
      throw err
    }
  }
  throw new Error('All search APIs failed')
}
```

### 11.2 임베딩 모델 폴백

```typescript
const EMBEDDING_CHAIN = [
  'text-embedding-3-large',          // OpenAI
  'voyage-3',                         // Voyage
  'embed-english-v3',                 // Cohere
]
```

### 11.3 호스팅 어댑터 폴백 (없음)

호스팅별로는 폴백 없음. Tistory 다운이면 Tistory만 영향. 다른 사이트는 정상 (격리 원칙).

---

## 12. 테스트와 시뮬레이션

### 12.1 알림 테스트 모드

운영자가 어드민에서 [테스트 알림 발송]:

```typescript
async function sendTestAlert(severity: AlertSeverity, channels: string[]) {
  await dispatchNotifications({
    severity,
    title: `[TEST] ${severity} 알림 테스트`,
    message: '이 알림이 정상적으로 도착하면 채널 설정이 올바릅니다.',
    category: 'health',
  } as any, { onlyChannels: channels })
}
```

### 12.2 카오스 테스트 (선택)

운영 환경에서 의도적으로 외부 의존 1개를 강제 실패시켜 시스템이 자동 복구하는지 검증.

```typescript
// 어드민에서만 가능한 위험한 액션
async function chaosTest(target: 'ai_api' | 'firebase' | 'tistory_api') {
  await db.collection('chaos_tests').add({
    target,
    startedAt: serverTimestamp(),
    duration: 5 * 60 * 1000,           // 5분
  })
}
```

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 4단계 심각도 (critical / high / medium / low)
- ✅ 6레벨 헬스체크 (외부의존 / 사이트 / 파이프라인 / 데이터 / 비용 / 운영자대기)
- ✅ 임계값 정의 (각 항목별 자동 액션 트리거)
- ✅ Alert 라이프사이클 (open → acknowledged → resolved → archived)
- ✅ Dedupe 메커니즘 (30분 내 같은 이슈 1회만)
- ✅ 채널 라우팅 (Slack/Discord/Email + 어드민 UI)
- ✅ 묶음 발송 (1시간 / 일일)
- ✅ 자동 복구 액션 (10종)
- ✅ 사이트 자동 일시정지 + 자정 자동 재개
- ✅ 비용 이상 감지 (5배 급증 → 즉시 정지)
- ✅ 일일 리포트 + 주간 리포트 (AI 인사이트)
- ✅ 모델/API 폴백 체인
- ✅ 테스트 알림 + 카오스 테스트

이 문서가 정의하지 않은 것:
- ❌ 임베딩 기반 중복 검사 임계값 결정 → `duplicate-prevention.md`
- ❌ 시맨틱 검색 + 뉴스레터 발송 → `search-and-email.md`
- ❌ GSC + GA4 통합 메트릭 → `analytics-integration.md`
- ❌ 자식 사이트 배포 자체 → `deployment-guide.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 기존 문서의 알림/실패 처리 통합. |

---

*이 문서는 메타사이트의 모니터링 단일 출처다. 운영자 1인이 N개 사이트를 안전하게 운영하기 위한 모든 자동 헬스체크/알림/복구의 결정을 담고 있다.*

*다음 문서: `duplicate-prevention.md` (Tier E 2번)*
