# META-SITE: 배포 가이드 (deployment-guide.md)

> 메타사이트 초기 배포 + 자식 사이트 자동 배포 + 마이그레이션 출구 + 롤백/비상 정지.
> 클로드 코드가 시스템을 구축한 후 운영자가 실제로 띄우는 모든 절차의 단일 출처.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ environment-variables.md       (환경변수)
  └─ deployment-guide.md            ★ 이 문서 — 배포
        └─ testing-checklist.md          (다음)
```

이 문서는:
- 메타사이트 초기 배포 (1회) 절차
- 자식 사이트 자동 배포 흐름
- Firebase / Vercel / 도메인 셋업
- 자식 사이트 템플릿 repo 구조
- ISR + revalidation 전략
- 마이그레이션 출구 (자식 사이트가 메타 없이도 산다)
- 비상 시 롤백 / 메타사이트 정지

---

## 1. 핵심 원칙

### 1.1 배포 단계 분리

```
[Phase 0] 인프라 셋업 (1회만)
   Firebase project, GCP project, GitHub repo

[Phase 1] 메타사이트 배포 (1회만)
   Vercel project, 도메인, 환경변수, 첫 deploy

[Phase 2] 자식 사이트 템플릿 준비 (1회만)
   GitHub template repo, base 코드

[Phase 3] 첫 자식 사이트 (1회만, 검증)
   사이트 생성 폼 → 자동 배포 → 검증

[Phase 4] 운영
   추가 자식 사이트 무한 반복 (자동)
```

### 1.2 자동화 vs 수동

> **"운영자가 직접 만지는 건 처음 한 번만. 그 후엔 자동."**

처음 한 번만 (수동):
- Firebase project 생성
- Vercel team / 결제 설정
- GitHub repo 생성
- 도메인 구매
- 메타사이트 환경변수 입력
- AdSense 계정 등록 (자동 등록 불가)

그 후 (자동):
- 자식 사이트 생성 → Vercel project 자동 생성
- DNS 자동 등록
- 환경변수 자동 주입
- GSC + GA4 자동 등록

### 1.3 마이그레이션 출구

> **"메타사이트가 사라져도 자식 사이트는 산다."**

자식 사이트는 독립 Vercel project + 독립 도메인. 메타가 망해도:
- 자식 사이트는 그대로 작동 (마지막 배포 상태)
- 자식 사이트의 Firestore 컬렉션은 GCP project에 남음
- 운영자가 자식 사이트 코드를 분리해서 자체 운영 가능

---

## 2. Phase 0 — 인프라 셋업 (1회)

### 2.1 GCP / Firebase Project

1. **GCP 콘솔에서 새 project 생성**
   - 이름: `meta-site-prod` (운영자 자유)
   - Billing 계정 연결 (Firestore + Storage 유료 사용)

2. **Firebase 활성화**
   - https://console.firebase.google.com → 위 GCP project 추가
   - Firestore Database 생성 (Native mode, asia-northeast3 권장 — 한국 서울)
   - Authentication 활성화 (Email/Password + Google 로그인)
   - Storage 활성화

3. **Service Account 생성**
   - GCP IAM → Service Accounts → "Create Service Account"
   - 이름: `meta-site-admin`
   - 권한:
     - Firestore Admin
     - Storage Admin
     - Search Console (custom role 만들거나 직접 추가)
     - Analytics Admin
   - JSON key 다운로드 → 안전 보관 (`firebase-admin.json`)

4. **Firestore 인덱스 + Security Rules**
   - `database-schema.md` 8장 인덱스 정의 적용
   - `database-schema.md` 6장 Security Rules 적용
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

### 2.2 Vercel 셋업

1. **Vercel 계정 + 팀 생성**
   - https://vercel.com → "Add Team" 또는 개인 계정
   - **Pro 플랜 필수** (Cron + Function 한계)

2. **Vercel CLI 설치**
   ```bash
   npm i -g vercel
   vercel login
   ```

3. **GitHub 연동**
   - Vercel 대시보드 → Settings → Git → Connect GitHub

4. **API 토큰 발급**
   - Vercel 대시보드 → Settings → Tokens → "Create"
   - 권한: Full Account
   - 이름: `meta-site-automation`
   - 토큰 안전 보관 (`VERCEL_API_TOKEN` 환경변수로 사용)

### 2.3 GitHub Repos

```
github.com/{org}/meta-site               메타사이트 코드
github.com/{org}/meta-site-child-template 자식 사이트 템플릿
```

### 2.4 도메인 + DNS

메타사이트용 도메인 + 자식 사이트용 base 도메인 (서브도메인 풀백 옵션):

```
meta.example.com                메타사이트 어드민
meta-site.app                   자식 서브도메인용 (선택)
   → ai-kr.meta-site.app        자식 사이트 (도메인 없을 때 폴백)
