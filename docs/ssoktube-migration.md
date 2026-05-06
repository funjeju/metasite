# META-SITE: 쏙튜브 마이그레이션 (ssoktube-migration.md)

> 사용자가 1년+ 운영 중인 SSOKTUBE 매거진을 메타사이트의 자식 사이트로 zero-downtime 마이그레이션하는 단계별 플랜.
> 4~6주 dual-write 흐름 + 검증 + 롤백 가능성 + SSOKTUBE 단독 회귀 옵션.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ testing-checklist.md          (검증)
  └─ ssoktube-migration.md         ★ 이 문서 — 마지막
                                   "쏙튜브 → 메타사이트 자식"
```

이 문서는:
- SSOKTUBE 시스템 현황 인벤토리
- 메타사이트로의 코드/데이터 매핑
- 4~6주 단계별 dual-write 마이그레이션
- 각 단계의 검증 + 롤백 가능성
- 마이그레이션 후 SSOKTUBE 단독 작동 옵션 보존

---

## 1. 핵심 원칙

### 1.1 Zero-Downtime

> **"마이그레이션 동안에도 쏙튜브는 평소처럼 발행된다."**

운영 중인 사이트의 마이그레이션은 위험. 다음 원칙으로 위험 최소화:

- **dual-write**: 양쪽 시스템 모두 데이터 쓰기 (몇 주간)
- **단방향 read 먼저**: 메타가 쏙튜브 데이터 읽기만 → 검증 → 쓰기 추가
- **점진 전환**: cron / 발행 / 어드민 순서로 분리 마이그레이션
- **언제든 롤백**: 단계별로 SSOKTUBE 원래 시스템 단독 작동 보장

### 1.2 검증 우선

> **"속도보다 안전. 한 단계씩 검증 후 다음."**

각 단계 후 1~3일 검증 기간:
- 데이터 정합성
- 발행 흐름 정상
- 비용 계측 정상
- 알림 작동

문제 발견 시 그 단계만 롤백 가능.

### 1.3 마이그레이션 후 옵션 보존

> **"메타 자식이 됐어도 쏙튜브 단독으로 분리 가능해야."**

마이그레이션 끝나도 SSOKTUBE 원본 코드는 보존. 만약 메타가 망하거나 운영자가 분리하고 싶을 때 SSOKTUBE 단독으로 돌아갈 수 있어야.

---

## 2. SSOKTUBE 시스템 인벤토리

### 2.1 현재 시스템 구조 (가정)

magazine.md(uploaded by user)에 기반. 운영자 검증 필요.

```
ssoktube/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   ├── scout-evaluate/route.ts        Scout + Evaluate 통합
│   │   │   ├── auto-summarize/route.ts        Summarize
│   │   │   └── curate-magazine/route.ts        Generate + Publish
│   │   └── ...
│   ├── (admin)/
│   │   └── ...                                 어드민 페이지
│   └── ...
├── lib/
│   ├── youtube.ts                              YouTube fetch
│   ├── tistory.ts                              Tistory 발행
│   ├── blogger.ts                              Blogger 발행
│   ├── magazineHtml.ts                         HTML 빌드
│   ├── scout.ts
│   ├── evaluate.ts
│   ├── summarize.ts
│   ├── generate.ts
│   └── ai-models.ts
├── vercel.json                                 정적 Cron 등록
└── ...
```

### 2.2 Firestore 컬렉션

```
saved_summaries           심층 요약 (글로벌)
curated_posts             발행된 글 (글로벌)
magazine_logs             실행 로그
ai_scout_queue            후보 큐
ai_evaluate_queue         평가 큐
settings/curation         정책 단일 문서
yt_comments_cache         YouTube 댓글 캐시
```

### 2.3 외부 의존

```
Anthropic API
OpenAI API (Verifier 또는 임베딩)
Google AI API (Gemini)
YouTube Data API
Tistory API
Blogger API (Service Account)
Firebase / Firestore
Vercel (호스팅 + Cron)
```

### 2.4 운영 메트릭 (예시)

```
일일 발행: 3편 (오전/오후/저녁)
누적 글: ~500편 (1년+)
구독자: 1,200명 (뉴스레터)
월 비용: $50~80
호스팅 옵션: Tistory + Blogger 동시 발행
```

이 메트릭은 **마이그레이션 검증의 베이스라인**. 마이그레이션 후 동일하게 유지돼야 성공.

---

## 3. 메타사이트로의 매핑

### 3.1 자식 사이트 정체성 결정

마이그레이션 시 SSOKTUBE는 메타사이트의 **자식 사이트 1개 또는 2개**가 됨.

```
옵션 A: 단일 자식 사이트 'ssoktube'
   → Tistory + Blogger 양쪽 발행 통합
   → 한국어 + 영어 한 사이트에 (구분 X)

