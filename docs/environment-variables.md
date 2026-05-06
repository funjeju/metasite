# META-SITE: 환경변수 (environment-variables.md)

> 메타사이트 + 자식 사이트의 모든 환경변수의 명명 규칙, 전체 목록, 자동 주입 흐름, 시크릿 관리.
> 다른 모든 문서에서 언급된 환경변수의 단일 출처.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ vercel-cron-spec.md          (Cron)
  └─ environment-variables.md     ★ 이 문서 — 환경변수
        └─ deployment-guide.md         (다음)
```

이 문서는:
- 환경변수 명명 규칙 + 카테고리
- 메타사이트 + 자식 사이트별 환경변수 전체 목록
- 시크릿 vs 공개 변수 구분
- 자동 주입 흐름 (사이트 생성 시)
- 시크릿 로테이션 정책
- 누락 검증

---

## 1. 핵심 원칙

### 1.1 환경변수 vs 데이터베이스

> **"시크릿은 환경변수. 정책은 데이터베이스."**

| 환경변수에 저장할 것 | 데이터베이스에 저장할 것 |
|--------------------|------------------------|
| API 키 (Anthropic, Resend) | 사이트 정책 (광고 ON/OFF) |
| 토큰 (Tistory, Blogger SA) | 사이트 메타 (이름, 토픽) |
| 데이터베이스 자격증명 | 페르소나 / 출처 / 콘텐츠 |
| 인증 시크릿 | 통계 / 분석 |
| 도메인별 측정 ID | 큐 / 로그 |

이유:
- 시크릿은 코드에서 분리 (보안)
- 시크릿은 로그에 안 남음
- 정책은 어드민 UI에서 변경 (재배포 X)

### 1.2 명명 규칙

```
[프리픽스]_[카테고리]_[이름] = 값

예:
NEXT_PUBLIC_GA4_MEASUREMENT_ID    (자식 사이트, 클라이언트 노출)
ANTHROPIC_API_KEY                  (서버 전용)
TISTORY_TOKEN_AIKR                 (사이트별, AIKR 사이트의 Tistory 토큰)
BLOGGER_SA_AIENBLOG                (사이트별, base64 SA JSON)
```

### 1.3 NEXT_PUBLIC_ 프리픽스 규칙

> **"클라이언트 코드에 노출되는 변수만 `NEXT_PUBLIC_` 프리픽스."**

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` ✅ (브라우저 GA4 스크립트)
- `NEXT_PUBLIC_ADSENSE_ID` ✅ (브라우저 AdSense 스크립트)
- `NEXT_PUBLIC_INDEXNOW_KEY` ❌ (이건 서버 전용 — 잘못된 예)
- `ANTHROPIC_API_KEY` ❌ (절대 NEXT_PUBLIC_ 붙이면 안 됨)

### 1.4 사이트별 환경변수 명명

```
{서비스}_{필드}_{사이트ID 대문자_언더스코어}

예시:
TISTORY_TOKEN_AI_KR              ai-kr 사이트의 Tistory 토큰
BLOGGER_SA_AI_EN_BLOG            ai-en-blog 사이트의 Service Account
```

slug의 하이픈은 언더스코어로 변환:
```typescript
function siteIdToEnvSuffix(siteId: string): string {
  return siteId.toUpperCase().replace(/-/g, '_')
}
// 'ai-en-blog' → 'AI_EN_BLOG'
```

---

## 2. 메타사이트 환경변수

메타사이트(어드민 + 모든 자동화 로직) Vercel project에 등록.

### 2.1 인증 + 시크릿

```bash
# Cron 인증
CRON_SECRET=<random-32-bytes>          # 모든 /api/cron/* 인증

# 어드민 인증 (Firebase Auth)
NEXTAUTH_SECRET=<random-32-bytes>       # NextAuth 세션 서명
NEXTAUTH_URL=https://meta.example.com   # 어드민 URL
ADMIN_EMAILS=admin@example.com,co-admin@example.com  # ,로 구분
```

