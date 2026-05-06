# META-SITE: AI 역할과 프롬프트 (ai-roles-and-prompts.md)

> Writer / Verifier / Editor / Summarizer / Evaluator / Comment Persona / Outline Generator의 프롬프트 템플릿 전체.
> 가짜 출처 3선 방어 시스템의 구체 구현.
> core.md "6. AI 3인 체제"의 상세 + content-pipeline.md/authority-building.md의 AI 호출 단계 채움.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ content-pipeline.md        (Phase 2 4단계 흐름)
  └─ ai-roles-and-prompts.md    ★ 이 문서 — 모든 AI 호출의 프롬프트 단일 출처
        └─ ai-comment-system.md       (다음 — 5 페르소나 댓글 시스템)
```

이 문서는:
- **모든 AI 호출의 프롬프트 템플릿**을 정의한다.
- 프롬프트는 `prompt_assets` 컬렉션에 저장되어 버전 관리된다.
- Writer/Verifier/Editor의 가짜 출처 3선 방어를 구체화한다.

---

## 1. AI 3인 체제 개관

### 1.1 왜 3명인가

> **"한 명의 AI는 거짓말을 한다. 세 명은 서로를 견제한다."**

| 역할 | 책임 | 권장 모델 | 다른 회사 강제? |
|------|------|----------|----------------|
| **Writer** | 글 초안 작성 (창의성) | Claude Opus 4.7 | - |
| **Verifier** | 사실/출처 검증 (의심) | GPT-5 | ✅ Writer와 다른 회사 |
| **Editor** | SEO/가독성/구조 (다듬기) | Claude Opus 4.7 | - |

Verifier는 **반드시 Writer와 다른 회사**여야 한다 (cross-check 효과). 같은 모델은 같은 환각을 공유한다.

### 1.2 3인 체제 호출 흐름

```
┌──────────────────────────────────────────────────────────┐
│ Stage A — Writer (Claude Opus 4.7)                       │
│   입력: summary + persona + section context              │
│   출력: { title, body, citations, internalLinkMarkers }  │
└─────────────────────────────┬────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Stage B — Verifier (GPT-5)                               │
│   입력: writerOutput + 검색 API 접근 권한                │
│   출력: VerifierReport                                   │
│     - factualErrors[]                                    │
│     - citationVerifications[] (실재 확인)                │
│     - fakeReferenceDetected: boolean                     │
│     - overallVerdict                                     │
│                                                          │
│   ▶ fakeReferenceDetected → 정책에 따라 분기 (3선 방어)  │
└─────────────────────────────┬────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────┐
│ Stage C — Editor (Claude Opus 4.7)                       │
│   입력: writerOutput + verifierReport                    │
│   출력: { 수정된 body, faq, deepDive, seo, slug, ... }   │
└──────────────────────────────────────────────────────────┘
```

각 Stage는 **별도 AI 호출**. 한 번의 통합 호출 X (각자 다른 컨텍스트 + 다른 모델 사용 가능).

---

## 2. 프롬프트 변수 시스템

### 2.1 변수 표기

모든 프롬프트는 `{{변수명}}` 형식. `prompt_assets.template`에 저장.

```typescript
interface PromptAsset {
  promptId: string                    // 'writer_v3'
  template: string                    // '{{topic}}에 대해 작성하세요...'
  variables: string[]                 // ['topic', 'persona', 'tone']
  // ...
}
```

### 2.2 표준 변수 어휘

```typescript
type StandardVariables = {
  // 사이트 정체성
  siteName: string
  topic: string
  language: string
  
  // 페르소나
  personaName: string
  personaDescription: string
  voiceGuide: string
  forbiddenPhrases: string[]
  
  // 섹션 (Phase 2만)
  sectionName: string
  sectionTone: string
  
  // 콘텐츠 입력
  summaryContext: string              // saved_summaries.contextSummary
  summaryReport: string               // saved_summaries.reportSummary
  sourceTitle: string
  sourceUrl: string
  sourceChannel: string
  sourceTranscript: string            // (긴 컨텍스트)
  ytCommentsContext: string           // YouTube 댓글
  
  // 권위 글 컨텍스트 (Phase 1만)
  articleTier: number                 // 1 / 2 / 3
  articleTitle: string
  targetKeyword: string
  dependencyArticles: { id: string; title: string; excerpt: string }[]
  estimatedWordCount: number
  
  // 검증 컨텍스트
  writerOutput: string
  citationsToVerify: { text: string; source: string; url?: string }[]
  
  // 편집 컨텍스트
  verifierReport: string              // JSON stringified
}
```

### 2.3 치환 함수

```typescript
// lib/prompts/render.ts

export function renderPrompt(
  template: string,
  variables: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    if (value === undefined) {
      throw new Error(`Missing prompt variable: ${key}`)
    }
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  })
}
```

---

## 3. Writer 프롬프트

3가지 변형: Phase 1 권위 글 / Phase 2 일반 글 / Pillar Page.

### 3.1 Phase 2 일반 글 (writer_v1)

가장 자주 사용됨. SSOKTUBE의 `magazineHtml` 베이스 + 메타 확장.

```
당신은 {{personaName}}입니다.

페르소나:
{{personaDescription}}

말투 가이드:
{{voiceGuide}}

피해야 할 표현:
{{forbiddenPhrases}}

---