옵션 B: 두 개 자식 사이트
   → ssoktube-tist (Tistory 호스팅)
   → ssoktube-blog (Blogger 호스팅)
   → 명확한 분리

✅ 권장: 옵션 B
```

이유:
- 능력 매트릭스(publisher-adapters.md 7장)가 호스팅별 다름
- Tistory와 Blogger는 다른 시장 (한국 vs 영어권 추정)
- 각 사이트별 독립 운영 + 분석 + 알림

### 3.2 코드 매핑

content-pipeline.md 11장에서 이미 정의. 정리:

| SSOKTUBE 파일 | 메타 위치 | 변경 |
|---------------|----------|------|
| `lib/youtube.ts` | `lib/sources/youtube.ts` | 거의 그대로 |
| `lib/scout.ts` | `lib/pipeline/scout.ts` | siteId/sectionId 추가 |
| `lib/evaluate.ts` | `lib/pipeline/evaluate.ts` | 다중 모델 평가로 확장 |
| `lib/summarize.ts` | `lib/pipeline/summarize.ts` | + 임베딩 |
| `lib/generate.ts` | `lib/pipeline/generate.ts` | + 3인 체제 |
| `lib/tistory.ts` | `lib/publishers/tistory-publisher.ts` | 어댑터 클래스 |
| `lib/blogger.ts` | `lib/publishers/blogger-publisher.ts` | 어댑터 클래스 |
| `lib/magazineHtml.ts` | `lib/publishers/magazine-html.ts` | + target 옵션 |

### 3.3 데이터 매핑

```
SSOKTUBE                          메타사이트
─────────────────────────────────────────────
saved_summaries (글로벌)     →    sites/{siteId}/saved_summaries
curated_posts (글로벌)       →    sites/{siteId}/curated_posts
magazine_logs                →    sites/{siteId}/magazine_logs
ai_scout_queue               →    sites/{siteId}/ai_scout_queue
ai_evaluate_queue            →    sites/{siteId}/ai_evaluate_queue
settings/curation            →    sites/{siteId}/settings/curation
yt_comments_cache            →    yt_comments_cache (글로벌 유지)
```

```
+ 메타사이트 신규 컬렉션
sites/{siteId}/personas
sites/{siteId}/sources
sites/{siteId}/authority_outline (Phase 1 안 함, 비어있음)
sites/{siteId}/comments (자식 사이트 댓글)
sites/{siteId}/search_index
sites/{siteId}/newsletter_subscribers
sites/{siteId}/analytics_snapshots
```

### 3.4 발행 흐름 매핑

```
SSOKTUBE 단방향:
   Cron → 4단계 → Tistory + Blogger 발행

메타사이트 (이중):
   Cron → 메타 4단계 → publisher 어댑터 → Tistory + Blogger 발행
   (단 결과는 sites/{siteId}/curated_posts에 저장)
```

흐름 자체는 동일. 다만 데이터 위치 + 어댑터 추상화 + 검증 단계 추가.

---

## 4. 마이그레이션 단계 개관

```
[Week 0] 준비
   - 메타사이트 배포 검증 완료 (deployment-guide.md Phase 1)
   - SSOKTUBE 풀 백업
   - 마이그레이션 결정 회의

[Week 1] 자식 사이트 등록 + 데이터 import (read-only)
   - sites/ssoktube-tist, sites/ssoktube-blog 생성
   - 기존 데이터 import → 새 컬렉션 경로
   - 메타사이트는 데이터 읽기만 (발행 X)

[Week 2] dual-write 시작
   - SSOKTUBE가 평소대로 발행
   - 메타도 동시에 데이터 받아서 처리 (그러나 발행 X)
   - 양쪽 데이터 정합성 검증

[Week 3] 메타 발행 시작 (테스트 사이트만)
   - ssoktube-tist만 메타 발행
   - ssoktube-blog는 SSOKTUBE 단독 (비교 그룹)
   - 1주일 안정성 검증

[Week 4] 양쪽 메타 발행
   - ssoktube-blog도 메타 발행으로 전환
   - SSOKTUBE 발행 중단 (그러나 코드는 보존)
   - 1주일 검증

[Week 5] SSOKTUBE Cron 비활성화
   - SSOKTUBE의 Vercel Cron 끄기
   - 메타가 단독 발행
   - 1주일 검증