### 2.2 Firebase / Firestore

```bash
# Firebase Admin SDK (서버)
FIREBASE_PROJECT_ID=meta-site-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@meta-site-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."  # \n 포함

# Firebase Auth (클라이언트, 어드민 로그인용)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=meta-site-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=meta-site-prod
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxx:web:xxx
```

### 2.3 AI 서비스

```bash
# Anthropic (Writer + Editor)
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI (Verifier + Embeddings)
OPENAI_API_KEY=sk-xxx
OPENAI_ORG_ID=org-xxx                  # 선택

# Google AI (Gemini, Verifier 폴백)
GOOGLE_AI_API_KEY=AIza...

# 임베딩 폴백 (선택)
VOYAGE_API_KEY=pa-xxx
COHERE_API_KEY=xxx
```

### 2.4 검색 + 외부 데이터

```bash
# 검증자가 사용하는 검색 API
TAVILY_API_KEY=tvly-xxx
PERPLEXITY_API_KEY=pplx-xxx

# YouTube Data API (Scout 단계)
YOUTUBE_API_KEY=AIza...

# Vercel API (자식 사이트 자동 생성)
VERCEL_API_TOKEN=xxx
VERCEL_TEAM_ID=team_xxx                # 선택, 팀 사용 시
```

### 2.5 발행 어댑터 (메타가 보유)

자식 사이트별 토큰은 사이트 단위. 명명: `{SERVICE}_{FIELD}_{SITE_ID}`.

```bash
# Tistory (사이트별)
TISTORY_TOKEN_AI_KR=xxx
TISTORY_TOKEN_TRAVEL_KR=xxx
TISTORY_TOKEN_AI_EN_TIST=xxx

# Blogger Service Account JSON (사이트별, base64 인코딩)
BLOGGER_SA_AI_EN_BLOG=eyJ0eXBlIjoi...
```

자식 사이트가 늘어날수록 변수 늘어남. 100개 한계 도달 시 → DB(외부 vault)로 이동 검토.

### 2.6 SEO + 분석

```bash
# Google Service Account (GSC + GA4 자동 등록)
GOOGLE_SA_EMAIL=meta-site-sa@xxx.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# 메타사이트 자체의 GSC/GA4 (선택, 어드민 통계용)
NEXT_PUBLIC_META_GA4_ID=G-xxx
```

### 2.7 이메일

```bash
# Resend (또는 SES 선택)
RESEND_API_KEY=re_xxx

# 또는 AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKI...
AWS_SECRET_ACCESS_KEY=xxx
AWS_SES_FROM_DOMAIN=mail.example.com   # 검증된 도메인
```

### 2.8 알림 채널

```bash
# Slack (메타 운영자 채널)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
SLACK_CHANNEL=#meta-alerts             # 선택

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/.../...

# Email 발송 (알림용, 위 RESEND/SES 재사용)
ALERT_EMAIL_FROM=alerts@example.com
ALERT_EMAIL_TO=admin@example.com,co-admin@example.com
```

### 2.9 자식 사이트와의 통신

```bash
# 자식 사이트 ISR revalidation 토큰
INTERNAL_REVALIDATION_TOKEN=<random-32-bytes>
# 메타가 자식 사이트에 새 글 발행 알릴 때 인증
```

### 2.10 모니터링 (선택)

```bash
# Sentry (에러 추적)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Better Stack (로그 수집)
BETTERSTACK_LOGS_TOKEN=xxx
```

### 2.11 환경 구분

```bash
NODE_ENV=production                    # 자동 (Vercel)
NEXT_PUBLIC_APP_ENV=production         # development / staging / production
```

---

## 3. 자식 사이트 환경변수

각 자식 사이트가 자체 Vercel project. 사이트 생성 시 메타가 자동 주입.

### 3.1 사이트 정체성