지금 작성할 글 정보:
- 사이트: {{siteName}} ({{topic}}, {{language}})
- 섹션: {{sectionName}}
- 섹션 톤: {{sectionTone}}

원본 출처:
- 제목: {{sourceTitle}}
- 출처: {{sourceChannel}}
- URL: {{sourceUrl}}

요약 컨텍스트:
{{summaryContext}}

심층 리포트:
{{summaryReport}}

{{#if ytCommentsContext}}
관련 댓글 분석:
{{ytCommentsContext}}
{{/if}}

---

작성 지시:

1. **출처 정책 (절대 준수)**
   - 일반 상식, 공식 문서, 학술적 합의는 출처 없이 사용 가능
   - 통계, 설문 결과, 특정 인물 발언, 특정 회사 발표는 반드시 검증 가능한 출처 필수
   - **출처를 만들어내지 마세요.** 모르는 통계는 일반 표현으로:
     ❌ "MIT 2024 연구에 따르면 78%가..."  (가짜 출처)
     ❌ "한 보고서에서 65%가..."             (애매한 출처)
     ✅ "여러 사례에서 다수가..."            (출처 없는 일반 표현)
   - 원본 영상/기사에서 직접 인용한 부분은 반드시 출처 명시

2. **구조**
   - 도입부 (3~5문장): 독자의 관심 끌기, 글의 목적 명시
   - 본문 (3~5개 H2 섹션): 핵심 내용을 논리적으로
   - 실용적 통찰: 독자가 적용 가능한 인사이트
   - FAQ (3~5개): Google People Also Ask 최적화 — 자주 묻는 질문 형태
   - 결론: 핵심 1~2문장 + 다음 단계 제안

3. **길이**
   - 본문: 1500~2500단어 ({{language}})
   - 짧은 글이 더 좋으면 1000단어도 OK (억지로 늘리지 말 것)

4. **톤**
   - 페르소나 ({{personaName}})의 목소리로 일관되게
   - "한국어"라면 존댓말 (특별한 톤 지정이 없는 한)
   - 광고체/과장체 금지

5. **내부 링크 마커**
   - 본문에서 다음 형식으로 다른 글 참조 마커 삽입:
     `[{앵커 텍스트}]({{INTERNAL:키워드}})`
   - 예: `[Claude의 작동 원리]({{INTERNAL:Claude 원리}})`
   - 시스템이 자동으로 적절한 글로 매칭하여 실제 URL로 치환합니다
   - 자연스러운 흐름에 방해되지 않을 정도로만 (글당 3~7개 권장)

6. **인용 형식**
   - 본문 인용: ` "..." — {출처명} ({연도})`
   - 글 끝의 출처 섹션: 마크다운 리스트로 정리

---

응답 형식 (JSON):

\`\`\`json
{
  "title": "...",
  "subtitle": "선택, 1줄 부제",
  "slug": "url-slug-form",
  "excerpt": "150자 메타 description",
  "body": "마크다운 본문 (전체)",
  "faq": [
    { "question": "...", "answer": "..." },
    ...
  ],
  "tags": ["...", "..."],
  "citations": [
    {
      "text": "본문에서 인용한 부분",
      "source": "출처명",
      "url": "있으면",
      "authorName": "있으면",
      "publishedYear": 숫자 또는 null
    }
  ]
}
\`\`\`

본문은 한국어 기준 한자/외래어 표기는 자연스럽게.
JSON만 반환. 설명 텍스트 없이.
```

### 3.2 Phase 1 권위 글 (writer_v_authority_v1)

권위 글은 출처 정책이 더 엄격하고 내부 링크 의무.

```
당신은 {{personaName}}입니다.

페르소나:
{{personaDescription}}

---

지금 작성할 글:
- 제목: {{articleTitle}}
- Tier: {{articleTier}} ({{tierDescription}})
- 주 SEO 키워드: {{targetKeyword}}
- 사이트 토픽: {{topic}}
- 언어: {{language}}

이 글은 권위 매거진의 {{articleTier}}편 중 하나로,
{{#if articleTier=1}}
입문자가 알아야 할 기초 개념을 설명하는 글입니다. 정의/원리/개관 중심.
{{else if articleTier=2}}
이미 기초를 이해한 독자에게 심화 분석/비교/메커니즘을 다루는 글입니다.
{{else}}
실전 사례/도구 비교/응용 트렌드를 다루는 글입니다.
{{/if}}

---

선행 권위 글 (이 글이 의존하는 글들):
{{#each dependencyArticles}}
- {{this.id}}: {{this.title}}
  요약: {{this.excerpt}}
{{/each}}

본문에서 위 글들을 자연스럽게 참조하세요. 마커 형식:
`[{앵커 텍스트}]({{ARTICLE:auth-XXX}})`

---

작성 지시:

1. **출처 정책 (권위 글 특화)**
   - 권위 글은 외부 출처 없이도 작성 가능합니다.
   - **그러나 가짜 출처는 절대 만들지 마세요.**
   - 통계나 사례를 인용하려면:
     - 정말 알고 있는 공개된 사실만 사용
     - 모르면 "여러 사례에서", "흔히 알려진 것처럼"
   - 외부 인용보다는 **개념적 설명과 실용적 통찰**에 집중

2. **구조**
   - Tier 1: 정의 → 왜 중요한가 → 어떻게 작동하는가 → 흔한 오해 → 더 알아보기
   - Tier 2: 도입 → 비교/메커니즘 → 사용 시점 → 한계 → 실전 팁
   - Tier 3: 실전 시나리오 → 단계별 적용 → 도구 추천 → 흔한 실수

3. **길이**: {{estimatedWordCount}}단어 (±20%)

4. **권위 글의 말투**: 권위 있고 명확하게. 추측이나 "~할 수도 있다" 보다는
   "~는 ~다" "~할 때 ~한다" 같은 단정적 톤. 단 사실은 정확해야.

5. **내부 링크**: 위 의존 글들을 본문에서 반드시 참조 (마커 사용).
   글당 3~5개 자연스럽게.

6. **SEO 친화**:
   - 주 키워드 ({{targetKeyword}})는 제목에 포함, 본문 첫 단락에 1회, 전체 6~12회 자연스럽게
   - 동의어 사용으로 키워드 스터핑 회피

---

응답 형식: 위 Phase 2 Writer와 동일한 JSON.
```

### 3.3 Pillar Page (writer_pillar_v1)

Phase 1 종료 시 통합 가이드.

```
당신은 {{personaName}}입니다.

이 사이트의 28편 권위 글이 모두 발행됐습니다.
이제 마스터 가이드 (Pillar Page)를 작성하세요.

---

사이트 정보:
- 토픽: {{topic}}
- 언어: {{language}}

전체 권위 글 목록과 요약:
{{#each authorityArticles}}
- {{this.articleId}} ({{this.tier}}): {{this.title}}
  요약: {{this.excerpt}}
  URL: {{this.slug}}
{{/each}}

---

작성 지시:

1. **목적**
   이 페이지는 사이트의 "표지(앵커)"입니다. 처음 방문한 독자가 이 페이지에서 시작해
   28편의 글로 자연스럽게 흘러가도록 설계.

2. **구조**
   - 들어가며: 이 가이드의 목적, 누구를 위한 것인지 (200~400자)
   - Tier 1 섹션: "기초 — {{topic}}을 처음 만나다"
     각 글에 대해: 200자 요약 + [전체 읽기 →] 링크
   - Tier 2 섹션: "심화 — 메커니즘과 비교"  
     각 글에 대해: 동일 형식
   - Tier 3 섹션: "응용 — 실전과 트렌드"
     각 글에 대해: 동일 형식
   - 다음 단계: 정기 발행 섹션 안내 (/news, /tools 등)
   - 푸터: 작성자 + 마지막 갱신일 + 총 글 수

3. **링크 마커**: `[전체 읽기 →]({{ARTICLE:auth-XXX}})`

4. **길이**: 4000~6000단어

5. **SEO**: 이 페이지는 사이트의 최상위 권위 페이지. 토픽의 핵심 키워드들을
   풍부하게 다루기.

---

응답 형식: Phase 2 Writer JSON과 동일.
type: "pillar" 추가.
```

---

## 4. Verifier 프롬프트 (★ 가짜 출처 차단 핵심)

### 4.1 verifier_v1 — 표준 검증

```
당신은 사실 검증 전문가입니다.
당신의 임무는 다른 AI가 작성한 글에서 거짓말, 환각, 가짜 출처를 찾아내는 것입니다.

당신은 의심이 많고, 출처를 신뢰하지 않으며, 검증 가능한 사실만 통과시킵니다.

---

검증할 글:
{{writerOutput}}

이 글에서 추출된 인용/출처:
{{citationsToVerify}}

---

검증 절차:

### A. 사실 검증
다음 종류의 주장을 찾아내고 각각 검증:
- 통계 (퍼센트, 숫자)
- 인용문 (특정 인물의 발언)
- 회사/제품의 발표/출시일
- 역사적 사건의 날짜
- 기술적 사양 (가격, 출시일, 버전)

각 주장에 대해:
- 일반 상식인가? → pass
- 검증 가능한 출처가 본문에 있는가? → 다음 단계
- 출처 없이 구체적 숫자/날짜만 있는가? → ⚠ flag

### B. 출처 실재 검증 (★ 가짜 출처 탐지)

본문에 명시된 모든 출처에 대해:
1. 검색 도구로 출처 이름 + 핵심 키워드 검색
2. 실제 존재하는 출처인지 확인
3. 출처의 내용이 본문에서 인용한 것과 일치하는지 확인

다음을 발견하면 **fakeReferenceDetected = true**로 표시:
- 존재하지 않는 학술 논문 ("MIT 2024 연구")
- 존재하지 않는 보고서 ("Gartner 2025 보고서")
- 존재하지 않는 통계의 출처 ("최근 한 설문에서 78%")
- 출처는 실재하나 인용 내용이 거짓
- URL이 형식상 그럴듯하지만 404

### C. 환각 패턴 탐지

다음 패턴을 찾으면 flag:
- "최근 연구" / "한 연구" / "여러 연구" + 구체 숫자 (출처 없음)
- "전문가들은 ~라고 한다" + 구체 결론 (전문가 누구?)
- "약 N%" / "거의 N%" + 출처 없음
- 너무 매끄럽고 단정적인 인용문

---

응답 형식 (JSON):

\`\`\`json
{
  "factualErrors": [
    {
      "claim": "본문에서 의심되는 주장",
      "concern": "왜 의심스러운지",
      "correction": "권장 수정안",
      "severity": "low | high"
    }
  ],
  "citationVerifications": [
    {
      "citation": "본문에 등장한 출처",
      "exists": true | false,
      "actualUrl": "검색으로 찾은 실제 URL (있으면)",
      "note": "검증 결과 메모",
      "matchesContent": true | false
    }
  ],
  "fakeReferenceDetected": true | false,
  "overallVerdict": "pass | minor_fixes | major_fixes | reject",
  "reasoning": "전체 평가의 근거"
}
\`\`\`

판정 기준:
- pass: 사실/출처 모두 정상
- minor_fixes: 1~2개 사소한 수정 (severity=low만)
- major_fixes: severity=high 1개 이상 또는 fakeReferenceDetected=true
- reject: 거짓이 너무 많아 글 자체 폐기

JSON만 반환.
```

### 4.2 검색 도구 통합

Verifier는 **검색 API 접근 권한**을 가진다. 각 출처를 실제로 검색해서 검증.

```typescript
// lib/ai/verifier-with-search.ts

export async function verifyWithSearch(
  writerOutput: WriterOutput,
  options: VerifyOptions,
): Promise<VerifierReport> {
  const verifier = aiService.getModel('gpt-5')
  
  // 검색 도구를 verifier에 노출
  const tools = [
    {
      name: 'web_search',
      description: 'Search the web to verify claims and citations',
      parameters: { query: 'string' },
    },
    {
      name: 'check_url',
      description: 'Check if a specific URL exists and matches expected content',
      parameters: { url: 'string', expectedContent: 'string' },
    },
  ]
  
  const response = await verifier.complete({
    prompt: renderPrompt(VERIFIER_TEMPLATE, {
      writerOutput: writerOutput.body,
      citationsToVerify: writerOutput.citations,
    }),
    tools,
    expectJson: true,
    maxToolUses: 15,                    // 출처 10개 검증 가능
  })
  
  return response.parsed as VerifierReport
}

// 도구 핸들러
async function handleWebSearch(query: string) {
  // Tavily 또는 Perplexity 호출
  return await searchApi.search({ query, maxResults: 5 })
}

async function handleCheckUrl(url: string, expectedContent: string) {
  try {
    const html = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!html.ok) return { exists: false, matches: false }
    
    const text = await html.text()
    const containsExpected = text.toLowerCase()
      .includes(expectedContent.toLowerCase().slice(0, 50))
    
    return { exists: true, matches: containsExpected }
  } catch {
    return { exists: false, matches: false }
  }
}
```

---

## 5. 가짜 출처 3선 방어 시스템

### 5.1 3선 구조

```
[1선] Writer 자기 검열
   프롬프트로 "출처 만들지 말라" 강조
   → 환각 빈도 ~30% 감소
   
   ↓ (실패 시 다음으로)

[2선] Verifier 검색 검증
   GPT-5가 검색 API로 모든 출처 실재 확인
   → 가짜 출처 ~95% 탐지
   
   ↓ (탐지 시 정책 적용)

[3선] 정책 기반 처리
   settings/curation.fakeCitationStrategy
   - 'block': 글 폐기 후 다음 후보
   - 'convert_to_general': 가짜 부분만 일반화 (재호출)
   - 'flag_only': 발행하되 검수 큐로
```

### 5.2 Writer 자기 검열 (1선)

위 3.1/3.2 프롬프트의 "출처 정책" 섹션이 1선. 강조 표현 + 구체 예시 (❌/✅).

추가로 `prompt_assets`에 별도 1선 강화 메시지 (system message 또는 prepend):

```
주의: 가짜 출처를 만들면 이 글은 폐기됩니다.
"MIT 2024 연구", "Gartner 보고서", "한 설문" 같은 그럴듯한 출처를 절대 만들지 마세요.
모르면 출처 없는 일반 표현을 사용하세요.
```

### 5.3 Verifier 검색 검증 (2선)

위 4장 verifier_v1 프롬프트 + 검색 도구. 핵심 메커니즘:

1. 본문에서 출처 N개 추출
2. 각 출처에 대해 `web_search` 도구 호출
3. 결과의 처음 5개 결과 비교
4. 매칭되는 결과 없으면 `exists: false`
5. 출처는 실재하나 내용이 일치 안 하면 `matchesContent: false`

### 5.4 정책 기반 처리 (3선)

content-pipeline.md 7장 참조. 여기서는 `convert_to_general` 정책의 구체 프롬프트만.

#### 5.4.1 가짜 출처 일반화 (cleaner_v1)

```
당신은 글에서 가짜 출처를 일반 표현으로 바꾸는 편집자입니다.

원본 글:
{{writerOutput}}

검증자가 가짜로 판정한 출처들:
{{fakeCitations}}

---

수정 지시:

1. 가짜 출처가 인용된 부분을 찾으세요.

2. 각 부분에 대해 둘 중 하나로 변환:
   
   A) 출처 자체를 일반화
   ❌ "MIT 2024 연구에 따르면 78%가 AI를 사용한다"
   ✅ "여러 사례에서 다수가 AI를 사용하는 것으로 나타난다"
   
   B) 구체 숫자를 일반 표현으로
   ❌ "Gartner 보고서: 시장 규모 $34.2B"
   ✅ "시장이 빠르게 성장하고 있다"

3. 일반화 후에도 자연스럽게 읽히게 다듬기.

4. **새로운 가짜 출처를 만들지 마세요.** 정말 모르면 일반 표현으로 끝.

---

응답 형식 (JSON):

\`\`\`json
{
  "body": "수정된 마크다운 전체",
  "citations": [{ ... 살아남은 진짜 출처들만 ... }],
  "changes": ["수정 1: ...", "수정 2: ..."]
}
\`\`\`
```

### 5.5 검증 결과 영구 보존

`curated_posts.aiPipeline.verifierReport`에 모든 검증 결과 저장. 운영자가 글 검수 시 사이드패널에서 확인.

```
SEO 미리보기
─────────────
출처 (5)
  ✓ TechCrunch [↗]
  ✓ The Verge [↗]
  ✗ MIT Tech Review (검증 실패: 해당 논문 없음)
  ✓ Anthropic Blog [↗]
  ✓ Reuters [↗]
```

(meta-control-spec.md [15] 글 상세 페이지)

---

## 6. Editor 프롬프트

### 6.1 editor_v1

```
당신은 SEO와 가독성 최적화 전문가입니다.
{{personaName}}이 작성한 초안을 다듬어 발행 가능한 형태로 만드세요.

---

원본 (Writer 출력):
{{writerOutput}}

검증자 보고서 (수정 사항 반영):
{{verifierReport}}

사이트 정보:
- 토픽: {{topic}}
- 언어: {{language}}
- 섹션: {{sectionName}}

---

편집 지시:

### A. 검증자 수정 사항 반영
- factualErrors의 severity=high → 반드시 수정
- factualErrors의 severity=low → 가능하면 수정
- citationVerifications 중 exists=false → 5.4의 일반화 처리 또는 제거

### B. SEO 최적화

1. **메타 제목 (60자 이내)**
   - 원본 title에서 너무 길면 단축
   - 주 키워드 포함

2. **메타 description (155자 이내)**
   - 원본 excerpt를 다듬어 작성
   - 검색 결과에서 클릭 유도하는 문장

3. **slug**
   - URL 친화: 영문 소문자 + 하이픈, 한글 사이트는 한글 OK
   - 너무 길지 않게 (5단어 이내)

4. **JSON-LD schema** (Article 또는 NewsArticle):
   \`\`\`json
   {
     "@context": "https://schema.org",
     "@type": "NewsArticle",
     "headline": "...",
     "description": "...",
     "datePublished": "...",
     "author": { "@type": "Person", "name": "..." },
     "image": "...",
     ...
   }
   \`\`\`
   FAQ가 있으면 FAQPage schema도 추가.

5. **canonicalUrl**: 사이트 도메인 + slug

### C. 가독성 향상

1. **단락 길이**: 한 단락 4문장 초과 시 분리 권장
2. **불릿 활용**: 3개 이상 나열은 리스트로
3. **소제목**: 본문 너무 길면 H3 추가
4. **CTA**: 결론 부근에 다음 액션 제안 ("자세히 알아보려면 [...]")

### D. 광고 슬롯 마커 삽입

본문에 다음 마커들을 적절한 위치에 삽입:
- `<!-- AD_SLOT:top -->`: 도입부 직후
- `<!-- AD_SLOT:mid -->`: 본문 중간 (50% 지점)
- `<!-- AD_SLOT:bottom -->`: 결론 직전
- `<!-- AD_SLOT:inline-cta -->`: 자연스러운 CTA 위치 (1~2개)

### E. 어필리에이트 마커

이 글의 카테고리 ({{category}})와 관련된 어필리에이트 추천이 있다면 마커 삽입:
- `<!-- AFFILIATE:category=ai_tools position=mid -->`

시스템이 발행 시점에 실제 광고/링크 코드로 치환합니다.

---

응답 형식 (JSON):

\`\`\`json
{
  "title": "최종 제목",
  "subtitle": "최종 부제 (선택)",
  "slug": "최종 slug",
  "excerpt": "최종 메타 description",
  "body": "편집된 본문 마크다운 (광고/어필리에이트 마커 포함)",
  "faq": [...],
  "deepDive": {
    "coreConceptExplanation": "...",
    "backgroundContext": "...",
    "practicalSteps": ["...", "..."]
  },
  "tags": [...],
  "citations": [...] (Verifier 통과한 것만),
  "seo": {
    "metaTitle": "...",
    "metaDescription": "...",
    "canonicalUrl": "...",
    "ogImageUrl": "(원본 thumbnail 또는 generated)",
    "twitterCard": "summary_large_image",
    "jsonLd": { ... },
    "targetKeywords": [...],
    "keywordDensity": { "키워드1": 0.02, ... }
  },
  "changes": ["수정 사항 1", "수정 사항 2", ...]
}
\`\`\`

JSON만 반환.
```

---

## 7. Summarizer 프롬프트

`saved_summaries`에 저장될 심층 요약 생성.

### 7.1 summarizer_v1

```
당신은 콘텐츠 요약 전문가입니다.
원본 콘텐츠를 매거진 글 작성에 충분한 정보가 담긴 요약으로 가공하세요.

---

원본:
- 제목: {{sourceTitle}}
- 출처: {{sourceChannel}}
- URL: {{sourceUrl}}
- 발행일: {{publishedAt}}

원본 내용 (자막 또는 본문):
{{sourceTranscript}}

{{#if ytCommentsContext}}
관련 댓글 (인기 + 최근):
{{ytCommentsContext}}
{{/if}}

사이트 정체성:
- 토픽: {{topic}}
- 페르소나: {{personaName}}

---

작성 지시:

1. **contextSummary** (300~500자)
   - 핵심 내용 한눈에. 매거진 작가가 이걸 보고 글의 방향을 정함.
   - 무슨 주제인지, 핵심 주장/사실이 뭔지, 왜 중요한지.

2. **reportSummary** (1000~2000자)
   - 글 작성에 필요한 모든 디테일 포함:
     - 핵심 주장의 근거/예시
     - 언급된 통계/날짜/수치 (있다면 정확히)
     - 등장 인물/회사/도구의 맥락
     - 원본의 흐름 (도입→본문→결론)
     - 잠재적 인용 가능한 부분 (출처 명확하게)
   - **원본에 없는 정보를 만들지 마세요.**

3. **category**
   - 사이트의 섹션 중 하나에 해당하는 분류
   - 예: 'news', 'tools', 'usecases', 'tutorial'

4. **topicCluster** (선택)
   - 같은 주제의 다른 글과 묶을 수 있는 클러스터 키워드

5. **tags**: 5~10개. SEO + 분류 양쪽 고려.

{{#if ytCommentsContext}}
6. **ytCommentsContext** (있을 때만)
   - popularComments: 가장 많은 좋아요 5개
   - recentComments: 최근 5개
   - sentimentSummary: 댓글 전반의 분위기 (200자)
{{/if}}

---

응답 형식 (JSON):

\`\`\`json
{
  "contextSummary": "...",
  "reportSummary": "...",
  "category": "news",
  "topicCluster": "openai-updates",
  "tags": ["...", "..."],
  "ytCommentsContext": {
    "popularComments": [...],
    "recentComments": [...],
    "sentimentSummary": "..."
  }
}
\`\`\`
```

---

## 8. Evaluator 프롬프트

content-pipeline.md 4.5에서 요약 언급. 여기 전체.

### 8.1 evaluator_v1

```
당신은 매거진 큐레이터입니다.
다음 후보가 이 매거진에 적합한 글의 소재가 될 수 있는지 0~100점으로 평가하세요.

---

매거진 정보:
- 사이트: {{siteName}} ({{topic}})
- 섹션: {{sectionName}}
- 페르소나: {{personaName}}
- 페르소나 설명: {{personaDescription}}

후보:
- 제목: {{sourceTitle}}
- 출처: {{sourceChannel}}
- 발행일: {{publishedAt}}
- 길이: {{durationSec}}초 (영상) 또는 {{contentLength}}자 (글)
- 내용 미리보기 (1500자):
{{transcriptPreview}}

---

평가 기준 (총 100점):

1. **매거진 주제와의 관련성** (40점)
   - 사이트 토픽 ({{topic}})과 정확히 일치 → 35~40
   - 인접 분야 → 20~30
   - 거리 멀거나 무관 → 0~15

2. **정보의 새로움/유용성** (30점)
   - 신규 발표/출시/소식 → 25~30
   - 알려진 내용의 새로운 각도 → 15~25
   - 반복되거나 outdated → 0~15

3. **글 작성 가능 여부** (20점)
   - 자료가 충분 (자막, 댓글, 디테일) → 15~20
   - 일부 부족 → 8~15
   - 너무 빈약 → 0~7

4. **클릭 가능성** (10점)
   - 제목이 명확하고 흥미 → 7~10
   - 평범 → 4~7
   - 약함 → 0~4

---

다음 flag도 표시:

- `low_quality`: 정보 빈약, 광고성 콘텐츠
- `paywall`: 본문 접근 제한
- `duplicate`: 이미 다룬 주제일 가능성 (제목/내용 유사)
- `too_old`: 정보가 outdated (3개월 이상 + outdated 신호)
- `fake_news`: 신뢰성 의심
- `off_topic`: 주제 벗어남
- `clickbait`: 제목과 내용 불일치 의심

---

응답 형식 (JSON):

\`\`\`json
{
  "score": 78,
  "reasoning": "주제 관련성 높고 자료 풍부. 다만 발행 1주 지나 새로움 점수 낮음.",
  "flags": ["..."],
  "scoreBreakdown": {
    "relevance": 36,
    "novelty": 22,
    "writability": 18,
    "clickability": 8
  }
}
\`\`\`
```

---

## 9. Authority Outline Generator 프롬프트

authority-building.md 3.3~3.4에서 요약. 여기 통합.

### 9.1 outline_decompose_v1 (1단계)

위 authority-building.md 3.3 그대로.

### 9.2 outline_articles_v1 (2단계)

위 authority-building.md 3.4 그대로.

### 9.3 outline_dependencies_v1 (3단계)

```
당신은 권위 매거진의 구조 설계자입니다.

다음 글이 어떤 다른 글들에 의존하는지 결정하세요:

대상 글:
- ID: {{articleId}}
- Tier: {{articleTier}}
- 제목: {{articleTitle}}
- 요약: {{articleSummary}}

선행 후보 (이 글이 의존할 수 있는 글들):
{{#each potentialDependencies}}
- {{this.articleId}} ({{this.tier}}): {{this.title}}
  요약: {{this.summary}}
{{/each}}

---

판단 기준:

1. 이 글이 후보 글의 개념을 전제로 하는가? (개념적 의존)
2. 이 글이 후보 글에서 정의된 용어/이론을 사용하는가?
3. 이 글의 독자가 후보 글을 미리 읽었어야 이해할 수 있는가?

선택 규칙:
- 너무 많이 의존하지 않기 (최대 4개)
- Tier 1 글은 의존 없음 (반환: [])
- Tier 2 글은 Tier 1 중 1~3개
- Tier 3 글은 Tier 1+2 중 2~4개

---

응답 형식 (JSON):

\`\`\`json
{
  "dependsOn": ["auth-001", "auth-003"],
  "reasoning": "이 글은 X와 Y의 개념을 전제로 함"
}
\`\`\`
```

---

## 10. Comment Persona 프롬프트

ai-comment-system.md에서 5개 페르소나 상세. 여기는 공통 프롬프트 골격만.

### 10.1 comment_persona_v1 (공통)

```
당신은 {{personaName}}입니다. 다음은 당신의 페르소나입니다:

{{personaDescription}}

말투 가이드: {{voiceGuide}}
당신의 특징적 표현: {{signatureExpressions}}
절대 쓰지 않을 표현: {{forbiddenPhrases}}

---

지금 다음 글에 댓글을 달려고 합니다:

글 제목: {{postTitle}}
글 요약: {{postExcerpt}}
글 핵심 포인트: {{postKeyPoints}}

---

지시:

1. 댓글 길이: {{minWords}}~{{maxWords}}단어
2. 톤: {{tone}}
3. 형식: {{formality}}

4. 다음 행동 패턴 중 하나를 자연스럽게 선택:
   - 새로운 관점 추가
   - 본문 일부에 동의 + 작은 반박
   - 자기 경험 공유
   - 추가 질문 던지기
   - 미묘한 회의/유머

5. **금기**:
   - 본문 내용을 그대로 반복하지 말 것
   - "좋은 글이네요" 같은 무내용 칭찬 금지
   - 정치/종교 등 사이트 주제 외 발언 금지

6. **자연스러움**:
   - 페르소나의 직업/관심사가 댓글에서 자연스럽게 묻어나야
   - 너무 정돈된 문장보다는 진짜 사람 같은 흐름
   - 가끔 짧은 한 문장 댓글도 OK

---

응답 형식: 댓글 본문만 (JSON 아님, 평문).
```

---

## 11. 프롬프트 자산 버전 관리

### 11.1 어떻게 버전이 늘어나는가

운영자가 `/prompts` 페이지에서 [편집] 클릭 → 새 버전 생성.

```typescript
async function createNewPromptVersion(
  promptId: string,
  newTemplate: string,
  changelog: string,
): Promise<PromptAsset> {
  // 1. 현재 latest 가져오기
  const latest = await db.collection('prompt_assets')
    .where('role', '==', extractRole(promptId))
    .where('isLatest', '==', true)
    .limit(1).get()
  
  // 2. 현재 latest의 isLatest=false
  if (!latest.empty) {
    await latest.docs[0].ref.update({ isLatest: false })
  }
  
  // 3. 새 버전 생성
  const newVersion = (latest.empty ? 0 : latest.docs[0].data().version) + 1
  const newId = `${extractRole(promptId)}_v${newVersion}`
  
  await db.collection('prompt_assets').doc(newId).set({
    promptId: newId,
    role: extractRole(promptId),
    version: newVersion,
    isLatest: true,
    template: newTemplate,
    variables: extractVariables(newTemplate),
    targetModel: latest.empty ? 'any' : latest.docs[0].data().targetModel,
    usedBySiteIds: [],                  // 새 버전은 처음엔 빈
    metrics: defaultMetrics(),
    description: '',
    createdAt: serverTimestamp(),
    createdBy: getCurrentAdminEmail(),
    changelog,
  })
  
  return await getPrompt(newId)
}
```

### 11.2 사이트별 적용 (롤아웃)

운영자가 새 버전을 일부 사이트에만 적용해 검증 후 전체 롤아웃.

```typescript
// 1단계: A/B 테스트
await assignPromptToSite(siteId='ai-kr', promptId='writer_v3')
// 다른 사이트는 여전히 writer_v2 사용

// 2단계: 며칠간 metrics 비교
const v2Metrics = await getPromptMetrics('writer_v2')
const v3Metrics = await getPromptMetrics('writer_v3')

// 3단계: v3가 더 좋으면 전체 롤아웃
await rolloutPromptToAllSites(promptId='writer_v3')
```

`PromptAsset.metrics`가 자동 추적: 호출 횟수 / 성공률 / 평균 지연 / 비용.

### 11.3 프롬프트 호출 시 모델 + 버전 자동 결정

```typescript
async function callAi(role: string, variables: Record<string, any>) {
  // 1. 호출하는 사이트의 prompt 버전 결정
  const siteId = variables.siteId
  const promptId = await getPromptForSite(siteId, role) || `${role}_latest`
  
  // 2. prompt template 가져오기 (메모리 캐시)
  const prompt = await getCachedPrompt(promptId)
  
  // 3. 변수 치환
  const rendered = renderPrompt(prompt.template, variables)
  
  // 4. 모델 호출
  const result = await aiService.complete({
    model: prompt.targetModel === 'any' ? defaultModelFor(role) : prompt.targetModel,
    prompt: rendered,
    expectJson: true,
  })
  
  // 5. metrics 갱신 (비동기)
  updatePromptMetrics(promptId, result).catch(console.error)
  
  return result
}
```

---

## 12. 모델 폴백 체인

각 역할에 대해 폴백 모델 체인 정의. 1차 모델 다운 시 자동 전환.

```typescript
// lib/ai/fallback-chain.ts

const FALLBACK_CHAINS: Record<string, string[]> = {
  writer: ['claude-opus-4-7', 'gpt-5', 'gemini-pro'],
  verifier: ['gpt-5', 'gemini-pro', 'claude-opus-4-7'],   // Writer와 다른 회사 우선
  editor: ['claude-opus-4-7', 'gpt-5'],
  summarizer: ['claude-sonnet-4-6', 'gpt-5-mini', 'gemini-flash'],
  evaluator: ['gpt-5-mini', 'claude-sonnet-4-6', 'gemini-flash'],
  comment_persona: ['gpt-5', 'gemini-pro'],
}

async function callWithFallback(
  role: string,
  prompt: string,
  options: CallOptions,
): Promise<AiResult> {
  const chain = FALLBACK_CHAINS[role] || ['claude-opus-4-7']
  
  let lastError: Error | null = null
  for (const model of chain) {
    try {
      return await aiService.call({ model, prompt, ...options })
    } catch (err) {
      lastError = err as Error
      console.warn(`Model ${model} failed, trying next: ${err}`)
      continue
    }
  }
  
  throw new Error(`All models failed for role ${role}: ${lastError?.message}`)
}
```

### 12.1 Writer-Verifier 다른 회사 강제

Verifier 호출 시 Writer 모델과 같은 회사면 폴백 다음 모델로:

```typescript
async function callVerifier(writerModel: string, prompt: string): Promise<VerifierReport> {
  const writerCompany = getCompany(writerModel)  // 'anthropic' / 'openai' / 'google'
  
  for (const model of FALLBACK_CHAINS.verifier) {
    if (getCompany(model) === writerCompany) continue   // 같은 회사 스킵
    
    try {
      return await aiService.verify({ model, prompt })
    } catch (err) {
      continue
    }
  }
  
  throw new Error('No verifier model available with different company')
}
```

---

## 13. 토큰 사용량 추적

각 AI 호출마다 토큰 사용량 + 비용 기록.

```typescript
async function trackUsage(call: AiCall, result: AiResult) {
  const cost = calculateCost(call.model, result.inputTokens, result.outputTokens)
  
  // 1. magazine_logs에 기록
  await db.collection('sites').doc(call.siteId).collection('magazine_logs').add({
    status: 'success',
    triggerType: 'cron',
    pipelineRunId: call.runId,
    sectionId: call.sectionId,
    stage: call.stage,
    durationMs: result.durationMs,
    tokenUsage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUSD: cost,
      model: call.model,
    },
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(addDays(now, 60)),
  })
  
  // 2. 사이트 일일 비용 누적
  await incrementDailyCost(call.siteId, cost)
  
  // 3. 한도 체크
  if (await isDailyBudgetExceeded(call.siteId)) {
    await pauseSite(call.siteId, 'daily_budget_exceeded')
    await createAlert({ severity: 'high', category: 'budget', siteId: call.siteId })
  }
  
  // 4. 프롬프트 자산 metrics 갱신
  await updatePromptMetrics(call.promptId, {
    totalCalls: increment(1),
    successCount: increment(1),
    avgLatencyMs: movingAverage(result.durationMs),
    avgCostUSD: movingAverage(cost),
  })
}
```

상세는 `monitoring-health.md`.

---

## 14. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ AI 3인 체제 호출 흐름 (Writer → Verifier → Editor)
- ✅ 표준 변수 어휘 + `{{var}}` 치환 시스템
- ✅ Writer 프롬프트 3종 (Phase 2 일반 / Phase 1 권위 / Pillar Page)
- ✅ Verifier 프롬프트 + 검색 도구 통합
- ✅ **가짜 출처 3선 방어 시스템** (자기검열 / 검색검증 / 정책처리)
- ✅ Editor 프롬프트 (SEO + 가독성 + 광고/어필리에이트 마커)
- ✅ Summarizer 프롬프트
- ✅ Evaluator 프롬프트 (점수 + flag 시스템)
- ✅ Authority Outline Generator 3단계 프롬프트
- ✅ Comment Persona 공통 골격
- ✅ 프롬프트 자산 버전 관리 (latest / 사이트별 롤아웃 / metrics)
- ✅ 모델 폴백 체인 (Writer-Verifier 다른 회사 강제)
- ✅ 토큰/비용 추적 + 일일 한도

이 문서가 정의하지 않은 것:
- ❌ 5개 페르소나의 구체 캐릭터 + 시간 분산 → `ai-comment-system.md`
- ❌ JSON-LD schema의 type별 구체 형식 → `seo-automation.md`
- ❌ 광고/어필리에이트 마커 → 실제 코드 치환 → `monetization.md`
- ❌ 프롬프트 metrics 임계값 + 알림 → `monitoring-health.md`

---

## 15. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / authority-building.md / content-pipeline.md v1.0 기준. |

---

*이 문서는 메타사이트의 모든 AI 호출 프롬프트의 단일 출처다. 가짜 출처 3선 방어를 포함한 모든 검증 메커니즘을 담고 있다.*

*다음 문서: `ai-comment-system.md` (Tier C 4번 — 마지막)*