[Week 6] 마이그레이션 완료
   - SSOKTUBE 어드민 페이지 read-only로
   - 메타 어드민이 단독 운영
   - SSOKTUBE 코드는 archived (단독 회귀 옵션 보존)
```

각 주 끝에 운영자 검증 + 결정.

---

## 5. Week 0: 준비

### 5.1 사전 조건

```
□ 메타사이트 deployment-guide.md Phase 1 완료
□ 메타사이트 24시간 이상 정상 작동
□ 모든 자동 검증 통과 (testing-checklist.md 2.6)
□ Slack/Discord 알림 채널 작동
□ 운영자가 일일 30분 시간 확보 (마이그레이션 모니터링)
```

### 5.2 SSOKTUBE 풀 백업

```bash
# 1. Firestore 전체 export
gcloud firestore export gs://ssoktube-backup-pre-migration \
  --project=ssoktube-prod

# 2. GitHub repo 백업 (clone 후 다른 곳에 보관)
git clone --mirror https://github.com/{org}/ssoktube ssoktube-backup-pre-migration

# 3. 환경변수 backup (수동)
vercel env ls production > ssoktube-env-backup.txt
# 실제 값은 별도 안전 보관

# 4. 발행 글 URL 리스트 backup
# (Tistory/Blogger 글 다 사라지면 안 되니, URL이라도)
node scripts/export-published-urls.ts > published-urls-backup.json
```

### 5.3 결정 회의 (운영자 자신과)

```
□ 자식 사이트 옵션 결정 (A 단일 / B 분리)
□ ssoktube-tist의 토픽 / 페르소나 정의
□ ssoktube-blog의 토픽 / 페르소나 정의
□ 마이그레이션 시작 일자 (목요일 권장 — 주말 전 검증 시간)
□ 비상 시 롤백 결정권 (전체 / 부분)
□ 예상 비용 변화 (월 $50 → $70~)
```

### 5.4 운영자 메모

```
SSOKTUBE는 1년+ 운영된 검증된 시스템.
마이그레이션 = 잠재적 위험.
"왜 마이그레이션하는가"를 명확히:

✅ 메타사이트의 권위 트리 시스템으로 SEO 강화
✅ AI 3인 체제 + 가짜 출처 차단으로 신뢰성 향상
✅ 통합 어드민으로 운영 부담 감소
✅ 다른 자식 사이트와 인사이트 공유

❌ 단순 호기심으로 마이그레이션 X
❌ 안정 운영 중인 시스템 무리하게 손대지 않기
```

이게 정당화되면 진행.

---

## 6. Week 1: 자식 사이트 등록 + 데이터 Import

### 6.1 자식 사이트 메타데이터 등록

site-creation-flow.md의 6단계 마법사를 **마이그레이션 모드**로 실행.

```typescript
// site-creation-flow.md 9.1의 createSite() 확장
async function createSiteForMigration(input: MigrationInput): Promise<ChildSite> {
  // 일반 createSite 호출
  const site = await createSite({
    ...input,
    startPhase: 'ongoing',                // Phase 1 스킵 (이미 글 있음)
    skipAuthorityOutline: true,
    skipDefaultStaticPages: true,         // SSOKTUBE에 이미 about 등 있음
  })
  
  // 마이그레이션 마커
  await db.collection('child_sites').doc(site.siteId).update({
    'metadata.isMigrated': true,
    'metadata.migrationSource': 'ssoktube',
    'metadata.migrationStartedAt': serverTimestamp(),
  })
  
  return site
}
```

운영자가 직접 또는 마법사로:

```
사이트 1: ssoktube-tist
  hostingType: tistory
  domain: ssoktube.tistory.com
  language: ko
  topic: ai
  startPhase: ongoing (Phase 1 스킵)
  
사이트 2: ssoktube-blog
  hostingType: blogger
  blogId: <Blogger Blog ID>
  language: en
  topic: ai
  startPhase: ongoing
```

### 6.2 데이터 Import 스크립트

SSOKTUBE의 컬렉션을 자식 사이트별로 분리하면서 import:

```typescript
// scripts/migrate-from-ssoktube.ts

import { exec } from 'child_process'
import { db as ssoktubeDb } from './ssoktube-firebase'
import { db as metaDb } from './meta-firebase'

async function migrateCollection(collectionName: string) {
  const snapshot = await ssoktubeDb.collection(collectionName).get()
  
  console.log(`Migrating ${snapshot.size} docs from ${collectionName}`)
  
  for (const doc of snapshot.docs) {
    const data = doc.data()
    
    // 1. 사이트 결정 (어느 자식 사이트로)
    const targetSiteId = decideSiteId(data)
    
    if (!targetSiteId) {
      console.warn(`Cannot determine site for doc ${doc.id}, skipping`)
      continue
    }
    
    // 2. 데이터 변환
    const transformed = transformForMeta(data, targetSiteId, collectionName)
    
    // 3. 새 컬렉션 경로에 쓰기
    const newPath = `sites/${targetSiteId}/${collectionName}/${doc.id}`
    await metaDb.doc(newPath).set(transformed)
  }
}