```

자식 사이트가 자체 도메인을 가지는 게 보통. 서브도메인은 도메인 구매 전 임시.

---

## 3. Phase 1 — 메타사이트 배포 (1회)

### 3.1 코드 준비

```bash
git clone https://github.com/{org}/meta-site
cd meta-site
npm install
```

### 3.2 환경변수 셋업

`environment-variables.md` 2장의 메타 환경변수 ~44개를 Vercel 대시보드에 일괄 입력:

```bash
# CLI로 일괄 등록
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
# ... 모든 변수
```

또는 `.env.production`에 작성 후:
```bash
vercel env pull .env.production
# 편집 후
vercel env push .env.production production
```

### 3.3 첫 배포

```bash
vercel --prod
```

또는 GitHub repo가 Vercel에 연결됐으면 push만으로 자동 배포.

### 3.4 도메인 연결

```bash
vercel domains add meta.example.com
```

DNS 레코드 안내 따라 도메인 등록업체에서 설정 (보통 `A 76.76.21.21` 또는 `CNAME cname.vercel-dns.com`).

### 3.5 Firebase Auth 설정

Firebase 콘솔 → Authentication → Sign-in method:
- Email/Password 활성화
- Google 활성화 (선택)
- **Authorized domains**에 `meta.example.com` 추가

### 3.6 어드민 접속 검증

```
https://meta.example.com/admin
   ↓
로그인 화면 표시
   ↓
ADMIN_EMAILS의 이메일로 로그인 (Email/Password 또는 Google)
   ↓
대시보드 진입
```

### 3.7 첫 헬스체크

```bash
# 5분 후 (첫 Cron 트리거)
vercel logs meta-site-prod
```

다음 확인:
- ✅ `health-check-external` 트리거됨
- ✅ Firebase 연결 성공
- ✅ AI API 응답 정상
- ✅ Slack/Discord webhook 테스트 메시지 도착 (테스트 알림 발송)

---

## 4. Phase 2 — 자식 사이트 템플릿 (1회)

### 4.1 자식 사이트 템플릿 repo 구조

```
meta-site-child-template/
├── app/
│   ├── layout.tsx              루트 레이아웃 (GA4 / AdSense Script)
│   ├── page.tsx                홈
│   ├── articles/
│   │   └── [slug]/
│   │       └── page.tsx        글 페이지
│   ├── [section]/              섹션 페이지 (동적)
│   │   └── page.tsx
│   ├── search/
│   │   └── page.tsx            검색
│   ├── newsletter/
│   │   ├── confirm/route.ts
│   │   └── unsubscribe/route.ts
│   ├── api/
│   │   ├── search/route.ts
│   │   ├── newsletter/
│   │   ├── revalidate/route.ts (메타 → 자식 ISR 트리거)
│   │   └── ...
│   ├── llms.txt/route.ts
│   ├── sitemap.xml/route.ts
│   ├── rss.xml/route.ts
│   └── robots.txt/route.ts
├── components/
│   ├── ads/AdSlot.tsx
│   ├── affiliate/AffiliateBox.tsx
│   ├── article/ArticleRenderer.tsx
│   └── ...
├── lib/
│   ├── firebase.ts             Firestore 클라이언트 (메타와 공유)
│   ├── seo/                    SEO 자동 생성 함수
│   └── ...
├── public/
│   ├── logo.png                자식 사이트별 교체 (자동)
│   └── ...
├── package.json
├── next.config.js
├── tsconfig.json
└── README.md
```

이 repo가 모든 자식 사이트의 base. 자식마다 fork X (한 repo로 N개 Vercel project).

### 4.2 자식 사이트 코드의 사이트 식별

```typescript
// lib/firebase.ts
const SITE_ID = process.env.SITE_ID!  // 환경변수로 자식 사이트 자기 식별

