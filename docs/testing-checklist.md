# META-SITE: 검증 체크리스트 (testing-checklist.md)

> 메타사이트 첫 셋업 → 자식 사이트 생성 → Phase 1 완료 → Phase 2 운영의 각 단계에서 무엇을 어떻게 검증하는지 체크리스트.
> 운영자가 직접 따라가는 절차서 + 자동 검증 시스템의 통합.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ deployment-guide.md         (배포)
  └─ testing-checklist.md        ★ 이 문서 — 검증
        └─ ssoktube-migration.md      (다음 — 마지막)
```

이 문서는:
- 메타사이트 첫 배포 검증 (1회)
- 자식 사이트 생성 후 검증 (사이트마다)
- Phase 1 완료 검증 (Phase 2 전환 전)
- Phase 2 운영 검증 (정기)
- 자동 검증 vs 수동 검증 분리
- 실패 시 디버깅 가이드

---

## 1. 핵심 원칙

### 1.1 자동 + 수동 분리

> **"기계적 검증은 자동, 의미 있는 판단은 운영자."**

| 자동 검증 | 수동 검증 |
|----------|----------|
| API 응답 200 | 글의 톤/품질 |
| DB 컬렉션 존재 | 페르소나가 자연스러운지 |
| 환경변수 누락 | 사용자 경험 |
| Cron 트리거됐는지 | 실제 콘텐츠가 의도대로인지 |

### 1.2 단계별 게이트 (Gate)

```
Phase 0 → Phase 1: 메타 정상 작동 게이트
Phase 1 → Phase 2: 권위 트리 + Pillar 게이트
Phase 2 → 안정 운영: 일일 발행 안정성 게이트
```

각 게이트 통과 못 하면 다음 단계 X.

### 1.3 체크리스트는 검수 문서

이 문서의 체크리스트는:
- 운영자가 매번 보면서 확인
- 어드민 UI에 일부 자동 반영 (체크박스 자동 표시)
- 새 자식 사이트마다 반복

---

## 2. Phase 0 → Phase 1: 메타사이트 첫 배포 검증

deployment-guide.md "Phase 1 — 메타사이트 배포" 후 검증.

### 2.1 인프라

```
□ Firebase project 활성화됐는가
   → console.firebase.google.com에서 확인
   
□ Firestore Rules 배포됐는가
   → firebase deploy 결과 확인
   → 콘솔 → Firestore → Rules 탭에서 마지막 배포 시간

□ Firestore 인덱스 생성됐는가
   → 콘솔 → Firestore → Indexes 탭
   → 모든 인덱스 status='Enabled'
   
□ Service Account JSON 안전 보관
   → 1Password / Bitwarden 등에 백업
   → 이메일/Slack에 평문 X

□ Vercel Pro 결제 활성화
   → Vercel 대시보드 → Settings → Billing
```

### 2.2 환경변수

`environment-variables.md` 7.1의 검증 함수가 자동 실행. 수동 확인:

```
□ vercel env ls production 출력 확인
□ ~44개 환경변수 모두 등록됐는가
□ NEXT_PUBLIC_ 프리픽스 변수만 클라이언트 노출 확인
□ ANTHROPIC_API_KEY 등 시크릿이 클라이언트 번들에 안 들어갔는지
   → Chrome DevTools → Sources → 검색 "sk-ant"
```

### 2.3 첫 배포 응답

```
□ https://meta.example.com 응답 200
□ /api/health endpoint → { firebase: true, ai: true }
□ /admin 로그인 페이지 표시
□ ADMIN_EMAILS 이메일로 로그인 성공
□ 로그인 후 /sites 빈 리스트 표시 (자식 사이트 0개)
```

### 2.4 외부 의존 확인

```
□ Slack webhook 테스트 발송
   → /admin → 설정 → 알림 → [테스트 알림] 버튼
   → Slack 채널에 메시지 도착