function decideSiteId(doc: any): string | null {
  // curated_posts의 경우: published_to에서 결정
  if (doc.tistoryUrl || doc.publishedTo?.tistory) return 'ssoktube-tist'
  if (doc.bloggerUrl || doc.publishedTo?.blogger) return 'ssoktube-blog'
  
  // saved_summaries의 경우: 언어로 결정 (한국어 → tist, 영어 → blog)
  if (doc.language === 'ko' || /[ㄱ-ㅎ가-힣]/.test(doc.title || '')) {
    return 'ssoktube-tist'
  }
  if (doc.language === 'en') {
    return 'ssoktube-blog'
  }
  
  // 둘 다 발행됐으면 → 양쪽 모두에 복사 (옵션)
  // 또는 운영자 결정
  
  return null
}

function transformForMeta(data: any, siteId: string, collection: string): any {
  // 공통 필드 추가
  const transformed = {
    ...data,
    // siteId는 path에 이미 포함 (저장 안 해도 됨)
  }
  
  // 컬렉션별 변환
  switch (collection) {
    case 'curated_posts':
      // 메타사이트 schema에 맞게 변환
      transformed.phase = 'ongoing'                  // Phase 1 X
      transformed.sectionId = data.sectionId || 'news'
      transformed.aiPipeline = {
        writerModel: data.model || 'claude-3.5-sonnet',
        writerOutput: data.body,                      // 원본 본문 = 작가 출력
        verifierReport: null,                         // 마이그레이션 데이터는 검증 안 함
        editorChanges: [],
      }
      transformed.citationsVerified = false           // 마이그레이션 데이터
      transformed.embedding = null                    // 백필 필요
      break
    
    case 'saved_summaries':
      transformed.embedding = null
      break
    
    case 'magazine_logs':
      // 60일 이상 된 로그는 안 옮김 (TTL)
      const age = (Date.now() - data.createdAt.toMillis()) / (1000 * 60 * 60 * 24)
      if (age > 60) return null                       // 스킵
      break
  }
  
  return transformed
}

// 실행
async function main() {
  await migrateCollection('saved_summaries')
  await migrateCollection('curated_posts')
  await migrateCollection('ai_scout_queue')
  await migrateCollection('ai_evaluate_queue')
  // magazine_logs는 60일 이내만
  await migrateCollection('magazine_logs')
  
  // settings/curation은 사이트별로 복사
  const settings = await ssoktubeDb.doc('settings/curation').get()
  for (const siteId of ['ssoktube-tist', 'ssoktube-blog']) {
    await metaDb.doc(`sites/${siteId}/settings/curation`).set(settings.data())
  }
  
  console.log('Migration complete!')
}

main().catch(console.error)
```

### 6.3 임베딩 백필

이전 글들은 임베딩 없음. duplicate-prevention.md 8장 백필 시작:

```typescript
// scripts/embedding-backfill-migrated.ts

async function backfillEmbeddings(siteId: string) {
  let processed = 0
  
  while (true) {
    const batch = await metaDb
      .collection('sites').doc(siteId).collection('curated_posts')
      .where('embedding', '==', null)
      .limit(20)
      .get()
    
    if (batch.empty) break
    
    for (const doc of batch.docs) {
      const data = doc.data() as CuratedPost
      try {
        const embedding = await aiService.embed(data.body)
        await doc.ref.update({
          embedding,
          embeddingModel: 'text-embedding-3-large',
        })
        processed++
      } catch (err) {
        console.error(`Failed for ${doc.id}:`, err)
      }
    }
    
    console.log(`Processed ${processed} so far`)
    await sleep(5000)  // rate limit
  }
}