```bash
SITE_ID=ai-kr                          # 자식 사이트 식별자
NEXT_PUBLIC_SITE_NAME=AI 매거진 KR     # 표시명
NEXT_PUBLIC_SITE_DOMAIN=ai-kr.com      # 도메인
NEXT_PUBLIC_SITE_LANGUAGE=ko
```

### 3.2 Firebase (자식 사이트가 직접 읽음)

```bash
# 자식 사이트는 메타와 같은 Firebase project 공유
FIREBASE_PROJECT_ID=meta-site-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 3.3 메타와의 통신

```bash
# 메타로의 콜백 (선택)
META_API_URL=https://meta.example.com
INTERNAL_REVALIDATION_TOKEN=<same-as-meta>  # 메타와 동일 토큰
```

### 3.4 분석 + 광고 (클라이언트)

```bash
# Google Analytics 4 (사이트 생성 시 자동 발급)
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-xxxxxxxxxx

# AdSense (운영자 수동 입력 후 자동 주입)
NEXT_PUBLIC_ADSENSE_ID=ca-pub-xxx

# IndexNow (사이트 생성 시 자동 발급)
INDEXNOW_KEY=<random-32-hex>
```

### 3.5 검색 / reCAPTCHA

```bash
# 사이트 검색 API에서 임베딩 필요 시
OPENAI_API_KEY=sk-xxx                  # 메타와 동일

# reCAPTCHA (뉴스레터 가입 등)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx
```

### 3.6 뉴스레터 발송

자식 사이트가 직접 발송하지 않음 (메타가 발송). 따라서 자식 사이트에는 Resend/SES 키 X.

단 자식 사이트가 가입 폼 처리 + 확인 메일 발송:

```bash
RESEND_API_KEY=re_xxx                  # 메타와 동일
NEWSLETTER_FROM_EMAIL=newsletter@ai-kr.com
```

### 3.7 환경 구분

```bash
NODE_ENV=production
NEXT_PUBLIC_VERCEL_ENV=production
```

---

## 4. 시크릿 vs 공개 변수

### 4.1 시크릿 (절대 클라이언트 노출 X)

```
ANTHROPIC_API_KEY
OPENAI_API_KEY
GOOGLE_AI_API_KEY
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
GOOGLE_SA_PRIVATE_KEY
TISTORY_TOKEN_*
BLOGGER_SA_*
RESEND_API_KEY
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL
DISCORD_WEBHOOK_URL
CRON_SECRET
NEXTAUTH_SECRET
INTERNAL_REVALIDATION_TOKEN
RECAPTCHA_SECRET_KEY
SENTRY_DSN
INDEXNOW_KEY
VERCEL_API_TOKEN
TAVILY_API_KEY
PERPLEXITY_API_KEY
YOUTUBE_API_KEY
```

> **`NEXT_PUBLIC_` 프리픽스가 없으면 모두 시크릿.** 빌드 시 클라이언트 번들에 포함 안 됨.

### 4.2 공개 변수 (클라이언트 가능)

```
NEXT_PUBLIC_FIREBASE_API_KEY        # 클라이언트 SDK용 (도메인 제한된 키)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GA4_MEASUREMENT_ID      # 공개 추적 ID
NEXT_PUBLIC_ADSENSE_ID              # 공개 publisher ID
NEXT_PUBLIC_RECAPTCHA_SITE_KEY      # 공개 site key
NEXT_PUBLIC_SITE_NAME
NEXT_PUBLIC_SITE_DOMAIN
NEXT_PUBLIC_SITE_LANGUAGE
NEXT_PUBLIC_APP_ENV
```

`NEXT_PUBLIC_FIREBASE_API_KEY`는 공개 키지만 **반드시 도메인 제한** 설정 (Firebase 콘솔에서 HTTP Referrer 허용 도메인). 그렇지 않으면 다른 사이트가 우리 키로 Firestore 접근.

---

## 5. 자동 주입 흐름

### 5.1 메타사이트 환경변수 셋업 (1회)

운영자가 Vercel 대시보드에서 직접 입력. `meta-site` project의 Settings → Environment Variables.

또는 CLI:

```bash
vercel env add ANTHROPIC_API_KEY production
# 값 입력 prompt
```

### 5.2 자식 사이트 환경변수 자동 주입

site-creation-flow.md "Step 2: 호스팅 셋업"의 일부:

```typescript
// lib/site-creation/setup-env-vars.ts