□ Discord webhook 테스트 발송 (선택)

□ Email 테스트 발송 (Resend / SES)
   → 본인 이메일에 도착

□ AI API 응답
   → 어드민 → AI 헬스체크 또는
   → 콘솔에서 첫 cron 실행 후 magazine_logs 확인
```

### 2.5 첫 Cron 실행 (5분 후)

```
□ /api/cron/health-check-external 자동 트리거됨
   → vercel logs 확인
   → 또는 어드민 → /cron-status (있으면)

□ cron_executions 컬렉션에 첫 row 생성
   → Firestore 콘솔 확인
```

### 2.6 게이트: Phase 1 진입 가능?

다음 조건 모두 충족 시 자식 사이트 생성 가능:

```
✅ 메타사이트 24시간 정상 작동 (재시작 없이)
✅ 모든 정적 Cron 1회 이상 성공 실행
✅ Firebase / AI API / Vercel API 응답 정상
✅ 알림 채널 검증 완료
✅ 어드민 페이지 모두 접근 가능
```

---

## 3. 자식 사이트 생성 후 검증

site-creation-flow.md의 6단계 마법사 + 7단계 자동 셋업 후.

### 3.1 자동 검증 (즉시)

site-creation-flow.md의 트랜잭션이 끝나면 다음이 자동:

```
✅ child_sites/{siteId} 문서 생성
✅ sites/{siteId}/settings/* 문서 생성 (curation, seo, monetization)
✅ sites/{siteId}/personas/persona_default 생성
✅ sites/{siteId}/sources/* 출처 등록
```

자동 검증 함수:

```typescript
async function validateSiteCreated(siteId: string): Promise<ValidationReport> {
  const checks = {
    childSitesDoc: false,
    settingsCuration: false,
    settingsSeo: false,
    settingsMonetization: false,
    personasCount: 0,
    sourcesCount: 0,
    vercelProjectId: false,
    domainVerified: false,
    envVarsInjected: false,
  }
  
  const site = await db.collection('child_sites').doc(siteId).get()
  checks.childSitesDoc = site.exists
  
  // 모든 체크 후 결과 반환
  return checks
}
```

### 3.2 도메인 응답 검증 (Next.js 사이트만)

```
□ https://{domain}/ → 200
□ https://{domain}/about → 200 (정적 페이지 자동 생성)
□ https://{domain}/privacy → 200
□ https://{domain}/contact → 200
□ HTTPS 인증서 자동 발급됐는가 (Vercel auto-SSL)
```

자동 체크 (Cron):

```typescript
async function checkDomainHealth(site: ChildSite) {
  if (site.hostingType !== 'nextjs') return
  
  const baseUrl = `https://${site.hostingConfig.domain}`
  
  const checks = await Promise.allSettled([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/about`),
    fetch(`${baseUrl}/privacy`),
    fetch(`${baseUrl}/contact`),
  ])
  
  const allOk = checks.every(c => c.status === 'fulfilled' && (c.value as Response).ok)
  return { healthy: allOk, checks }
}
```

### 3.3 SEO 인프라 검증

```
□ /llms.txt 응답 200 + 사이트 정보 포함
□ /sitemap.xml 응답 200 + 정적 페이지 3개 + Pillar 후보 (Phase 2 시작 시)
□ /rss.xml 응답 200
□ /robots.txt 응답 200 + AI 크롤러 허용 명시
□ /{indexNowKey}.txt 응답 200 + 키 매칭
```

### 3.4 분석 통합 검증

```
□ Search Console property 자동 등록됐는가
   → console.cloud.google.com → Search Console → 사이트 목록
   → child_sites.seoConfig.searchConsoleVerified=true

□ GA4 Property 자동 생성됐는가
   → GA4 대시보드에서 사이트명 확인
   → child_sites.analytics.ga4MeasurementId 존재

□ AdSense 등록 (수동)
   → 운영자가 AdSense 신청 후 publisherID 입력 (settings/monetization)
```

### 3.5 Phase 1 시작 검증

Phase 1 사이트라면 (대부분):

```
□ authority_outline/outline_{siteId}_v1 생성됨
□ outline.status='awaiting_approval'
□ 운영자에게 'review_request' 알림 발송됨
□ /sites/{id}/outline 페이지 접근 가능
```

운영자가 outline 검토 → 승인 → Phase 1 발행 시작.

### 3.6 Phase 2 직진 검증

Phase 2 즉시 시작 사이트라면:

```
□ 섹션 Cron 등록됐는가 (vercel.json 또는 dispatcher)
□ child_sites.currentPhase='ongoing'
□ child_sites.status='active'
□ 첫 섹션 Cron 트리거 시간 확인 (다음 schedule)
```

### 3.7 호스팅별 차이

#### Tistory 사이트
```
□ TISTORY_TOKEN_{SITE_ID} 메타 환경변수에 등록됐는가
□ 토큰 검증 성공 (validateTistoryToken)
□ 카테고리 리스트 fetch 가능
```

#### Blogger 사이트
```
□ BLOGGER_SA_{SITE_ID} 메타 환경변수에 등록됐는가
□ Service Account로 blogs.get 호출 성공
□ Blog 정보 fetch 가능
```

### 3.8 수동 검증 (운영자 직접)

```
□ 자식 사이트 디자인이 의도대로인가 (브라우저로 직접 확인)
□ 페르소나가 자연스러운가 (생성된 캐릭터 검토)
□ 출처 풀이 적절한가 (관련 있는 출처들인가)
□ Phase 1 권위 트리 목차가 의미 있는가 (28편 제목 검토)
```

---

## 4. Phase 1 완료 → Phase 2 전환 검증

authority-building.md 7장 전환 조건. 운영자가 [Phase 2로 전환] 버튼 누르기 전:

### 4.1 자동 검증

```
□ outline.progress.articlesPublished >= totalArticles * 0.95
□ outline.pillarPage.actualPostId 존재 (Pillar 생성됨)
□ outline.progress.articlesFailed < totalArticles * 0.1 (실패율 10% 미만)
```

### 4.2 콘텐츠 품질 검증 (수동)

```
□ Tier 1 글 10편 모두 발행 완료, 품질 OK
□ Tier 2 글들이 Tier 1 글로 자연스럽게 링크
□ Tier 3 글들이 Tier 1 + 2 모두 참조
□ Pillar Page에 28편 모두 통합됨
□ Pillar Page 가독성 + 흐름 OK
```

운영자가 어드민 `/sites/{id}/outline`에서 사이드패널로 글 목록 미리보기.

### 4.3 SEO 검증

```
□ Google Search Console에 28편 모두 색인됨 (또는 90%+)
□ 평균 순위 (28편 평균) 50 이내
□ 사이트의 토픽 검색어 1개 이상에서 노출 발생
□ /llms.txt에 모든 권위 글 + Pillar 등재
□ Pillar Page sitemap.xml priority 1.0
```

### 4.4 권위 그물 검증

```
□ 모든 Tier 1 글이 incoming link 받음 (orphan X)
□ Tier 2 글들 평균 incoming link 3+
□ Pillar Page에서 모든 권위 글로 outgoing link
□ 깨진 내부 링크 0건 (또는 자동 보수됨)
```

자동 체크:

```typescript
async function checkAuthorityNetwork(siteId: string) {
  const allAuthorityPosts = await getPublishedAuthorityPosts(siteId)
  const orphans: string[] = []
  
  for (const post of allAuthorityPosts) {
    const incoming = await countIncomingLinks(siteId, post.postId)
    if (incoming === 0) orphans.push(post.postId)
  }
  
  return {
    totalArticles: allAuthorityPosts.length,
    orphanCount: orphans.length,
    averageIncoming: averageOf(allAuthorityPosts, p => p.incomingLinkCount),
  }
}
```

### 4.5 Phase 1 완료 게이트

자동 + 수동 모두 통과 → 운영자가 [Phase 2로 전환] 클릭:

```
✅ 자동 검증 모두 통과
✅ 운영자 콘텐츠 품질 검토 완료
✅ SEO 색인 진행
✅ 권위 그물 정상 (orphan 없음)

→ child_sites.currentPhase = 'ongoing'
→ Vercel Cron에 섹션 schedule 등록
→ Phase 2 첫 발행 시작
```

---

## 5. Phase 2 일상 발행 검증

### 5.1 매일 자동 검증 (운영자가 보지 않아도 시스템이)

```
□ 어제 섹션별로 예정된 발행 횟수 = 실제 발행 횟수
□ 모든 발행 글의 Verifier 통과
□ 가짜 출처 감지 0건 또는 정책대로 처리됨
□ 새 글의 internal links 평균 5+ 개
□ 새 글의 SEO 메타 모두 채워짐
□ 자식 사이트 ISR revalidate 성공
□ IndexNow 4 endpoint 모두 호출 성공
```

monitoring-health.md L3 파이프라인 헬스체크가 자동 검증.

### 5.2 매일 수동 검증 (운영자, ~5분)

```
□ 일일 리포트 메일 도착
□ 어제 발행된 글 1~2편 빠른 검토 (제목/excerpt 정도)
□ 미처리 high 알림 처리
□ 검수 큐가 5편 미만 유지
```

### 5.3 매주 수동 검증 (운영자, ~30분)

```
□ 주간 리포트 검토
□ 콘텐츠 갭 발견 → 출처 풀 또는 추천 토픽 추가
□ Top 글 / 부진 글 패턴 인식
□ AI 인사이트의 액션 아이템 처리
□ 페르소나 분포 확인 (한 페르소나 30% 초과 X)
```

---

## 6. 메타사이트 자체 검증 (정기)

### 6.1 매일 자동

```
□ /api/health 응답 정상
□ 모든 정적 Cron 어제 1회 이상 실행 (cron_executions)
□ Firebase 백업 어제 자정 성공
□ 알림 채널 도달 가능
```

monitoring-health.md 12.1 일일 자동 체크.

### 6.2 매주 자동

```
□ Firestore Rules 변경 없는지 (악의적 변경 감지)
□ 환경변수 누락 없는지 (validateMetaEnv)
□ Cron 성공률 95%+
□ 외부 의존 응답 시간 변화 추적
```

### 6.3 매월 수동 (운영자)

```
□ Vercel Pro 사용량 확인 (cron / function / bandwidth 한계)
□ Firebase Blaze 비용 검토
□ 시크릿 로테이션 체크 (분기별 권장)
□ 백업 복원 테스트 (가짜 데이터로)
□ 모든 도메인 SSL 인증서 갱신 (자동이지만 확인)
```

---

## 7. 실패 시 디버깅 가이드

### 7.1 사이트 생성 실패

#### 도메인 검증 실패

```
원인:
- DNS 설정 안 됨 (가장 흔함)
- Cloudflare proxy 활성 (Vercel A 레코드 막힘)
- 도메인 등록업체에서 DNS 전파 지연 (~24시간)

대응:
1. dig {domain} A → Vercel IP 가리키는지
2. dig {domain} CNAME → cname.vercel-dns.com
3. Cloudflare 사용 시 "DNS only" (gray cloud) 모드
4. DNS 전파 검증: dnschecker.org
5. 24시간 대기 후 [재검증]
```

#### Vercel API 실패

```
원인:
- VERCEL_API_TOKEN 만료
- VERCEL_TEAM_ID 잘못됨
- API rate limit

대응:
1. Vercel 대시보드에서 토큰 재발급
2. 환경변수 갱신
3. 메타 재배포
```

#### Firebase 인덱스 누락

```
원인:
- database-schema.md 8장 인덱스 일부 미배포

대응:
1. firebase deploy --only firestore:indexes
2. 인덱스 생성 시간 (~수 분) 대기
3. Firestore 콘솔에서 'Building' → 'Enabled' 확인
```

### 7.2 권위 트리 생성 실패

```
원인:
- AI API 응답 형식 오류 (JSON 파싱 실패)
- 토큰 한도 초과
- 모델 폴백 체인 모두 실패

대응:
1. magazine_logs에서 에러 메시지 확인
2. 운영자가 어드민에서 [재생성] 클릭
3. 수동 outline 작성 옵션 (운영자가 직접 글 추가)
```

### 7.3 발행 실패

#### Tistory 발행 실패

```
원인:
- access_token 만료
- 카테고리 ID 잘못됨
- 본문 형식 오류 (특수 문자)

대응:
1. failed_jobs 컬렉션 확인
2. 토큰 만료 알림 → 운영자 재발급
3. 어드민의 [수동 재시도] 버튼
```

#### Vercel revalidate 실패

```
원인:
- INTERNAL_REVALIDATION_TOKEN 메타 ↔ 자식 불일치
- 자식 사이트 다운
- API 응답 timeout

대응:
1. 양쪽 환경변수 일치 확인
2. 자식 사이트 직접 접속 시도
3. Vercel 대시보드에서 자식 project 상태
```

### 7.4 비용 폭주

monitoring-health.md 7.2 자동 감지. 수동 디버깅:

```
1. /costs 페이지에서 사이트별 비용 확인
2. magazine_logs 필터 → 비용 높은 호출 식별
3. 어떤 모델/단계가 폭주했나?
   - Writer 재생성 무한 루프?
   - 출처 데이터 너무 큼?
   - 프롬프트 버그?
4. 원인 수정 + 사이트 재개
```

---

## 8. 백업 / 복원 검증

### 8.1 백업 검증 (매월)

```
□ GCS bucket에 어제 자정 백업 파일 존재
□ 백업 파일 크기 0 아님 (이상 신호)
□ 무작위 1개 컬렉션 다운로드 → JSON 파싱 가능
□ 백업 보관 정책 (30일+) 확인
```

### 8.2 복원 테스트 (분기 1회 권장)

```
1. 별도 staging Firebase project 생성
2. 어제 백업을 staging에 import
   gcloud firestore import gs://meta-site-backups/2026-05-05 \
     --project=meta-site-staging
3. staging이 production과 동일한 데이터 가지는지 검증
4. 어드민 일부 기능 staging에서 테스트
5. 검증 끝나면 staging project 삭제 (비용 절약)
```

성공 = "재해 시 복원 가능" 보장.

---

## 9. 자식 사이트 분리 검증 (마이그레이션 출구)

deployment-guide.md 8.2의 분리 절차 검증:

### 9.1 코드 분리 가능성

```
□ 자식 사이트 template repo의 코드가 SITE_ID 의존만 있는지
   → grep -r "process.env.SITE_ID" → 모든 사용처 식별
   → 다른 메타 의존 코드 (메타 API 호출 등) 식별

□ 메타 의존 코드가 환경변수 분기로 처리됐는지
   if (process.env.STANDALONE_MODE === 'true') {
     // 메타 통신 스킵
   }
```

### 9.2 데이터 분리 가능성

```
□ sites/{siteId}/* 컬렉션이 다른 사이트와 독립인지
   → 외래키가 다른 사이트 컬렉션 가리키지 않음

□ Firestore export/import 권한 확인
   gcloud firestore export gs://test-bucket/test-export \
     --collection-ids=child_sites,sites
```

### 9.3 분리 시뮬레이션 (선택, 분기 1회)

```
1. 임시 GCP project 생성
2. 자식 사이트 1개 데이터만 import
3. 코드를 fork하고 STANDALONE_MODE=true로
4. 새 Vercel project 배포
5. 사이트 정상 작동 확인
6. 임시 환경 정리
```

성공 = "운영자가 메타 떠나도 자식 살아남음" 검증.

---

## 10. 보안 검증

### 10.1 정기 보안 체크 (매월)

```
□ Firestore Rules 정상 작동
   → 비인가 사용자가 다른 사이트 데이터 못 읽는지 테스트
   → Rules Playground 활용

□ ADMIN_EMAILS 외 어드민 접근 불가
   → 일반 이메일로 /admin 접근 시도 → 401

□ Cron endpoint 외부 호출 차단
   curl https://meta.example.com/api/cron/daily-report
   → 401 (CRON_SECRET 헤더 없으니)

□ 자식 사이트 /api/revalidate 인증 작동
   curl -X POST https://child.com/api/revalidate -d '{"paths":["/"]}'
   → 401

□ NEXT_PUBLIC_ 외 시크릿 클라이언트 노출 0
   → 빌드 후 .next/static에서 grep "sk-ant" → 0 hits
```

### 10.2 보안 사고 대응

```
시크릿 노출 의심:
1. 즉시 모든 키 로테이션
2. audit_logs에서 의심 활동 검색
3. magazine_logs에서 비정상 호출 패턴
4. 필요 시 메타사이트 긴급 정지 (deployment-guide.md 9.1)

악의적 글 발견 (해킹 / 프롬프트 인젝션):
1. 해당 글 즉시 archived
2. 발행 일시 정지
3. 출처 풀 점검 (해당 글의 출처 다운)
4. 프롬프트 강화
5. 보안 사고 알림
```

---

## 11. UI/UX 검증

### 11.1 자식 사이트 (수동)

```
□ 모바일에서 정상 보임 (반응형)
□ 다크모드 작동 (선택)
□ 페이지 로딩 속도 < 3초 (Lighthouse)
□ Core Web Vitals (LCP / FID / CLS) Pass
□ 폰트 깨짐 없음
□ 이미지 lazy load 작동
□ 광고 슬롯 위치 자연스러움
□ 어필리에이트 box 깔끔
□ 댓글 영역 AI 라벨 명시
□ 푸터에 정책 링크 (개인정보 / 어필리에이트 disclosure)
```

### 11.2 메타 어드민 (수동)

```
□ 모든 어드민 페이지 모바일 접근 가능
□ 알림 빠르게 인지 (빨간 배지 / 카운트)
□ 검수 큐 빠르게 처리 (1편당 < 1분)
□ 그래프/차트 렌더링 속도 OK
□ 한 화면에 정보 너무 많지 않음 (정보 과부하 방지)
```

---

## 12. 자동화 검증 (의도대로 작동하는지)

### 12.1 Cron 자동화

```
□ 매 5분 health-check-external 실제 트리거 (cron_executions)
□ 매일 09:00 daily-report 운영자 메일 도착
□ 매주 화 09:00 newsletter-digest 구독자 도달
□ 누락 시 데드맨 스위치 알림 (vercel-cron-spec.md 7.3)
```

### 12.2 자동 복구 검증 (시뮬레이션)

```
1. 의도적으로 출처 1개 다운 (URL 잘못된 걸로 변경)
2. 5분 대기 → Scout 단계 실패 감지
3. 3회 누적 → consecutive_failures 임계값
4. 자동 status='failing' 변경 확인
5. 5회 누적 → status='dead' + 알림 발송
6. 운영자가 출처 수정 → 다음 cron에서 자동 'active' 복귀
```

monitoring-health.md 6.1 자동 복구 액션 검증.

### 12.3 자동 사이트 정지 검증

```
1. 일일 비용 한도를 일부러 낮게 설정 ($0.50)
2. 1편 발행 → 비용 초과
3. 자동 pauseSite() 트리거 확인
4. cron 비활성 확인
5. 자정 daily-reset 후 자동 재개
6. 한도 원복
```

---

## 13. 신규 자식 사이트 첫 1주일 집중 모니터링

새 사이트 운영 시작 후 첫 7일은 수동 모니터링 강화:

### Day 1 (생성 직후)

```
□ 도메인 응답 정상
□ 정적 페이지 (about/privacy/contact) 표시
□ 권위 트리 outline 검토 + 승인
□ 첫 권위 글 1편 발행 검증
```

### Day 2~3

```
□ 일일 권위 글 발행 정상
□ 의존성 그래프대로 발행 순서 OK
□ 글 품질 OK (페르소나 살아있는지)
□ 광고 안 켜진 거 확인 (Phase 1 정책)
```

### Day 7

```
□ 7일 차 발행 누적 12~14편 (페이스 정상)
□ 색인 시작 (Search Console)
□ 첫 트래픽 발생 (소량이라도)
□ 알림 폭격 X (운영자에 부담 없음)
```

### Day 14~21 (Phase 1 마무리)

```
□ Pillar Page 자동 생성 (95% 시점)
□ 운영자 Pillar 검토 + 승인
□ Phase 2 전환 게이트 통과
```

문제 발견 시 즉시 운영자 개입.

---

## 14. 체크리스트 자동화 (어드민 통합)

각 사이트의 `/sites/{id}` 개요 페이지에 진행 상황 표시:

```
travel-kr 진행 상황

[Phase 0] 인프라 셋업
  ✅ Vercel project 생성
  ✅ DNS 검증
  ✅ 환경변수 주입 (21/21)
  ✅ Firebase 컬렉션 초기화

[Phase 1] 권위 구축
  ✅ Outline 승인
  🟡 발행 진행 중 (18/30, 60%)
  ⏸ Pillar 대기 (95% 도달 시)
  
[Phase 2] 정기 발행
  ⏸ 대기 중 (Phase 1 완료 후)
  
[자동 검증]
  ✅ 도메인 응답 (1분 전)
  ✅ 모든 SEO 인프라 작동
  ✅ Search Console 등록 (색인 12편)
  ✅ GA4 추적 작동 (어제 23 sessions)
  
[알림]
  미처리 1건 — 출처 'TheAIShow' 3일 다운
```

---

## 15. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ 메타사이트 첫 배포 검증 (인프라 / 환경변수 / 응답 / Cron)
- ✅ 자식 사이트 생성 후 검증 (자동 + 수동)
- ✅ 호스팅별 검증 차이 (Next.js / Tistory / Blogger)
- ✅ Phase 1 → Phase 2 전환 게이트 (자동 + 수동)
- ✅ 일상 운영 검증 (매일 / 매주 / 매월)
- ✅ 메타사이트 자체 검증 (정기 헬스)
- ✅ 실패 시 디버깅 가이드 (5종 시나리오)
- ✅ 백업 / 복원 검증 (분기별)
- ✅ 마이그레이션 출구 검증 (분리 가능성)
- ✅ 보안 검증 + 사고 대응
- ✅ UI/UX 검증
- ✅ 자동화 검증 (Cron / 복구 / 정지)
- ✅ 신규 사이트 첫 1주 집중 모니터링
- ✅ 어드민 통합 체크리스트 표시

이 문서가 정의하지 않은 것:
- ❌ 쏙튜브 → 메타 마이그레이션 → `ssoktube-migration.md`

---

## 16. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 모든 다른 문서의 검증 절차 통합. |

---

*이 문서는 메타사이트 검증의 단일 출처다. 첫 배포 → 사이트 생성 → Phase 전환 → 일상 운영 → 분리/마이그레이션의 모든 검증 절차를 담고 있다.*

*다음 문서: `ssoktube-migration.md` (Tier F 5번 — 마지막)*