await backfillEmbeddings('ssoktube-tist')
await backfillEmbeddings('ssoktube-blog')
```

500편 임베딩 = ~$0.35. 약 1시간 (rate limit 고려).

### 6.4 검색 인덱스 빌드

```typescript
async function buildSearchIndex(siteId: string) {
  const posts = await metaDb
    .collection('sites').doc(siteId).collection('curated_posts')
    .where('status', '==', 'published')
    .get()
  
  for (const doc of posts.docs) {
    const post = doc.data() as CuratedPost
    if (!post.embedding) continue
    
    await metaDb
      .collection('sites').doc(siteId).collection('search_index')
      .doc(`idx_${post.postId}`)
      .set({
        indexId: `idx_${post.postId}`,
        postId: post.postId,
        title: post.title,
        excerpt: post.excerpt,
        url: `/articles/${post.slug}`,
        publishedAt: post.publishedAt,
        embedding: post.embedding,
        embeddingModel: post.embeddingModel,
        keywords: extractKeywords(post),
        updatedAt: serverTimestamp(),
      })
  }
}
```

### 6.5 Week 1 검증

```
□ 모든 컬렉션 import 성공 (정수 일치)
   → SSOKTUBE: saved_summaries 526개
   → 메타: ssoktube-tist 312개 + ssoktube-blog 214개 = 526 ✅

□ 임베딩 백필 100% 완료
□ 검색 인덱스 빌드 완료
□ 무작위 10편 글 정합성 검증
   → 본문 / 메타 데이터 / URL 일치
□ child_sites 문서 정상
□ Vercel project 생성됨
□ 환경변수 주입됨
```

이 시점에서 메타는 데이터를 가지고만 있음. 발행은 SSOKTUBE가 계속.

---

## 7. Week 2: Dual-Write 시작

### 7.1 SSOKTUBE 코드 수정 — 메타에도 쓰기

SSOKTUBE의 발행 코드에 분기 추가:

```typescript
// SSOKTUBE: lib/dual-write.ts (신규 파일)

const DUAL_WRITE_ENABLED = process.env.DUAL_WRITE_TO_META === 'true'
const META_FIRESTORE = process.env.DUAL_WRITE_ENABLED ? getMetaDb() : null

export async function dualWriteSavedSummary(summary: SavedSummary) {
  // 1. 원래 자리에 쓰기 (SSOKTUBE)
  await ssoktubeDb.collection('saved_summaries').doc(summary.sessionId).set(summary)
  
  // 2. 메타에도 쓰기 (DUAL_WRITE_ENABLED일 때만)
  if (DUAL_WRITE_ENABLED && META_FIRESTORE) {
    try {
      const siteId = decideSiteId(summary)
      if (siteId) {
        const transformed = transformForMeta(summary, siteId, 'saved_summaries')
        await META_FIRESTORE
          .collection('sites').doc(siteId).collection('saved_summaries')
          .doc(summary.sessionId).set(transformed)
      }
    } catch (err) {
      // 메타 쓰기 실패 → SSOKTUBE는 정상, 알림만
      console.error('Meta dual-write failed:', err)
      await sendAlert('Meta dual-write failed', err.message)
    }
  }
}

// curated_posts, ai_scout_queue 등도 동일 패턴
```

기존 SSOKTUBE 발행 코드의 모든 Firestore write를 `dualWrite*` 함수로 래핑.

### 7.2 환경변수 추가 (SSOKTUBE 측)

```bash
# SSOKTUBE Vercel project에 추가
DUAL_WRITE_TO_META=true
META_FIREBASE_PROJECT_ID=meta-site-prod
META_FIREBASE_CLIENT_EMAIL=...
META_FIREBASE_PRIVATE_KEY=...
```

### 7.3 SSOKTUBE 재배포

```bash
git push origin feat/dual-write
# Vercel 자동 배포
```

이제 SSOKTUBE가 발행하면 양쪽 모두에 쓰기.

### 7.4 Week 2 모니터링 (1주일)

매일 검증:

```
□ SSOKTUBE 평소대로 발행 (사용자 변화 없음)
□ 양쪽 데이터 정합성
   → 새 글 SSOKTUBE에 N개 → 메타에도 N개 도착했나
□ 메타 dual-write 실패율 < 1%
□ 메타에서 새 글의 임베딩 생성됐는가 (이건 메타 cron이 처리)
□ 메타에서 검색 가능한가
```

자동 검증 스크립트:

```typescript
async function verifyDualWriteIntegrity(date: string) {
  const ssoktubeNew = await ssoktubeDb.collection('saved_summaries')
    .where('createdAt', '>=', date)
    .get()
  
  const metaNewTist = await metaDb
    .collection('sites').doc('ssoktube-tist').collection('saved_summaries')
    .where('createdAt', '>=', date)
    .get()
  
  const metaNewBlog = await metaDb
    .collection('sites').doc('ssoktube-blog').collection('saved_summaries')
    .where('createdAt', '>=', date)
    .get()
  
  const ssoktubeCount = ssoktubeNew.size
  const metaCount = metaNewTist.size + metaNewBlog.size
  
  return {
    ssoktube: ssoktubeCount,
    meta: metaCount,
    diff: ssoktubeCount - metaCount,
    pass: Math.abs(ssoktubeCount - metaCount) <= 1,  // 1개 차이는 허용
  }
}
```

문제 발견 시 → 다음 단계 미진. 원인 수정 후 검증 반복.

### 7.5 Week 2 게이트

```
✅ 7일 연속 dual-write 정합성 OK
✅ 메타 측 임베딩 백필 + 검색 인덱스 자동 갱신
✅ 메타 어드민에서 SSOKTUBE 데이터 보임
✅ 사용자(독자) 측에서는 변화 없음 (SSOKTUBE 사이트 그대로)
```

---

## 8. Week 3: 메타 발행 시작 (테스트 사이트만)

### 8.1 분기 전략

ssoktube-tist만 메타가 발행. ssoktube-blog는 SSOKTUBE 단독 발행 유지.

```
SSOKTUBE → ssoktube-tist 발행 OFF
메타 → ssoktube-tist 발행 ON