export async function setupEnvironmentVarsForChildSite(
  site: ChildSite,
): Promise<void> {
  if (site.hostingType !== 'nextjs') return  // 외부 호스팅은 X
  
  const projectId = site.hostingConfig.vercelProjectId
  const baseEnv = await getMetaEnvVars()      // 메타와 공유할 환경변수
  
  const envVars: Record<string, string> = {
    // 사이트 정체성
    SITE_ID: site.siteId,
    NEXT_PUBLIC_SITE_NAME: site.name,
    NEXT_PUBLIC_SITE_DOMAIN: site.hostingConfig.domain!,
    NEXT_PUBLIC_SITE_LANGUAGE: site.language,
    
    // Firebase (메타와 공유)
    FIREBASE_PROJECT_ID: baseEnv.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: baseEnv.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: baseEnv.FIREBASE_PRIVATE_KEY,
    
    // 메타와 통신
    META_API_URL: process.env.NEXTAUTH_URL!,
    INTERNAL_REVALIDATION_TOKEN: baseEnv.INTERNAL_REVALIDATION_TOKEN,
    
    // 검색 (메타와 공유)
    OPENAI_API_KEY: baseEnv.OPENAI_API_KEY,
    
    // reCAPTCHA (사이트별 발급)
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: await generateRecaptchaForSite(site.hostingConfig.domain!),
    RECAPTCHA_SECRET_KEY: await getRecaptchaSecretForSite(site.hostingConfig.domain!),
    
    // 뉴스레터
    RESEND_API_KEY: baseEnv.RESEND_API_KEY,
    NEWSLETTER_FROM_EMAIL: `newsletter@${site.hostingConfig.domain}`,
    
    // IndexNow (사이트별 자동 발급)
    INDEXNOW_KEY: generateIndexNowKey(),
    
    // 환경
    NODE_ENV: 'production',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  }
  
  // Vercel API로 환경변수 일괄 등록
  for (const [key, value] of Object.entries(envVars)) {
    await vercel.env.set({
      projectId,
      key,
      value,
      target: ['production'],            // production만
      type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
    })
  }
  
  // GA4는 비동기 (analytics-integration.md 3.1)
  // GA4 등록 완료 후 NEXT_PUBLIC_GA4_MEASUREMENT_ID 별도 주입
  
  // AdSense는 운영자가 수동 입력 후 주입
  // → /sites/{id}/monetization에서 publisherID 입력 시 트리거
}
```

### 5.3 호스팅 토큰 메타에 주입

Tistory/Blogger 사이트 생성 시 토큰을 **메타사이트 환경변수**에 추가 (자식 사이트 X):

```typescript
async function injectHostingTokenToMeta(site: ChildSite, token: string) {
  const envSuffix = siteIdToEnvSuffix(site.siteId)
  const envKey = site.hostingType === 'tistory'
    ? `TISTORY_TOKEN_${envSuffix}`
    : `BLOGGER_SA_${envSuffix}`
  
  const value = site.hostingType === 'blogger'
    ? Buffer.from(token).toString('base64')
    : token
  
  // 메타사이트 project에 등록
  const META_PROJECT_ID = process.env.META_VERCEL_PROJECT_ID!
  await vercel.env.set({
    projectId: META_PROJECT_ID,
    key: envKey,
    value,
    target: ['production'],
    type: 'encrypted',
  })
  
  // 메타 재배포 트리거 (새 환경변수 적용)
  await vercel.deployments.create({ projectId: META_PROJECT_ID })
}
```

### 5.4 GA4 + AdSense 후 주입

GA4는 사이트 생성 직후 비동기 등록. 등록 완료 후 환경변수 추가 + 재배포:

```typescript
async function injectGa4ToChildSite(site: ChildSite, measurementId: string) {
  await vercel.env.set({
    projectId: site.hostingConfig.vercelProjectId,
    key: 'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
    value: measurementId,
    target: ['production'],
    type: 'plain',
  })
  
  // 자식 사이트 재배포 (NEXT_PUBLIC_ 변수는 빌드 타임 inline)
  await vercel.deployments.create({ projectId: site.hostingConfig.vercelProjectId })
}
```

---

## 6. 시크릿 로테이션

### 6.1 로테이션이 필요한 시크릿

```
ANTHROPIC_API_KEY            (분기 1회 권장)
OPENAI_API_KEY               (분기 1회)
TISTORY_TOKEN_*              (만료 자동 — Tistory가 정함)
BLOGGER_SA_*                 (분기 1회 또는 보안 사고 시)
CRON_SECRET                  (연 1회)
INTERNAL_REVALIDATION_TOKEN  (연 1회)
NEXTAUTH_SECRET              (연 1회)
RESEND_API_KEY               (연 1회)
```

### 6.2 안전한 로테이션 절차

> **"새 키 추가 → 양쪽 동작 확인 → 옛 키 제거."**

```typescript
// 예시: ANTHROPIC_API_KEY 로테이션