export async function getSiteConfig() {
  const doc = await db.collection('child_sites').doc(SITE_ID).get()
  return doc.data() as ChildSite
}

export async function getPosts(filter: any) {
  return await db
    .collection('sites').doc(SITE_ID).collection('curated_posts')
    .where('status', '==', 'published')
    .where(filter)
    .get()
}
```

같은 코드가 SITE_ID에 따라 다른 사이트로 동작.

### 4.3 ISR (Incremental Static Regeneration)

자식 사이트의 모든 페이지는 ISR. 글 발행 시 메타가 revalidation 트리거:

```typescript
// 자식 사이트: app/articles/[slug]/page.tsx

export const revalidate = 3600                  // 1시간마다 자동 재생성

export async function generateStaticParams() {
  const posts = await getRecentPosts(100)
  return posts.map((p) => ({ slug: p.slug }))
}

export default async function ArticlePage({ params }: Props) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  return <Article post={post} />
}
```

```typescript
// 자식 사이트: app/api/revalidate/route.ts

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== process.env.INTERNAL_REVALIDATION_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const { paths } = await req.json()
  
  for (const path of paths) {
    revalidatePath(path)
  }
  
  return NextResponse.json({ revalidated: paths })
}
```

메타가 발행 후 호출:

```typescript
// 메타: lib/publishers/nextjs-publisher.ts
async function refreshSeoArtifacts(post: CuratedPost) {
  const baseUrl = `https://${this.site.hostingConfig.domain}`
  
  await fetch(`${baseUrl}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_REVALIDATION_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paths: [
        `/articles/${post.slug}`,
        `/${post.sectionId}`,
        '/',
        '/sitemap.xml',
        '/rss.xml',
        '/llms.txt',
      ],
    }),
  })
}
```

### 4.4 빌드 시간 최적화

```typescript
// next.config.js
module.exports = {
  output: 'standalone',                  // 빠른 빌드
  
  experimental: {
    isrFlushToDisk: true,                // ISR 캐시를 디스크 저장
  },
  
  images: {
    domains: ['firebasestorage.googleapis.com', 'youtube.com', 'i.ytimg.com'],
  },
  
  // 글 1만+ 사이트는 generateStaticParams 제한 (ISR fallback에 의존)
}
```

---

## 5. Phase 3 — 첫 자식 사이트 생성 (검증용)

### 5.1 사이트 생성 폼 사용

`/sites/new` 접근 → site-creation-flow.md의 6단계 마법사 진행.

### 5.2 자동 진행되는 것

```
✅ 1/7 child_sites 등록 (Firestore)
✅ 2/7 Vercel project 생성 (template repo에서 fork)
✅ 3/7 도메인 연결 + DNS 검증 (운영자가 DNS 설정 후 [재검증])
✅ 4/7 Firestore 컬렉션 초기화 (settings/curation, etc.)
✅ 5/7 SEO 인프라 (llms.txt 템플릿, IndexNow 키)
✅ 6/7 정적 페이지 생성 (About / Privacy / Contact)
✅ 7/7 페르소나 + 출처 + 권위 트리 자동 생성
```

### 5.3 검증 단계

`testing-checklist.md`에서 상세. 핵심:

- 도메인 접속 확인 (HTTPS)
- /llms.txt /sitemap.xml /rss.xml /robots.txt 모두 응답
- 글 1편 발행 → 자식 사이트에 표시되는지
- Search Console 자동 등록됐는지
- GA4 추적 코드 작동하는지

---

## 6. 자식 사이트 자동 배포 흐름

### 6.1 Vercel API로 새 project 생성

site-creation-flow.md "Step 2: 호스팅 셋업"의 setupNextjs():

```typescript
async function setupNextjs(site: ChildSite, input: NextjsInput) {
  // 1. Vercel project 생성 (template repo 기반)
  const project = await vercel.projects.create({
    name: `child-${site.siteId}`,
    framework: 'nextjs',
    gitRepository: {
      type: 'github',
      repo: 'org/meta-site-child-template',  // 템플릿 repo
      productionBranch: 'main',
    },
    rootDirectory: undefined,                 // repo root
    installCommand: 'npm install',
    buildCommand: 'next build',
    outputDirectory: '.next',
  })
  
  // 2. 환경변수 주입 (environment-variables.md 5.2)
  await setupEnvironmentVarsForChildSite(site, project.id)
  
  // 3. 도메인 연결
  await vercel.domains.add({
    projectId: project.id,
    name: input.domain,
  })
  
  // 4. DNS 검증
  let verified = false
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(10000)                        // 10초 대기
    const status = await vercel.domains.get(project.id, input.domain)
    if (status.verified) {
      verified = true
      break
    }
  }
  
  if (!verified) {
    // 5분 안에 검증 안 되면 운영자 안내
    return { 
      success: false, 
      pending: true, 
      instructions: 'DNS 설정 후 [재검증] 필요',
    }
  }
  
  // 5. 첫 배포 트리거
  await vercel.deployments.create({
    projectId: project.id,
    target: 'production',
  })
  
  return { success: true, projectId: project.id }
}
```

### 6.2 GitHub repo는 한 개 (모든 자식 사이트 공유)

> **"코드는 한 곳, project는 N개."**

```
github.com/org/meta-site-child-template
   │
   ├── 메타사이트가 push 시 → 모든 자식 사이트 자동 재배포
   ├── 환경변수만 다름 (SITE_ID, 도메인 등)
   └── 같은 코드, 다른 사이트
```

장점:
- 코드 1번 수정 = 모든 자식 사이트 적용
- 버그 픽스 한 번

단점:
- 한 사이트만 다른 동작 원하면 어려움 → 환경변수로 분기 (`if (process.env.SITE_ID === 'travel-kr')`)

### 6.3 자식 사이트 코드 업데이트 흐름

```
운영자가 child-template repo에 push
   ↓
GitHub Webhook → Vercel
   ↓
모든 자식 사이트 project가 자동 재배포 (병렬)
   ↓
각 사이트 독립 ISR 캐시 갱신
```

대규모 변경 시 단계적 rollout:

```typescript
// 1단계: 일부 사이트만 미리 빌드 (canary)
const canarySites = ['ai-kr']  // 1개만
for (const siteId of canarySites) {
  const site = await getChildSite(siteId)
  await vercel.deployments.create({ projectId: site.hostingConfig.vercelProjectId })
}

// 2단계: 검증 후 나머지 적용
// (실제로는 GitHub push만 해도 모두 자동 적용됨)
```

---

## 7. 운영 중 흐름

### 7.1 일반 운영 (자동)

```
매일:
  - Cron이 콘텐츠 파이프라인 실행
  - 새 글 발행 → 자식 사이트 ISR revalidate
  - 분석 데이터 fetch
  - 일일 리포트 발송 (운영자 09:00)
  
매주:
  - 콘텐츠 갭 리포트
  - 권위 페이지 정합성 검증
  - 출처 가중치 조정
```

운영자 관여 거의 없음.

### 7.2 운영자가 매일 하는 것 (~30분)

1. 일일 리포트 검토 (09:00)
2. 검수 큐의 새 글 검토 (1~3편)
3. 미처리 알림 처리 (1~3건)
4. 콘텐츠 갭 발견 시 출처 풀에 키워드 추가 (선택)

### 7.3 새 자식 사이트 추가 (월 1~2회)

```
운영자가 /sites/new 접근
   ↓
6단계 마법사 (10~15분)
   ↓
자동 배포 (5~10분 대기)
   ↓
첫 글 발행 검증 (수동, ~1시간)
   ↓
운영 시작
```

---

## 8. 마이그레이션 출구

### 8.1 메타가 사라져도 자식이 살아남는 이유

```
[자식 사이트 코드]
   GitHub: org/meta-site-child-template
   Vercel project: 독립 (사이트별)
   환경변수: 사이트별 (의존 X)
   ✅ 메타 없이도 작동

[자식 사이트 데이터]
   Firestore: meta-site-prod GCP project
   ✅ GCP에 살아있음

[자식 사이트 도메인]
   소유: 운영자
   DNS: Vercel 가리킴
   ✅ 메타 없이도 유효
```

### 8.2 자식 사이트 분리 절차

운영자가 메타사이트를 떠나거나 자식 사이트를 매각할 때:

```
1. 자식 사이트 코드 분리 (fork)
   - org/meta-site-child-template → buyer/standalone-site
   - SITE_ID 코드 의존 제거 (직접 하드코딩)
   - 메타와의 통신 코드 제거 (revalidation, 발행 트리거)

2. 자식 사이트 자체 발행 시스템 구축
   - 메타가 콘텐츠 발행하던 것 → 자체 어드민 또는 수동
   - SSOKTUBE 같은 단순 시스템으로 회귀 가능

3. Firestore 분리
   - sites/{siteId}/* 데이터를 새 GCP project로 export
   - GCS bucket으로 backup → 새 Firestore에 import

4. 도메인 → Vercel project 분리
   - Vercel 대시보드에서 새 owner로 transfer

5. 환경변수 새로 셋업
   - 외부 의존 (Firebase, AI API) 새 계정
```

총 ~1주일 작업. 자동화 어렵지만 **분리는 가능**.

### 8.3 메타가 거꾸로 자식 인수

운영자가 외부 사이트(쏙튜브 등)를 메타에 import:
→ `ssoktube-migration.md`에서 상세.

---

## 9. 비상 시나리오

### 9.1 메타사이트 정지 (긴급)

운영자가 의도적으로 모든 자동화를 멈추려면:

```bash
# 1. CRON_SECRET 변경 (모든 Cron 인증 실패 → 멈춤)
vercel env rm CRON_SECRET production
vercel env add CRON_SECRET production
# 새 값 입력

# 2. 메타 재배포
vercel --prod
```

이러면:
- 자식 사이트는 **계속 작동** (이미 배포된 글 + ISR 캐시)
- 메타의 모든 자동화는 멈춤 (cron 인증 실패)
- 새 글 발행 X
- 운영자가 어드민 통해 수동 복구 가능

### 9.2 단일 자식 사이트 정지

```typescript
await pauseSite(siteId, 'manual_emergency')
```

- 해당 사이트 cron 비활성
- 진행 중인 파이프라인 중단
- 사이트 자체는 그대로 (글은 보임)
- 어드민의 [재개] 버튼으로 복구

### 9.3 데이터베이스 롤백

매일 자정 Firestore 백업 (GCS). 비상 시:

```bash
# 1. 어제 백업 복원
gcloud firestore import gs://meta-site-backups/2026-05-05/

# 2. 메타사이트는 자동으로 복원된 데이터 사용
```

복원하면 어제까지의 글 + 큐 상태로 돌아감. 오늘 발행 글은 사라짐 (운영자 인지).

### 9.4 비용 폭주 발견

monitoring-health.md 7.2의 자동 감지가 못 잡았을 때 운영자 직접:

```bash
# 1. 모든 자식 사이트 일시정지
# (어드민에서 [전체 일시정지] 버튼)

# 2. magazine_logs 확인
# (어떤 모델이 어디에서 폭주했는지)

# 3. 원인 수정 (프롬프트 / 출처 등)

# 4. 사이트별로 재개
```

### 9.5 AdSense 정책 위반 통보

Google이 메일로 통보 → 운영자가 어드민에서:

1. 위반 글 식별 (`/posts` 검색)
2. 해당 글 광고 비활성 또는 archived
3. AdSense 대시보드에서 재검토 요청
4. 재발 방지 — `monetization.md` 6.1 정책 키워드 강화

---

## 10. 모니터링 + 경보

### 10.1 외부 헬스체크 (선택)

Vercel의 자체 모니터링 외에 별도 헬스체크 (UptimeRobot 등):

```
모니터링 대상:
- https://meta.example.com (어드민)
- https://meta.example.com/api/health (헬스 endpoint)
- 각 자식 사이트의 / (홈)

알림 채널:
- 메타 다운 → SMS (가장 긴급)
- 자식 사이트 다운 → Slack
```

### 10.2 메타사이트 헬스 endpoint

```typescript
// app/api/health/route.ts

export async function GET(req: NextRequest) {
  const checks = {
    firebase: false,
    ai: false,
    timestamp: new Date().toISOString(),
  }
  
  try {
    // Firebase ping
    await db.collection('_health').doc('test').get()
    checks.firebase = true
  } catch {}
  
  try {
    // AI ping (가벼운 테스트)
    // 실제 API 호출 X (비용)
    checks.ai = !!process.env.ANTHROPIC_API_KEY
  } catch {}
  
  const allOk = checks.firebase && checks.ai
  
  return NextResponse.json(checks, { status: allOk ? 200 : 503 })
}
```

---

## 11. 비용 추정 (운영)

### 11.1 고정 비용 (월)

```
Vercel Pro:                 $20
Firebase Blaze:             $5~20 (사용량 따라)
도메인 (메타 + 자식 6개):    ~$70/년 = $6/월
GCS Storage (백업):          $1
GitHub:                     $0 (Free / Pro $4)

총 고정: ~$32~50
```

### 11.2 변동 비용 (월)

```
AI API:                     $50~150 (사이트 수 따라)
이메일 (Resend):            $10
검색 API (Tavily):          $20
임베딩:                     $2
모니터링 (선택):            $0 (UptimeRobot Free)

총 변동: ~$82~182
```

### 11.3 자식 사이트 수익 (예상)

```
사이트당 월 평균:
- AdSense: $30~100
- 어필리에이트: $20~80
- 합계: $50~180/사이트

자식 사이트 6개 × 평균 $80 = $480/월
```

수익 - 비용 = **순이익 ~$300/월**부터 시작 (사이트 6개, 안정 운영 기준).

사이트 늘릴수록 변동 비용 비례 증가, 수익도 비례. 한계 효율은 사이트 1개 추가 시 비용 +$15 vs 수익 +$80.

---

## 12. 첫 사용 체크리스트

운영자가 처음 시스템 띄울 때:

```
□ GCP project 생성 + 결제
□ Firebase 활성화 + 인덱스 + Rules 배포
□ Service Account JSON 다운로드 + 안전 보관
□ Vercel Pro 가입
□ GitHub repo 2개 (meta-site, child-template)
□ 도메인 구매 (메타 + 첫 자식)
□ 메타 환경변수 ~44개 입력
□ 메타사이트 첫 배포
□ 어드민 접속 검증
□ Slack/Discord webhook 연결 + 테스트
□ AdSense 계정 등록 (자식 사이트 신청 후)
□ 첫 자식 사이트 생성 폼으로 생성
□ DNS 설정 + 검증
□ Phase 1 권위 트리 승인
□ 첫 권위 글 발행 확인
□ 일일 리포트 메일 도착 확인 (다음 날)
```

상세는 `testing-checklist.md`.

---

## 13. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 4단계 배포 (Phase 0~3) + Phase 4 운영
- ✅ 메타사이트 1회 배포 절차
- ✅ 자식 사이트 템플릿 repo 구조
- ✅ "코드는 한 곳, project는 N개" 패턴
- ✅ Vercel API로 자식 사이트 자동 배포 흐름
- ✅ ISR + revalidation 전략 (메타 → 자식 토큰 인증)
- ✅ 운영 중 일상 흐름 (자동 + 운영자 30분/일)
- ✅ 마이그레이션 출구 (자식 분리 절차)
- ✅ 비상 시나리오 5종 (메타 정지 / 사이트 정지 / DB 롤백 / 비용 폭주 / AdSense)
- ✅ 외부 헬스체크 + 헬스 endpoint
- ✅ 비용 추정 + 수익 예상 ($300/월 순이익)
- ✅ 첫 사용 체크리스트

이 문서가 정의하지 않은 것:
- ❌ 사이트 생성 후 검증 상세 → `testing-checklist.md`
- ❌ 쏙튜브 마이그레이션 → `ssoktube-migration.md`

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 다른 문서의 배포 흐름 통합. |

---

*이 문서는 메타사이트 배포의 단일 출처다. 초기 셋업 + 자식 자동 배포 + 마이그레이션 출구 + 비상 시나리오의 모든 결정을 담고 있다.*

*다음 문서: `testing-checklist.md` (Tier F 4번)*