SSOKTUBE → ssoktube-blog 발행 ON (그대로)
메타 → ssoktube-blog 발행 OFF
```

이 비교 그룹으로 메타 발행이 SSOKTUBE 발행과 동등한지 검증.

### 8.2 SSOKTUBE 측 변경

```typescript
// SSOKTUBE: lib/publish-decision.ts (신규)

export function shouldSsoktubePublish(target: 'tistory' | 'blogger'): boolean {
  // 환경변수로 제어
  if (target === 'tistory') {
    return process.env.SSOKTUBE_PUBLISH_TISTORY !== 'false'
  }
  if (target === 'blogger') {
    return process.env.SSOKTUBE_PUBLISH_BLOGGER !== 'false'
  }
  return true
}

// 발행 함수에서
async function publishToTistory(post) {
  if (!shouldSsoktubePublish('tistory')) {
    console.log('Tistory publish handled by meta, skipping')
    return
  }
  // ... 원래 발행 로직
}
```

환경변수:

```bash
# SSOKTUBE
SSOKTUBE_PUBLISH_TISTORY=false      # 메타가 처리
SSOKTUBE_PUBLISH_BLOGGER=true       # SSOKTUBE 계속 처리
```

### 8.3 메타 측 활성화

ssoktube-tist 사이트의 publish 활성:

```typescript
// 어드민 → ssoktube-tist → settings/curation
{
  autoPublish: true,
  // ...
}
```

### 8.4 첫 발행 검증

다음 SSOKTUBE 발행 사이클에서:

```
1. SSOKTUBE Cron 트리거 → 4단계 진행 → 발행 시점
2. SSOKTUBE 코드: shouldPublish('tistory') === false → 스킵
3. 메타 측: dual-write로 saved_summary 도착
4. 메타 ssoktube-tist의 sectionId='news' Cron이 별도 트리거되거나
   또는 즉시 generate 단계 호출