// 1단계: 새 키 발급 (Anthropic 대시보드)

// 2단계: 환경변수에 새 키 추가 (서비스마다)
//        ANTHROPIC_API_KEY_NEW로 명명
ANTHROPIC_API_KEY=sk-ant-OLD-...
ANTHROPIC_API_KEY_NEW=sk-ant-NEW-...

// 3단계: 코드 수정 — 새 키 우선 + 폴백
function getApiKey() {
  return process.env.ANTHROPIC_API_KEY_NEW || process.env.ANTHROPIC_API_KEY
}

// 4단계: 배포 후 며칠간 동작 확인

// 5단계: 옛 키 비활성화 (Anthropic 대시보드)

// 6단계: 환경변수 갱신
ANTHROPIC_API_KEY=sk-ant-NEW-...
# ANTHROPIC_API_KEY_NEW 제거

// 7단계: 코드 단순화
function getApiKey() {
  return process.env.ANTHROPIC_API_KEY
}
```

### 6.3 Tistory 토큰 자동 갱신

Tistory access_token은 만료. 자동 갱신:

```typescript
async function refreshTistoryTokenIfNeeded(siteId: string) {
  const validation = await validateTistoryToken(siteId)
  
  if (!validation.valid && validation.error === 'token_expired') {
    // 운영자 재인증 필요 알림 (자동 갱신 불가능 — Tistory OAuth 제약)
    await createAlert({
      severity: 'high',
      category: 'health',
      siteId,
      title: `Tistory 토큰 만료: ${siteId}`,
      message: '/sites/{id}/hosting에서 토큰 재발급 필요',
    })
  }
}
```

---

## 7. 환경변수 검증

### 7.1 부팅 시 검증

```typescript
// lib/env-validate.ts (서버 시작 시)

const REQUIRED_META_ENV = [
  'CRON_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'ADMIN_EMAILS',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'YOUTUBE_API_KEY',
  'VERCEL_API_TOKEN',
  'INTERNAL_REVALIDATION_TOKEN',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
]

