# META-SITE 사용 설명서

> AI 자동 발행 시스템 — 사이트 생성부터 크론 자동화까지 전체 워크플로우

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [초기 배포 설정](#2-초기-배포-설정)
3. [첫 번째 사이트 만들기](#3-첫-번째-사이트-만들기)
4. [Phase 1 — 권위 구축 워크플로우](#4-phase-1--권위-구축-워크플로우)
5. [Phase 2 — 지속 발행 워크플로우](#5-phase-2--지속-발행-워크플로우)
6. [크론 자동화 설정](#6-크론-자동화-설정)
7. [SEO 자동화](#7-seo-자동화)
8. [뉴스레터 설정](#8-뉴스레터-설정)
9. [분석 및 모니터링](#9-분석-및-모니터링)
10. [AI 비용 관리](#10-ai-비용-관리)
11. [고급 설정](#11-고급-설정)
12. [트러블슈팅](#12-트러블슈팅)

---

## 1. 시스템 개요

META-SITE는 여러 개의 자식 사이트를 하나의 대시보드에서 관리하며, Claude AI로 글을 자동 생성·발행하는 시스템입니다.

### 전체 구조

```
META-SITE 관리자 대시보드 (이 앱)
    │
    ├── child_sites (사이트 설정 저장소)
    │       ├── site-a (tech 블로그)
    │       ├── site-b (travel 블로그)
    │       └── site-c (finance 블로그)
    │
    └── 각 사이트 → 호스팅 플랫폼에 자동 발행
            ├── Next.js + Vercel (독립 도메인)
            ├── Tistory (국내 블로그)
            └── Blogger (구글 블로그)
```

### AI 파이프라인 3단계

```
[Writer - Claude Opus 4.7]
  → 글 초안 생성 (1200~2000단어)

[Verifier - Claude Sonnet 4.6]
  → 팩트체크, 허위 출처 제거

[Editor - Claude Sonnet 4.6]
  → SEO 최적화 (metaTitle, metaDescription)
  → 내부 링크 마커, 광고 슬롯 위치 지정
```

### 두 가지 발행 모드

| 모드 | 설명 | 언제 사용 |
|------|------|-----------|
| **Phase 1: 권위 구축** | AI가 아웃라인 28~42개를 생성 → 하나씩 발행 | 신규 사이트, 내부 링크 웹 구축 |
| **Phase 2: 지속 발행** | RSS 스카우트 → 요약 → 매일 새 글 발행 | 기존 사이트, 최신성 유지 |

---

## 2. 초기 배포 설정

### 2-1. 환경 변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 채웁니다.

```bash
cp .env.local.example .env.local
```

**필수 항목:**

```env
# Firebase (Firestore 데이터베이스)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# 관리자 이메일 (Firebase Auth 계정과 동일)
ADMIN_EMAILS=you@example.com

# 앱 URL (Vercel 배포 후 실제 URL 입력)
NEXTAUTH_URL=https://metasite-admin.vercel.app
NEXT_PUBLIC_BASE_URL=https://metasite-admin.vercel.app

# 크론 시크릿 (랜덤 문자열, Vercel 환경 변수에도 동일하게 설정)
CRON_SECRET=your-random-secret-here
```

**선택 항목 (기능별):**

```env
# 뉴스레터 (Resend)
RESEND_API_KEY=re_...

# Tistory 발행
TISTORY_CLIENT_ID=
TISTORY_CLIENT_SECRET=

# Blogger 발행
BLOGGER_CLIENT_ID=
BLOGGER_CLIENT_SECRET=
```

### 2-2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com) → 새 프로젝트 생성
2. **Firestore Database** 활성화 (프로덕션 모드)
3. **Authentication** 활성화 → 이메일/비밀번호 로그인 방법 사용
4. **서비스 계정** → 새 비공개 키 생성 → `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 입력

**Firestore 보안 규칙** (서버에서만 접근하므로 전체 차단):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2-3. Vercel 배포

```bash
# Vercel CLI 설치 및 배포
npm i -g vercel
vercel --prod
```

Vercel 대시보드 → **Settings → Environment Variables** 에 `.env.local`의 모든 변수를 추가합니다.

> `FIREBASE_PRIVATE_KEY`는 `"..."` 따옴표 포함해서 붙여넣기 해야 합니다.

### 2-4. 로그인 계정 생성

Firebase Console → Authentication → 사용자 추가:
- 이메일: `ADMIN_EMAILS`에 입력한 주소
- 비밀번호: 원하는 값

이후 `https://your-app.vercel.app/login` 에서 로그인합니다.

---

## 3. 첫 번째 사이트 만들기

좌측 사이드바 → **사이트 목록** → **새 사이트** 버튼 클릭.

### Step 1: 사이트 정체성

| 항목 | 설명 | 예시 |
|------|------|------|
| 사이트 이름 | 표시용 이름 | `Travel KR` |
| 사이트 ID | URL 슬러그, 소문자·하이픈만, **생성 후 변경 불가** | `travel-kr` |
| 토픽 | 메인 주제 | `travel` |
| 언어 | AI 글 작성 언어 | `한국어` |

### Step 2: 호스팅 선택

| 플랫폼 | 특징 | 필요한 것 |
|--------|------|-----------|
| **Next.js + Vercel** (추천) | 독립 도메인, 완전 제어 | 별도 Vercel 프로젝트 |
| **Tistory** | 국내 SEO 강점, 무료 | Tistory OAuth 토큰 |
| **Blogger** | 구글 도메인, 글로벌 | Blogger OAuth 토큰 |

### Step 3: 호스팅 셋업

**Next.js 선택 시:**
- `canonicalDomain`: 실제 사이트 도메인 (예: `travel-kr.com`)
- 나중에 이 도메인에 별도 Next.js 프로젝트를 배포하고 sitemap/RSS를 연결합니다

**Tistory 선택 시:**
- Blog Name (티스토리 블로그 ID)
- Access Token (OAuth 인증 후 발급)

### Step 4: 콘텐츠 정체성

**AI 페르소나 선택:**

| 페르소나 | 특징 |
|----------|------|
| 친근한 전문가 | 전문 지식을 쉽고 친근하게 |
| 데이터 저널리스트 | 수치, 통계, 근거 중심 |
| 스토리텔러 | 감성적이고 몰입감 있는 서사 |
| 날카로운 비평가 | 객관적 분석, 대안 제시 |
| 큐레이터 | 최고의 정보만 선별 요약 |

**섹션 구성:**
- 섹션 = 발행 카테고리 (예: "국내 여행", "해외 여행", "여행 꿀팁")
- 각 섹션마다 발행 주기 설정: 매일 / 주 3회 / 주 1회

### Step 5: 출처 + 시작 단계

**시작 단계 선택:**

- **Phase 1 (권위 구축)**: 신규 사이트라면 이것 선택. AI가 28~42개 아웃라인을 자동 생성하고 차례로 발행합니다.
- **Phase 2 (즉시 발행)**: 기존 사이트나 빠른 시작이 필요할 때. RSS 출처 필수.

**RSS 출처 추가 (Phase 2 필수, Phase 1 선택):**
- 같은 주제의 뉴스/블로그 RSS URL 입력
- 예: `https://feeds.feedburner.com/TechCrunch`
- "피드 테스트" 버튼으로 최근 항목 미리보기 가능

### Step 6: 검토 및 생성

모든 설정을 확인하고 **사이트 생성** 클릭.

생성 완료 시 자동으로 `사이트 상세 페이지`로 이동합니다.

---

## 4. Phase 1 — 권위 구축 워크플로우

신규 사이트에서 내부 링크로 연결된 콘텐츠 클러스터를 구축하는 방법입니다.

### 4-1. 아웃라인 생성

1. **사이트 상세** → **아웃라인** 탭 클릭
2. **AI 아웃라인 생성** 버튼 클릭
3. AI가 28~42개 글 제목+키워드 목록을 생성합니다 (약 30~60초 소요)

생성된 아웃라인 예시:
```
[seq: 1] 제주도 여행 완벽 가이드 — keyword: 제주도 여행
[seq: 2] 제주도 맛집 TOP 20 — keyword: 제주도 맛집
[seq: 3] 제주 렌터카 비교 — keyword: 제주 렌터카
...
```

### 4-2. 아웃라인 검토 및 승인

각 항목을 검토하고:
- **승인** (체크): 발행 대상으로 지정
- **거절** (X): 제외
- **전체 승인** 버튼: 모든 pending 항목 일괄 승인

> 승인된 항목부터 크론이 순서대로 발행합니다.

### 4-3. 수동 글 생성 테스트 (크론 전 확인)

아직 크론을 설정하기 전에 수동으로 테스트 발행:

```bash
curl -X POST https://your-admin.vercel.app/api/pipeline/authority \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret" \
  -d '{"siteId": "travel-kr"}'
```

또는 대시보드 → **발행 큐** → 카드에서 직접 확인.

### 4-4. 발행 결과 확인

1. **사이트 상세** → **글 목록** 탭
2. 상태 탭: `발행됨` | `승인됨` | `임시저장` | `실패` | `전체`
3. 발행된 글 클릭 → 본문, SEO 메타, AI 댓글 등 상세 확인

### 4-5. Phase 1 완료 후 Phase 2 전환

아웃라인 28~42개가 모두 발행되면:

1. **사이트 설정** → **운영 설정** → **현재 단계** → `Phase 2: 지속 발행` 선택
2. **RSS 출처** 탭에서 참고할 피드 추가
3. 저장 → 이후 크론이 자동으로 Phase 2 파이프라인 실행

---

## 5. Phase 2 — 지속 발행 워크플로우

RSS 출처에서 최신 뉴스를 수집하고 매일 새 글을 발행하는 방법입니다.

### 5-1. RSS 출처 등록

**사이트 상세** → **소스** 탭:

1. RSS URL 입력 (예: `https://techcrunch.com/feed/`)
2. **피드 테스트** 클릭 → 최근 5개 기사 미리보기로 유효성 확인
3. **추가** 클릭

> 출처는 3~5개 등록 권장. 너무 많으면 비용 증가.

### 5-2. 파이프라인 작동 방식

```
1. Scout    — 등록된 RSS에서 최신 기사 수집
2. Evaluate — Claude가 토픽과 관련성 평가 (0~10점)
3. Summarize — 상위 5개 기사 요약 (Claude Haiku)
4. Generate — Writer → Verifier → Editor 3단계 AI 파이프라인
5. Publish  — 호스팅 플랫폼에 자동 발행
```

### 5-3. 수동 실행 테스트

```bash
curl -X POST https://your-admin.vercel.app/api/pipeline/generate \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-cron-secret" \
  -d '{"siteId": "travel-kr"}'
```

응답 예시:
```json
{ "postId": "abc123", "success": true, "externalUrl": "https://travel-kr.com/post/..." }
```

---

## 6. 크론 자동화 설정

### 6-1. Vercel Cron 활성화

`vercel.json`이 이미 설정되어 있습니다:

```json
{
  "crons": [
    { "path": "/api/cron/tick",       "schedule": "0 * * * *"   },
    { "path": "/api/cron/analytics",  "schedule": "0 2 * * *"   },
    { "path": "/api/cron/newsletter", "schedule": "0 9 * * 1"   }
  ]
}
```

| 크론 | 일정 | 역할 |
|------|------|------|
| `/api/cron/tick` | 매시간 정각 | 발행 주기가 된 사이트에 파이프라인 실행 |
| `/api/cron/analytics` | 매일 새벽 2시 | GSC/GA4 트래픽 스냅샷 수집 |
| `/api/cron/newsletter` | 매주 월요일 9시 | 주간 뉴스레터 자동 발송 |

Vercel에 배포하면 **자동으로 활성화**됩니다. 별도 설정 불필요.

### 6-2. CRON_SECRET 설정

Vercel 대시보드 → **Settings → Environment Variables**:

```
CRON_SECRET = your-random-secret-here
```

> 이 값은 `.env.local`과 Vercel 환경 변수 양쪽에 **동일하게** 설정해야 합니다.

### 6-3. 크론 동작 확인

Vercel 대시보드 → **Logs** 탭에서 크론 실행 로그 확인:

```
[cron/tick] triggered: ['travel-kr', 'finance-kr'], skipped: ['tech-kr']
```

### 6-4. 발행 주기 설정

섹션별 발행 주기는 사이트 설정에서 관리합니다.

크론 tick이 매시간 실행되면서 각 사이트의 `sections[].lastPublishedAt`을 확인합니다:

| 발행 주기 | 다음 발행까지 대기 시간 |
|-----------|------------------------|
| 매일 | 24시간 |
| 주 3회 | 약 56시간 |
| 주 1회 | 168시간 |

### 6-5. 크론 일시 중지

**전역 설정** → **크론 & 자동화** → **자동 발행 크론** 토글 OFF.

또는 사이트별로: **사이트 설정** → **상태** → `일시정지`.

### 6-6. 외부 웹훅으로 수동 트리거

GitHub Actions, Zapier 등 외부 서비스에서 파이프라인을 직접 트리거할 수 있습니다.

**웹훅 시크릿 생성:**
1. **사이트 설정** → **웹훅 트리거** → **생성** 버튼
2. 시크릿 키 복사

**웹훅 요청:**
```bash
curl -X POST https://your-admin.vercel.app/api/webhook/travel-kr \
  -H "x-webhook-secret: your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 7. SEO 자동화

### 7-1. SEO 기본 설정

**사이트 상세** → **SEO** 탭:

| 설정 | 설명 |
|------|------|
| Canonical Domain | `travel-kr.com` (https 제외) |
| GA4 ID | `G-XXXXXXXXXX` |
| Search Console 인증 코드 | `google-site-verification=...` |
| IndexNow API Key | Bing 자동 색인용 |
| 타겟 키워드 | 글 생성 시 우선 반영 |

### 7-2. 자동 생성 SEO 파일

도메인 설정 후 아래 URL이 자동 생성됩니다 (SEO 탭에서 확인):

| 파일 | 엔드포인트 | 용도 |
|------|-----------|------|
| Sitemap | `/api/sites/{siteId}/sitemap` | Google 색인 |
| RSS Feed | `/api/sites/{siteId}/feed` | 구독자, 피드 리더 |
| llms.txt | `/api/sites/{siteId}/llms` | AI 크롤러 정보 |
| robots.txt | `/api/sites/{siteId}/robots` | 크롤러 제어 |

이 URL들을 **실제 사이트의 Next.js 라우트에 프록시**로 연결하세요:

```typescript
// 자식 사이트 (Next.js)의 app/sitemap.xml/route.ts
export async function GET() {
  const res = await fetch('https://your-admin.vercel.app/api/sites/travel-kr/sitemap');
  const xml = await res.text();
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### 7-3. Google Search Console 연동 (분석 데이터)

실제 GSC 클릭/노출 데이터를 분석 페이지에 표시하려면:

1. GSC에서 OAuth2 Access Token 발급
2. **사이트 설정** → **분석 연동 (GSC / GA4)**:
   - `GSC Access Token` 입력
   - `GA4 Property ID` 입력 (형식: `properties/123456789`)
   - `GA4 Access Token` 입력
3. 저장 → 다음 날 새벽 2시 크론이 자동 수집

> Access Token은 만료(1시간)되므로 장기 운영 시 Refresh Token 방식 구현 필요.

### 7-4. IndexNow (Bing 자동 색인)

SEO 탭에서 IndexNow API Key 입력 시, 글 발행마다 `https://api.indexnow.org`에 자동으로 색인 요청이 전송됩니다.

---

## 8. 뉴스레터 설정

### 8-1. Resend 계정 설정

1. [resend.com](https://resend.com) 회원가입
2. API Key 발급 → `.env.local`에 `RESEND_API_KEY` 입력
3. 발신 도메인 인증 (Resend 대시보드에서 DNS 설정)

### 8-2. 사이트별 뉴스레터 활성화

**사이트 설정** → **뉴스레터**:

- **주간 뉴스레터 발송 활성화** 토글 ON
- **발신자 이메일**: `Travel KR <newsletter@travel-kr.com>`

### 8-3. 공개 구독 페이지

독자가 구독할 수 있는 공개 URL:

```
https://your-admin.vercel.app/subscribe/travel-kr
```

이 URL을 자식 사이트 푸터, 사이드바 등에 링크로 추가하세요.

### 8-4. 구독자 관리

**뉴스레터** 메뉴 → 전체 사이트 구독자 현황 확인:

- 사이트별 구독자 수, 마지막 발송일
- **발송** 버튼: 해당 사이트 즉시 수동 발송 가능

### 8-5. 수신 거부 처리

이메일 하단의 "구독 해지" 링크 클릭 시:
```
https://your-admin.vercel.app/api/unsubscribe/travel-kr?email=reader@example.com
```
자동으로 구독 상태가 `unsubscribed`로 변경되고 확인 페이지로 리다이렉트됩니다.

### 8-6. 자동 뉴스레터 크론

매주 월요일 오전 9시(UTC)에 활성화된 모든 사이트에 자동 발송됩니다.

조건:
- 지난 7일 내 발행된 글이 1개 이상
- 활성 구독자가 1명 이상

---

## 9. 분석 및 모니터링

### 9-1. 대시보드 KPI

메인 대시보드에서 실시간 확인:

| 지표 | 설명 |
|------|------|
| 운영 사이트 | active 상태 사이트 수 |
| 총 발행 글 | 전체 published 글 수 |
| 오늘 발행 | 오늘 발행된 글 수 |
| 주간 트래픽 | 사이트별 weeklyTrafficEstimate 합산 |
| 이번달 AI 비용 | 이번달 1일부터 현재까지 사용액 |

### 9-2. 사이트별 분석

**사이트 상세** → **분석** 탭:

- 30일 클릭 / 노출 / 세션 / CTR
- 일별 클릭 추이 차트
- 일별 세션 바 차트
- **AI 주간 인사이트 리포트** 생성 버튼

### 9-3. AI 인사이트 리포트

최근 7일 트래픽 데이터를 기반으로 Claude Haiku가 분석 리포트를 한국어로 작성합니다.

```
[분석 결과 예시]
• 이번 주 클릭이 전주 대비 23% 증가했습니다.
• '제주도 맛집' 키워드가 가장 높은 CTR(8.2%)을 기록했습니다.
• 모바일 세션 비중이 67%로 모바일 UX 최적화가 중요합니다.
```

### 9-4. 헬스 모니터링

6시간마다 자동으로 각 사이트의 상태를 체크합니다:

- **정상** (초록): 최근 24시간 내 발행 성공
- **경고** (노란): 연속 실패 2회 이상
- **오류** (빨강): 연속 실패 5회 이상

알림은 **알림** 메뉴에서 확인. 이메일/Slack 알림은 **전역 설정**에서 설정.

### 9-5. 실패 작업 처리

**실패 작업** 메뉴:

- 실패 이유 확인 (에러 메시지 표시)
- **재시도**: 상태를 `approved`로 변경 → 다음 크론 틱에 재실행
- **닫기**: 해당 작업 영구 제외

---

## 10. AI 비용 관리

### 10-1. 비용 현황 확인

**비용** 메뉴:
- 월별 선택해 사이트별 비용 조회
- 입력/출력 토큰 수, USD 비용 확인

### 10-2. 모델별 단가

| 모델 | 입력 | 출력 | 캐시 읽기 |
|------|------|------|----------|
| Claude Opus 4.7 (Writer) | $15/M | $75/M | $3.75/M |
| Claude Sonnet 4.6 (Verifier/Editor) | $3/M | $15/M | $0.30/M |
| Claude Haiku 4.5 (리포트/요약) | $0.80/M | $4/M | $0.08/M |

**글 1편 평균 비용 (1500단어 기준):** 약 $0.05~$0.15

### 10-3. 비용 절감 팁

- **일일 최대 발행 글 수** 제한: **전역 설정** → `maxDailyPosts`
- Phase 1 완료 전 Phase 2로 넘어가지 않기 (아웃라인 활용 시 캐시 효율 높음)
- 섹션 발행 주기를 `주 3회` 또는 `주 1회`로 설정

---

## 11. 고급 설정

### 11-1. 사이트별 AI 프롬프트 오버라이드

**사이트 설정** → **AI 프롬프트 오버라이드**:

| 역할 | 기본 동작 | 오버라이드 예시 |
|------|----------|----------------|
| Writer | 1200~2000단어 SEO 글 | "반드시 각 섹션에 실제 통계를 인용하세요" |
| Verifier | 허위 출처 제거 | "한국어 언론사 출처는 신뢰할 수 있다고 가정하세요" |
| Editor | SEO 메타 최적화 | "metaTitle에 반드시 연도를 포함하세요" |
| Outline Generator | 28~42개 주제 생성 | "초보자 가이드 글을 최소 10개 포함하세요" |

비워두면 전역 기본값이 사용됩니다.

### 11-2. 글로벌 프롬프트 관리

**프롬프트** 메뉴: 역할별 프롬프트 버전 관리.

- 여러 버전 저장 후 `활성화` 버튼으로 전환
- A/B 테스트 용도로 활용

### 11-3. 페르소나 커스텀

**페르소나** 메뉴: AI 댓글 작성자 5명 관리.

글 발행 후 **글 상세 페이지** → **AI 댓글 생성** 버튼으로 가짜 독자 댓글을 생성할 수 있습니다.

### 11-4. AdSense 광고 자동 삽입

**사이트 설정** → **수익화 (AdSense)**:
- AdSense Client ID: `ca-pub-XXXXXXXXXXXXXXXXX`
- AdSense Slot ID: `XXXXXXXXXX`

활성화 시 AI Editor가 지정한 단락 위치에 `<ins class="adsbygoogle">` 태그를 자동 삽입합니다.

### 11-5. 콘텐츠 내보내기

**글 목록** 탭 → **CSV 내보내기** 버튼:

```
/api/sites/{siteId}/export?format=csv&status=published
```

Excel에서 바로 열 수 있는 UTF-8 BOM CSV로 다운로드됩니다.

### 11-6. 전역 검색

**글 검색** 메뉴 → 제목, 태그로 전체 사이트 글 통합 검색 (400ms 디바운스).

---

## 12. 트러블슈팅

### 크론이 실행되지 않는다

1. Vercel 대시보드 → **Functions** → cron 로그 확인
2. `CRON_SECRET`이 `.env.local`과 Vercel 환경 변수 양쪽에 동일하게 설정됐는지 확인
3. Vercel Free 플랜은 크론을 지원하지 않습니다 → Pro 플랜 필요

### 파이프라인이 계속 실패한다

**실패 작업** 메뉴에서 에러 메시지 확인:

| 에러 | 원인 | 해결 |
|------|------|------|
| `Duplicate detected` | 중복 콘텐츠 감지 | 아웃라인 항목 수정 후 재시도 |
| `No approved outline items` | 승인된 아웃라인 없음 | 아웃라인 탭에서 승인 처리 |
| `No RSS sources configured` | Phase 2인데 출처 없음 | 소스 탭에서 RSS 추가 |
| `JSON parse error` | AI 응답 형식 오류 | 자동 재시도로 해결되는 경우 많음 |

### 뉴스레터가 발송되지 않는다

1. `RESEND_API_KEY` 설정 확인
2. Resend 대시보드에서 발신 도메인 인증 완료 여부 확인
3. 활성 구독자가 있는지 확인 (사이트 상세 → 뉴스레터 관리)
4. 최근 7일 내 발행된 글이 있는지 확인

### 분석 데이터가 모두 0이다

GSC/GA4 Access Token 미설정 시 정상입니다 — 토큰이 없으면 스냅샷이 저장되지 않습니다.

실제 데이터를 수집하려면:
1. **사이트 설정** → **분석 연동 (GSC / GA4)** 에서 토큰 입력
2. `POST /api/analytics/snapshot` 수동 호출 또는 크론 자동 수집 대기

### 구독/수신거부 페이지가 로그인으로 리다이렉트된다

`middleware.ts`의 `PUBLIC_PREFIXES`에 해당 경로가 포함되어 있는지 확인:

```typescript
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/subscribe",
  "/unsubscribe",
  "/api/subscribe",
  "/api/unsubscribe",
  "/api/webhook",
  "/api/cron",
  "/api/health",
];
```

### Firebase Private Key 오류

Vercel 환경 변수에서 `FIREBASE_PRIVATE_KEY`를 입력할 때:

```
# 올바른 형식 (따옴표 포함)
"-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

또는 Vercel에서 "Plain Text" 모드로 전체 키를 붙여넣기합니다.

---

## 부록: 주요 API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/pipeline/authority` | Phase 1 글 생성 (수동) |
| `POST` | `/api/pipeline/generate` | Phase 2 글 생성 (수동) |
| `POST` | `/api/sites/{id}/outline` | 아웃라인 AI 생성 |
| `PATCH` | `/api/sites/{id}/outline` | 아웃라인 승인/거절 |
| `GET` | `/api/sites/{id}/export?format=csv` | 글 CSV 내보내기 |
| `POST` | `/api/sites/{id}/posts/{postId}/publish` | 특정 글 수동 발행 |
| `POST` | `/api/analytics/snapshot` | 트래픽 스냅샷 수동 수집 |
| `POST` | `/api/analytics/report` | AI 인사이트 리포트 생성 |
| `POST` | `/api/sites/{id}/newsletter/send` | 뉴스레터 수동 발송 |
| `GET` | `/api/unsubscribe/{id}?email=...` | 구독 해지 (이메일 링크용) |
| `POST` | `/api/webhook/{id}` | 외부 웹훅 트리거 |

---

*META-SITE v1.0 — Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 powered*