5. 메타가 글 작성 → publisher-adapters Tistory adapter → 발행
6. publishedTo.tistory 갱신
```

새 글 1편 발행 → 다음 검증:

```
□ Tistory에 글 정상 게시
□ 글 본문 + 메타 데이터 OK
□ AdSense / 어필리에이트 마커 정상 처리
□ 내부 링크 정상 (마커 → URL 치환)
□ revalidate 호출 정상 (자체 도메인 X, Tistory만)
□ IndexNow 호출 정상
```

문제 발견 시:
- ssoktube-tist 자동 정지
- SSOKTUBE_PUBLISH_TISTORY=true로 환원
- 원인 분석 후 재시도

### 8.5 Week 3 검증 (7일)

매일:

```
□ ssoktube-tist에 메타 발행 N편 (예상치와 일치)
□ ssoktube-blog에 SSOKTUBE 발행 N편 (그대로)
□ 양쪽 글 품질 비교 (메타 발행이 더 좋거나 동등)
□ 비용 비교 (메타가 살짝 더 비쌈 — 3인 체제 때문)
□ 사용자 측 변화 없음 (URL 그대로 유지)
```

7일 연속 안정 → 다음 단계.

---

## 9. Week 4: 양쪽 메타 발행

### 9.1 ssoktube-blog도 메타로

```bash
# SSOKTUBE
SSOKTUBE_PUBLISH_TISTORY=false
SSOKTUBE_PUBLISH_BLOGGER=false       # 추가
```

```typescript
// 메타: ssoktube-blog 활성화
await db.collection('child_sites').doc('ssoktube-blog').update({
  status: 'active',
  'settings.curation.autoPublish': true,
})
```

### 9.2 SSOKTUBE 발행 중단 (코드는 보존)

이 시점부터 SSOKTUBE는 "data dual-write"만, 발행 X.

### 9.3 1주일 검증

```
□ ssoktube-tist + ssoktube-blog 모두 메타가 발행
□ 평소와 같은 발행 빈도 (일 3편 등)
□ Tistory + Blogger 양쪽 글 정상
□ 운영자 부담 변화 (메타 어드민이 더 편한가?)
```

---

## 10. Week 5: SSOKTUBE Cron 비활성화

### 10.1 SSOKTUBE Cron 모두 끄기

```json
// SSOKTUBE: vercel.json
{
  "crons": []   // 모든 Cron 제거
}
```

이제 SSOKTUBE는 dual-write 받기만 함 (사실상 미러).

### 10.2 메타 단독 운영

메타가 모든 발행 + 분석 + 알림 처리.

### 10.3 1주일 검증

```
□ 메타가 단독으로 발행 흐름 처리
□ SSOKTUBE는 데이터 받기만 (사이트는 살아있지만 능동 작업 X)
□ 알림 채널이 메타로 통합됐는가
□ 비용 정상 (메타 측에서만 청구)
```

### 10.4 마지막 dual-write 사이클

이 시점부터는 메타 → SSOKTUBE dual-write가 더 이상 필요 없음. 다만 안전망으로 1주일 더 유지.

---

## 11. Week 6: 마이그레이션 완료

### 11.1 SSOKTUBE Dual-Write 중단

```bash
# SSOKTUBE
DUAL_WRITE_TO_META=false       # OFF
```

이제 SSOKTUBE는 완전히 정지된 상태 (데이터 변경 X). 코드는 남아있음.

### 11.2 SSOKTUBE 어드민 read-only

```typescript
// SSOKTUBE 어드민: middleware로 모든 write 차단
export function middleware(req: NextRequest) {
  const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
  
  if (isWrite && req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'SSOKTUBE is now read-only after migration to meta' },
      { status: 410 }
    )
  }
}
```

운영자가 옛 데이터 확인은 가능. 변경은 X.

### 11.3 SSOKTUBE 코드 보존

GitHub repo는 그대로. Vercel project는 다음 옵션:

```
옵션 A: SSOKTUBE Vercel project 그대로 유지
   비용: ~$0 (Cron 없으니 거의 안 씀)
   장점: 비상 시 즉시 복구 가능
   
옵션 B: SSOKTUBE Vercel project 일시정지
   Vercel 대시보드 → Settings → Disable
   장점: 비용 0
   복구: 며칠 걸림 (재활성화)
   
권장: 옵션 A (1년 정도)
   1년 후 메타 안정성 확인되면 옵션 B 또는 삭제
```

### 11.4 마이그레이션 완료 선언

```
□ 메타 단독으로 4주 안정 운영
□ 사용자 측 (Tistory/Blogger 사이트) 변화 없음
□ 비용 메타로 통합
□ SSOKTUBE 코드 보존
□ 운영자가 메타 어드민에 익숙해짐
```

축하 메시지 발송 (Slack):

```
🎉 SSOKTUBE → 메타사이트 마이그레이션 완료

기간: 6주
다운타임: 0초
이전된 글: 526편
새 자식 사이트: 2개 (ssoktube-tist, ssoktube-blog)

이제 메타 어드민에서 통합 운영하세요.
SSOKTUBE 코드는 12개월 보존됩니다 (분리 옵션).
```

---

## 12. 비상 시 롤백 (각 단계별)

### 12.1 Week 1 후 롤백

```
1. 메타에 import한 데이터 그대로 둠 (사용 안 함)
2. SSOKTUBE 그대로 운영
3. 손실: 데이터 import 비용 ($1)
```

### 12.2 Week 2 후 롤백

```
1. SSOKTUBE 환경변수 DUAL_WRITE_TO_META=false
2. SSOKTUBE 그대로 운영
3. 손실: 메타 측 dual-write 데이터 (다 정리할 필요 X, 그냥 둠)
```

### 12.3 Week 3 후 롤백 (메타가 ssoktube-tist 발행 시작 후)

```
1. SSOKTUBE_PUBLISH_TISTORY=true 환원
2. ssoktube-tist 사이트 paused
3. 메타가 발행한 글이 Tistory에 있음 → 검토 후 유지/삭제
4. 손실: 며칠 분 발행 글 (메타 vs SSOKTUBE 다른 톤일 수 있음)
```

### 12.4 Week 5 후 롤백 (SSOKTUBE Cron 끈 후)

```
1. SSOKTUBE vercel.json에 Cron 다시 등록 + 재배포
2. SSOKTUBE_PUBLISH_TISTORY=true, SSOKTUBE_PUBLISH_BLOGGER=true
3. 메타 ssoktube-tist, ssoktube-blog 모두 paused
4. 양쪽 사이트 정상 작동
5. 데이터 동기화 (며칠 분 메타 데이터를 SSOKTUBE로 가져오기 — 수동)
```

복잡하지만 가능.

### 12.5 Week 6 후 롤백 (완전 마이그레이션 후)

가장 어려움. 그러나 가능:

```
1. SSOKTUBE 코드 archive에서 복원
2. 모든 환경변수 복원
3. SSOKTUBE 재배포
4. SSOKTUBE Cron 재등록
5. 메타 자식 사이트 비활성
6. 메타 → SSOKTUBE 데이터 마이그레이션 (반대 방향)
7. 며칠간 검증