export function validateMetaEnv() {
  const missing: string[] = []
  
  for (const key of REQUIRED_META_ENV) {
    if (!process.env[key]) missing.push(key)
  }
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

// app/layout.tsx 또는 middleware.ts에서 호출
validateMetaEnv()
```

### 7.2 자식 사이트 검증

```typescript
const REQUIRED_CHILD_ENV = [
  'SITE_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'INTERNAL_REVALIDATION_TOKEN',
  'NEXT_PUBLIC_SITE_NAME',
  'NEXT_PUBLIC_SITE_DOMAIN',
  'NEXT_PUBLIC_SITE_LANGUAGE',
]

export function validateChildEnv() {
  const missing: string[] = []
  for (const key of REQUIRED_CHILD_ENV) {
    if (!process.env[key]) missing.push(key)
  }
  
  if (missing.length > 0) {
    throw new Error(`Child site env vars missing: ${missing.join(', ')}`)
  }
}
```

### 7.3 어드민에서 검증 표시

`/sites/{id}` 사이트 개요에 환경변수 상태:

```
환경변수 상태
─────────────
✅ Firebase 자격증명
✅ 메타 통신 토큰
✅ Google Analytics 4: G-XXXXXXXXXX
✅ AdSense: ca-pub-XXXXXXXXXXXX
✅ IndexNow 키
⚠ AdSense 슬롯 매핑 미설정 (광고 슬롯 7개 중 0개)
   → /sites/{id}/monetization에서 설정
```

---

## 8. .env.example 파일

레포 루트에 `.env.example` (실제 값 X, 키만):

```bash
# .env.example — 메타사이트

# === 인증 ===
CRON_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://meta.example.com
ADMIN_EMAILS=admin@example.com

# === Firebase ===
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# === AI ===
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
VOYAGE_API_KEY=
COHERE_API_KEY=

# === 외부 데이터 ===
TAVILY_API_KEY=
PERPLEXITY_API_KEY=
YOUTUBE_API_KEY=

# === Vercel + 호스팅 ===
VERCEL_API_TOKEN=
VERCEL_TEAM_ID=

# === 호스팅 토큰 (사이트마다 추가) ===
# TISTORY_TOKEN_AI_KR=
# BLOGGER_SA_AI_EN_BLOG=

# === Google 자동 등록 ===
GOOGLE_SA_EMAIL=
GOOGLE_SA_PRIVATE_KEY=

# === 이메일 ===
RESEND_API_KEY=

# === 알림 ===
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
ALERT_EMAIL_FROM=
ALERT_EMAIL_TO=

# === 자식 사이트 통신 ===
INTERNAL_REVALIDATION_TOKEN=

# === 환경 ===
NEXT_PUBLIC_APP_ENV=production
META_VERCEL_PROJECT_ID=

# === 모니터링 (선택) ===
SENTRY_DSN=
```

배포 시 `.env.example` 참조 + `vercel env`로 실제 값 등록.

---

## 9. 시크릿 보안 체크리스트

### 9.1 절대 하면 안 되는 것

- ❌ `.env`를 git commit
- ❌ 시크릿을 Slack/Discord/Email에 평문 전송
- ❌ 로그에 시크릿 출력
- ❌ 프론트엔드 코드에서 시크릿 참조
- ❌ `NEXT_PUBLIC_` 붙여서 시크릿 노출
- ❌ 시크릿을 클라이언트 응답에 포함
- ❌ 같은 시크릿을 dev / prod 공유

### 9.2 .gitignore

```
.env
.env.local
.env.*.local
.env.production
```

`.env.example`만 commit. 실제 값은 Vercel 대시보드 또는 CLI로.

### 9.3 로그 마스킹

```typescript
function safeLog(obj: any) {
  const masked = JSON.parse(JSON.stringify(obj))
  
  for (const key in masked) {
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD')) {
      masked[key] = masked[key] ? `***${masked[key].slice(-4)}` : null
    }
  }
  
  console.log(masked)
}
```

### 9.4 에러 응답 정리

```typescript
// ❌ 나쁜 예
catch (err) {
  return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
}