총 ~1주일 작업.
```

이게 **마이그레이션 출구 보존**의 의미. 못 돌아가는 것 X.

---

## 13. 마이그레이션 후 SSOKTUBE 단독 회귀 옵션

12개월 후 메타 운영자가 SSOKTUBE를 메타에서 분리하고 싶다면:

```
1. 자식 사이트 데이터 export (sites/ssoktube-* → SSOKTUBE 컬렉션 형태로)
2. SSOKTUBE 코드 활성화 (12개월 전 그 상태로)
3. 새 환경변수 등록
4. SSOKTUBE Cron 재가동
5. 양쪽 검증 후 메타 자식 사이트 archived

기간: 1~2주
```

deployment-guide.md 8.2의 분리 절차와 유사. 다만 SSOKTUBE 원본 코드가 남아있어 더 쉬움.

---

## 14. 다른 자식 사이트 마이그레이션 (template)

SSOKTUBE 마이그레이션 경험을 다른 운영자가 활용 가능. 다음 시스템들도 같은 패턴:

```
운영자가 가진 다른 매거진:
- 여행 블로그
- 부동산 정보 사이트
- 영어 학습 사이트
...

→ SSOKTUBE 마이그레이션 6주 플랜 그대로 적용 가능
→ 단 데이터 매핑은 시스템별 다름
```

이 문서가 일반화된 마이그레이션 플레이북.

---

## 15. 메타사이트 자체 출구 (메타 운영자가 메타를 떠날 때)

운영자가 1년 후 메타사이트를 더 이상 운영하지 않게 됐을 때:

```
1. 모든 자식 사이트의 Vercel project를 새 owner로 transfer
2. Firestore project를 새 owner로 transfer (또는 데이터만 export)
3. 자식 사이트 코드를 standalone 모드로 전환 (메타 의존 제거)
4. 메타사이트 archived
5. 자식 사이트들이 standalone으로 자체 운영
```

deployment-guide.md 8장의 마이그레이션 출구 절차.

---

## 16. 운영자를 위한 마지막 메모

```
이 마이그레이션은 1회성이 아니다.

✓ 매번 새 자식 사이트 마이그레이션할 때 이 문서 참조
✓ 각 단계의 검증을 절대 스킵하지 말 것
✓ "왜 마이그레이션하는가" 명확하지 않으면 안 함
✓ 실패해도 복구 가능. 두려워하지 말 것
✓ 단 시간 압박 없이 진행할 것 (6주 여유)
```

마이그레이션 = 시스템 진화의 일부. 영원한 정답은 없음. 매번 다시 평가.

---

## 17. 다음 — 없음 (마지막 문서)

이 문서가 메타사이트 명세 시리즈의 **마지막 문서**다.

총 **22개 문서**가 작성됐다:

```
Tier A (코어 골격):    4개
Tier B (메타 어드민):   2개
Tier C (콘텐츠 시스템):  4개
Tier D (SEO/수익화):    3개
Tier E (인프라):       4개
Tier F (배포):         5개  ← 이 문서는 마지막
```

이 22개 문서로:
- 클로드 코드가 시스템을 구축할 수 있다
- 운영자가 안전하게 띄울 수 있다
- 매일 30분 미만으로 N개 사이트 운영 가능
- 메타가 사라져도 자식 사이트는 살아남는다
- SSOKTUBE 같은 검증된 시스템도 zero-downtime 마이그레이션 가능

---

## 18. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 다른 문서 통합. 마이그레이션 6주 플랜. |

---

*이 문서는 SSOKTUBE → 메타사이트 마이그레이션의 단일 출처다. 6주 zero-downtime 플랜 + 단계별 검증 + 롤백 가능성 + 단독 회귀 옵션을 담고 있다.*

*🎉 메타사이트 명세 시리즈 완료.*