// ✅ 좋은 예
catch (err) {
  console.error('Internal error:', err)              // 서버에만 로그
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

## 10. 환경변수 양 추정

### 10.1 메타사이트

```
인증 + Firebase: ~10개
AI 서비스: ~5개
검색 + 외부: ~5개
Vercel: ~2개
SEO: ~2개
이메일: ~2개
알림: ~5개
공개 (NEXT_PUBLIC_): ~5개
환경: ~2개

총 ~38개 (정적)

+ 호스팅 토큰 사이트별 (TISTORY_TOKEN_X / BLOGGER_SA_X)
  자식 사이트 6개 = ~6개 추가
  
총 ~44개
```

### 10.2 자식 사이트

```
사이트 정체성: ~5개
Firebase: ~3개
메타 통신: ~2개
분석/광고: ~3개
검색: ~1개
reCAPTCHA: ~2개
뉴스레터: ~2개
IndexNow: ~1개
환경: ~2개

총 ~21개
```

Vercel은 project당 환경변수 한도 충분히 여유.

---

## 11. 사이트별 변수 사용 vs 시크릿 매니저

### 11.1 현재 (사이트 < 30개)

각 자식 사이트 토큰을 메타사이트 Vercel env에 등록.

```
TISTORY_TOKEN_AI_KR
TISTORY_TOKEN_TRAVEL_KR
TISTORY_TOKEN_TRAVEL_EN
BLOGGER_SA_AI_EN_BLOG
BLOGGER_SA_FINANCE_EN
...
```

### 11.2 미래 (사이트 30+ 시)

Vercel env 100개 한계 도달 가능. 외부 시크릿 매니저로 이동:

- **Doppler** ($7/월/사용자)
- **HashiCorp Vault** (자체 호스팅)
- **AWS Secrets Manager** ($0.40/secret/월)
- **Google Secret Manager** ($0.06/secret/월) — Firebase 친화

마이그레이션 시:

```typescript
// lib/secrets-manager.ts
class SecretsManager {
  async getSecret(siteId: string, type: 'tistory' | 'blogger'): Promise<string> {
    if (process.env.USE_SECRETS_MANAGER === 'true') {
      return await this.fetchFromGcp(siteId, type)
    }
    
    // 폴백: 환경변수
    const envSuffix = siteIdToEnvSuffix(siteId)
    const envKey = `${type.toUpperCase()}_TOKEN_${envSuffix}`
    return process.env[envKey] || ''
  }
}
```

코드는 추상화 통해 사용. 마이그레이션 시 USE_SECRETS_MANAGER만 켜면 됨.

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 환경변수 vs DB 분리 원칙
- ✅ NEXT_PUBLIC_ 프리픽스 규칙
- ✅ 사이트별 변수 명명 규칙 ({SERVICE}_{FIELD}_{SITE_ID})
- ✅ 메타사이트 환경변수 전체 목록 (~44개)
- ✅ 자식 사이트 환경변수 전체 목록 (~21개)
- ✅ 시크릿 vs 공개 변수 구분
- ✅ 자동 주입 흐름 (사이트 생성 시)
- ✅ 호스팅 토큰을 메타에 주입 (Tistory/Blogger)
- ✅ GA4/AdSense 후 주입 패턴
- ✅ 시크릿 로테이션 (분기 / 연 단위)
- ✅ Tistory 토큰 만료 자동 알림
- ✅ 부팅 시 검증 (REQUIRED_*_ENV)
- ✅ .env.example 템플릿
- ✅ 보안 체크리스트
- ✅ 미래 시크릿 매니저 마이그레이션 추상화

이 문서가 정의하지 않은 것:
- ❌ 자식 사이트 배포 자체 → `deployment-guide.md`
- ❌ 검증 체크리스트 → `testing-checklist.md`
- ❌ 쏙튜브 마이그레이션 → `ssoktube-migration.md`

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 다른 문서의 환경변수 통합. |

---

*이 문서는 메타사이트의 환경변수 단일 출처다. 모든 키 명명 규칙, 자동 주입 흐름, 시크릿 관리 정책을 담고 있다.*

*다음 문서: `deployment-guide.md` (Tier F 3번)*
