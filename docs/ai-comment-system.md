# META-SITE: AI 댓글 시스템 (ai-comment-system.md)

> 자식 사이트의 발행 글에 자동으로 다양한 페르소나의 댓글을 추가하는 시스템.
> **모든 AI 댓글은 🤖 라벨로 명시되어 사용자를 속이지 않는다.**
> core.md "7. AI 댓글 시스템"의 상세 + ai-roles-and-prompts.md 10장 Comment Persona 골격의 페르소나별 구현.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ ai-roles-and-prompts.md     (Writer/Verifier/Editor 등)
  └─ ai-comment-system.md        ★ 이 문서 — 5 페르소나 댓글 봇

[Tier C 완료. 다음은 Tier D — SEO/수익화]
```

이 문서는:
- **AI 댓글의 윤리 원칙**을 명시한다 (🤖 라벨 의무).
- 5개 기본 페르소나의 구체 캐릭터를 정의한다.
- 시간 분산 발행 알고리즘 + 사람 우선 메커니즘을 설계한다.

---

## 1. 핵심 원칙

### 1.1 윤리: 속이지 않는다 (★)

> **"AI 댓글은 무조건 🤖 라벨이 붙는다. 예외 없다."**

```
김철수 ✓
"이 글에서 다룬 RAG 부분이 정말 명쾌하네요..."
2시간 전

🤖 회의적인 회계사 (AI)
"숫자로 보니 흥미롭긴 한데, ROI 계산이 빠진 것 같습니다..."
4시간 전
```

- AI 댓글은 사람 댓글과 **시각적으로 구분**된다 (배경색 또는 구분선).
- 댓글 옆에 작은 텍스트로 "AI" 또는 "🤖 AI 어시스턴트" 표시.
- 사용자가 호버하면 "이 댓글은 AI가 생성했습니다" 툴팁.
- **사람인 척 하지 않는다.**

### 1.2 왜 AI 댓글이 필요한가

논쟁의 여지가 있는 결정. 그러나 다음 이유로 정당화:
- **빈 댓글난 vs 활기 있는 토론** — 사용자 신뢰감/체류시간 향상
- **다양한 관점 제시** — 단일 AI가 아닌 5개 페르소나가 다른 각도로
- **권위 시그널** — 검색엔진/AI 검색이 "활성 사이트"로 인식
- **추가 컨텍스트** — 본문에 없는 보충 정보를 댓글로

윤리 라벨 + 다양성 + 품질 게이트가 받침.

### 1.3 사람 우선

> **"사람 댓글이 달리면 AI는 한 발 물러난다."**

- 사람 댓글이 달리면 같은 글에 예약된 AI 댓글 1~2개가 자동 취소
- 사람 댓글에 직접적인 답글은 AI가 매우 신중하게 (또는 안 함)
- AI끼리의 토론은 사람이 끼어들면 즉시 중단

---

## 2. 5개 기본 페르소나

자식 사이트마다 5개 페르소나를 자동 등록 (또는 커스텀). 5개여야 다양성 확보 + 한 페르소나 과사용 방지.

### 2.1 페르소나 카탈로그

#### Persona 1 — 회의적인 회계사 (skeptical_accountant)

```typescript
{
  personaId: 'persona_skeptical_accountant',
  name: '회의적인 회계사',
  characterDescription: `
    30대 후반의 전 회계법인 시니어. 숫자로 증명되지 않은 주장은 의심합니다.
    효율성과 비용 효과를 늘 묻습니다. 이론보다 실전 적용 가능성을 봅니다.
    상냥하지만 단호합니다.
  `,
  voiceGuide: '단호하고 직설적. 수치/근거를 묻는 질문 빈도 높음. "근데"로 시작하는 작은 반박 자주.',
  modelPreference: 'gpt-5',
  commentLengthRange: [15, 80],
  emojiUsage: 'minimal',
  formality: 'professional',
  forbiddenPhrases: ['좋은 글이네요', '감사합니다', '👏'],
  signatureExpressions: [
    '근데 ~는 어떻게 측정하나요?',
    'ROI로 보면 ~',
    '실무에서 ~ 해본 입장에서는',
  ],
  roleInDiscussion: '비판적 검증자',
}
```

#### Persona 2 — 호기심 많은 학생 (curious_student)

```typescript
{
  personaId: 'persona_curious_student',
  name: '호기심 많은 학생',
  characterDescription: `
    20대 초반, 이제 막 이 분야에 입문한 사람. 모르는 것이 많고 그래서 질문이 많습니다.
    유머와 호기심이 묻어나는 댓글. 가끔 엉뚱한 질문도 하지만 핵심을 짚습니다.
  `,
  voiceGuide: '캐주얼한 어조. 질문형 댓글 많음. "어?" "오~" "혹시" 등 친근한 표현.',
  modelPreference: 'claude-opus-4-7',
  commentLengthRange: [10, 60],
  emojiUsage: 'moderate',
  formality: 'casual',
  forbiddenPhrases: ['전문가다운', '제 의견으로는'],
  signatureExpressions: [
    '오~ 이거 처음 들어봐요',
    '혹시 ~도 가능한가요?',
    '근데 입문자인 저한테는 ~',
  ],
  roleInDiscussion: '입문자 시선 + 질문 던지기',
}
```

#### Persona 3 — 경험 많은 시니어 (seasoned_veteran)

```typescript
{
  personaId: 'persona_seasoned_veteran',
  name: '경험 많은 시니어',
  characterDescription: `
    40대 후반, 이 분야에서 15년+ 경험. 옛날 방식과 지금 방식 모두 알고 있습니다.
    역사적 맥락을 자주 언급. 감정적이지 않고 차분합니다.
    가끔 "예전엔 ~"으로 시작하는 회상.
  `,
  voiceGuide: '차분한 권위. 역사적 비교 자주. 신중한 단정.',
  modelPreference: 'claude-opus-4-7',
  commentLengthRange: [30, 100],
  emojiUsage: 'none',
  formality: 'professional',
  forbiddenPhrases: ['요즘 젊은이들은', 'MZ세대'],
  signatureExpressions: [
    '예전 ~ 시절에 비교하면',
    '제가 본 패턴으로는',
    '~ 도 비슷한 흐름이 있었습니다',
  ],
  roleInDiscussion: '맥락 + 역사적 관점 추가',
}
```

#### Persona 4 — 까칠한 베테랑 (grumpy_expert)

```typescript
{
  personaId: 'persona_grumpy_expert',
  name: '까칠한 베테랑',
  characterDescription: `
    실무 전문가, 이론보다 실전 신봉. 과대광고를 싫어합니다.
    날카로운 질문 + 작은 비판이 특기. 그러나 본질은 합리적이고 도움이 되는 의견을 줍니다.
    독설은 아니고, 솔직한 반대 의견.
  `,
  voiceGuide: '직설적이고 약간 까칠. "이게 정말 새로운 건가" 같은 회의. 하지만 건설적.',
  modelPreference: 'gpt-5',
  commentLengthRange: [20, 70],
  emojiUsage: 'none',
  formality: 'professional',
  forbiddenPhrases: ['최고', '완벽한', '혁신적'],
  signatureExpressions: [
    '이게 진짜 새로운 거 맞나요',
    '~는 5년 전부터 있던 거 아닌가',
    '실제로 돌려보면 ~ 다릅니다',
  ],
  roleInDiscussion: '과대광고 견제 + 실전 검증',
}
```

#### Persona 5 — 친절한 가이드 (helpful_guide)

```typescript
{
  personaId: 'persona_helpful_guide',
  name: '친절한 가이드',
  characterDescription: `
    교육자/멘토 성향. 본문에서 다룬 내용을 더 풀어서 설명하거나
    추가 자료를 제안합니다. 다른 댓글에 답글로 도움 주는 역할.
    따뜻하고 격려하는 톤.
  `,
  voiceGuide: '친절하고 명확. 보충 설명 자주. 다른 댓글에 답글 달기.',
  modelPreference: 'claude-opus-4-7',
  commentLengthRange: [25, 80],
  emojiUsage: 'minimal',
  formality: 'professional',
  forbiddenPhrases: [],
  signatureExpressions: [
    '좋은 질문이에요. ~',
    '추가로 ~도 도움 될 수 있어요',
    '이 부분은 ~ 측면에서 보면',
  ],
  roleInDiscussion: '맥락 보충 + 다른 댓글에 답글',
}
```

### 2.2 페르소나 다양성 보장

5개 페르소나의 역할이 겹치지 않도록 설계:
- **회의적 회계사**: 비판적 검증
- **호기심 학생**: 질문 던지기
- **시니어**: 역사적 맥락
- **까칠한 베테랑**: 과대광고 견제
- **친절한 가이드**: 보충/답글

한 글에 5개 페르소나가 다 등장하지는 않음. 8~12개 댓글 중 페르소나 4개 정도 + 일부 페르소나는 답글.

### 2.3 사이트별 커스터마이징

기본 5개를 그대로 쓰거나, 자식 사이트의 토픽/언어에 맞게 변형:

```
travel-kr 사이트:
   회의적인 회계사 → 가성비 따지는 여행자
   호기심 학생 → 첫 해외여행 준비생
   시니어 → 25년 차 여행 가이드
   까칠한 베테랑 → 까다로운 미식가
   친절한 가이드 → 친근한 현지인 친구
```

운영자가 `/sites/{id}/personas` 페이지에서 편집.

---

## 3. 댓글 생성 알고리즘

### 3.1 트리거: 글 발행 직후

`triggerPublish()` 후 부가 작업으로 호출 (publisher-adapters.md 9장 참조).

```typescript
async function schedulePostComments(siteId: string, postId: string) {
  const site = await getChildSite(siteId)
  if (!site.settings?.curation?.aiCommentsEnabled) return
  
  const post = await getCuratedPost(siteId, postId)
  
  // 1. 페르소나 조합 결정
  const planForThisPost = await planComments(siteId, post)
  // 예: { totalComments: 9, persona1: 2, persona2: 1, persona3: 2, persona4: 0, persona5: 4 (답글) }
  
  // 2. 시간 분산 스케줄
  const schedule = generateTimeDistribution(planForThisPost.totalComments)
  // 예: [+30min, +2h, +5h, +1d, +2d, +3d, +5d, ...]
  
  // 3. 각 댓글 예약
  for (let i = 0; i < planForThisPost.totalComments; i++) {
    const persona = pickPersona(planForThisPost, i)
    const visibleAt = addToNow(schedule[i])
    
    await db.collection('sites').doc(siteId)
      .collection('curated_posts').doc(postId)
      .collection('comments').add({
        commentId: generateId(),
        postId,
        authorType: 'ai',
        authorName: persona.name,
        personaId: persona.personaId,
        modelUsed: persona.modelPreference,
        content: '',                                // 아직 생성 안 됨
        scheduledAt: visibleAt,
        visibleAt,
        status: 'pending',
        likes: 0,
        replyCount: 0,
        createdAt: serverTimestamp(),
      })
  }
}
```

### 3.2 댓글 수 결정 (planComments)

```typescript
async function planComments(siteId: string, post: CuratedPost): Promise<CommentPlan> {
  const baseCount = randomInt(5, 12)              // 5~12개
  
  // 글 길이에 비례 가산
  const lengthBonus = Math.floor(post.body.length / 5000)  // 5000자당 +1
  
  // 카테고리별 가중 (논쟁적 토픽이면 댓글 많이)
  const categoryWeight = {
    news: 1.2,
    tools: 1.0,
    usecases: 0.9,
    tutorial: 0.8,
  }[post.category] || 1.0
  
  const totalComments = Math.floor((baseCount + lengthBonus) * categoryWeight)
  
  return {
    totalComments: Math.min(totalComments, 15),    // 최대 15개
    personaDistribution: pickPersonaDistribution(totalComments),
  }
}
```

### 3.3 시간 분산 알고리즘 (generateTimeDistribution)

> **"진짜 토론처럼 보이려면 댓글이 시간대별로 자연스럽게 분포해야 한다."**

#### 3.3.1 분포 패턴

```
첫 1시간: 0~2개         (빠른 반응)
1~6시간: 2~3개          (피크 — 사람들이 글 발견)
6~24시간: 1~2개         (천천히)
1~3일: 1~2개            (지나가다 본)
3~7일: 0~1개            (꼬리)
```

총 10개 댓글이면:
```
+30min, +1h, +2h30, +4h, +6h, +12h, +1d, +2d, +4d, +6d
```

#### 3.3.2 구현

```typescript
function generateTimeDistribution(count: number): number[] {
  // 누적 분포: 1h-30%, 6h-55%, 24h-75%, 3d-92%, 7d-100%
  
  const distribution: number[] = []
  const seed = Math.random()                      // 사이트별 랜덤성
  
  for (let i = 0; i < count; i++) {
    const cumulative = (i + 1) / count            // 0..1
    
    let minutes: number
    if (cumulative < 0.3) {
      minutes = randomInt(15, 60)                 // 첫 1시간 안
    } else if (cumulative < 0.55) {
      minutes = randomInt(60, 360)                // 1~6시간
    } else if (cumulative < 0.75) {
      minutes = randomInt(360, 1440)              // 6h~24h
    } else if (cumulative < 0.92) {
      minutes = randomInt(1440, 4320)             // 1~3일
    } else {
      minutes = randomInt(4320, 10080)            // 3~7일
    }
    
    distribution.push(minutes)
  }
  
  return distribution.sort((a, b) => a - b)       // 오름차순
}
```

#### 3.3.3 시간대 보정 (선택)

새벽 2~6시 KST에는 댓글 발행 안 함 (사람들이 잘 시간). `visibleAt`이 이 시간대면 다음날 7시로 미룸.

```typescript
function adjustForNighttime(scheduled: Date, timezone: string): Date {
  const local = scheduled.toLocaleString('en-US', { timeZone: timezone })
  const hour = new Date(local).getHours()
  
  if (hour >= 2 && hour < 7) {
    // 다음날 7~9시 사이로 미룸
    const adjusted = new Date(scheduled)
    adjusted.setHours(randomInt(7, 9), randomInt(0, 59), 0, 0)
    if (hour < 7) adjusted.setDate(scheduled.getDate())  // 같은 날 7시
    else adjusted.setDate(scheduled.getDate() + 1)
    return adjusted
  }
  
  return scheduled
}
```

### 3.4 댓글 본문 생성 (Cron)

매 5분마다 Cron이 `visibleAt <= now` AND `status = 'pending'` 댓글들을 처리:

```typescript
// app/api/cron/generate-comments/route.ts

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorized()
  
  // 1. 지금 공개해야 할 pending 댓글들
  const now = serverTimestamp()
  const pending = await db.collectionGroup('comments')
    .where('status', '==', 'pending')
    .where('visibleAt', '<=', now)
    .limit(50)                                    // 한 번에 너무 많이 X
    .get()
  
  for (const doc of pending.docs) {
    const comment = doc.data()
    
    // 2. 사람이 먼저 댓글 달았으면 일부 AI 댓글 취소
    const humanCount = await countHumanComments(comment.postId)
    if (humanCount > 0 && shouldCancelAi(humanCount)) {
      await doc.ref.update({ status: 'hidden' })
      continue
    }
    
    // 3. 페르소나 + 글 정보 fetch
    const persona = await getPersona(comment.personaId)
    const post = await getCuratedPost(extractSiteId(doc.ref), comment.postId)
    
    // 4. AI 호출
    try {
      const content = await generateCommentContent(persona, post)
      
      await doc.ref.update({
        content,
        status: 'visible',
      })
    } catch (err) {
      // 실패 시 1회 재시도, 그래도 실패면 hidden
      await retryOrHide(doc.ref, err)
    }
  }
  
  return NextResponse.json({ processed: pending.size })
}

function shouldCancelAi(humanCount: number): boolean {
  // 사람 댓글 1개 → AI 1~2개 취소
  // 사람 댓글 3개+ → AI 모두 취소
  if (humanCount >= 3) return true
  if (humanCount >= 1) return Math.random() < 0.3  // 30% 확률 취소
  return false
}
```

### 3.5 댓글 내용 생성 (generateCommentContent)

ai-roles-and-prompts.md 10장 comment_persona_v1 골격 + 페르소나 데이터:

```typescript
async function generateCommentContent(persona: Persona, post: CuratedPost): Promise<string> {
  const prompt = renderPrompt(COMMENT_PERSONA_TEMPLATE, {
    personaName: persona.name,
    personaDescription: persona.characterDescription,
    voiceGuide: persona.voiceGuide,
    signatureExpressions: persona.signatureExpressions.join(', '),
    forbiddenPhrases: persona.forbiddenPhrases.join(', '),
    postTitle: post.title,
    postExcerpt: post.excerpt,
    postKeyPoints: extractKeyPoints(post),         // 본문에서 핵심 3~5개 추출
    minWords: persona.commentLengthRange[0],
    maxWords: persona.commentLengthRange[1],
    tone: persona.formality,
    formality: persona.formality,
  })
  
  const response = await aiService.call({
    role: 'comment_persona',
    model: persona.modelPreference,
    prompt,
    expectJson: false,                             // 평문 댓글
    maxTokens: 200,
  })
  
  return response.text.trim()
}

function extractKeyPoints(post: CuratedPost): string {
  // FAQ + 본문의 H2 헤더 + 결론 1~2 문장 추출
  const h2Headers = post.body.match(/^## .+$/gm) || []
  const faqQuestions = post.faq?.slice(0, 3).map(f => f.question) || []
  
  return [...h2Headers, ...faqQuestions].join('\n')
}
```

---

## 4. 답글 (AI 답글 + AI ↔ AI 토론)

### 4.1 AI가 다른 AI 댓글에 답글

`친절한 가이드` 페르소나는 다른 AI 댓글에 답글 자주 (`roleInDiscussion: '맥락 보충 + 답글'`).

```typescript
function shouldAiReplyToAiComment(persona: Persona, originalCommentPersonaId: string): boolean {
  if (persona.personaId !== 'persona_helpful_guide') return false  // 가이드만 답글
  if (persona.personaId === originalCommentPersonaId) return false // 자기 자신 답글 X
  
  return Math.random() < 0.4                                       // 40% 확률
}
```

답글 시 `parentCommentId` 설정.

### 4.2 AI ↔ AI 토론 (조심스럽게)

가끔 (5% 확률) 한 AI가 다른 AI에 살짝 반박. 이건 **회의적 회계사** 또는 **까칠한 베테랑**이 다른 페르소나에게.

```typescript
async function maybeAiDisagreement(
  newCommentPersona: Persona,
  postId: string,
): Promise<{ parentCommentId?: string; promptOverride?: string }> {
  
  if (newCommentPersona.roleInDiscussion !== '비판적 검증자' && 
      newCommentPersona.roleInDiscussion !== '과대광고 견제 + 실전 검증') {
    return {}                                       // 비판자 페르소나만 가능
  }
  
  if (Math.random() > 0.05) return {}              // 5% 확률
  
  // 같은 글의 visible 상태 AI 댓글 중 1개 픽
  const otherAiComments = await getOtherAiComments(postId, newCommentPersona.personaId)
  if (otherAiComments.length === 0) return {}
  
  const target = randomChoice(otherAiComments)
  
  return {
    parentCommentId: target.commentId,
    promptOverride: `다음 AI 댓글에 가벼운 반박 또는 다른 관점을 제시하세요:
"${target.content}"
당신의 페르소나로 자연스럽게.`,
  }
}
```

### 4.3 사람 댓글에는 답글 신중하게

> **"사람 댓글에 AI가 답글 다는 건 미묘하다. 거의 안 한다."**

기본은 **사람 댓글에 AI 답글 없음**. 다음 경우만 예외:
- 사람이 명백한 질문을 했는데 1주일 이상 답이 없을 때
- `친절한 가이드` 페르소나만, 매우 신중한 답글

```typescript
async function maybeRespondToHumanQuestion(humanComment: PostComment) {
  if (humanComment.authorType !== 'human') return
  if (!isQuestion(humanComment.content)) return
  if (daysSince(humanComment.createdAt) < 7) return  // 1주일 대기
  
  const guide = await getPersona('persona_helpful_guide')
  
  await scheduleReply({
    parentCommentId: humanComment.commentId,
    persona: guide,
    visibleAt: addHoursToNow(2),
  })
}
```

매 일요일 자정에 1주일+된 무응답 사람 질문 점검.

---

## 5. 표시 규칙 (UI)

### 5.1 자식 사이트 댓글 영역

```html
<div class="comments">
  <div class="comment human">
    <div class="comment-header">
      <span class="author">김철수</span>
      <span class="badge verified">✓</span>
      <span class="time">2시간 전</span>
    </div>
    <div class="comment-body">...</div>
  </div>
  
  <div class="comment ai" data-persona="skeptical_accountant">
    <div class="comment-header">
      <span class="author">회의적인 회계사</span>
      <span class="badge ai" title="이 댓글은 AI가 생성했습니다">🤖 AI</span>
      <span class="time">4시간 전</span>
    </div>
    <div class="comment-body">...</div>
  </div>
</div>
```

### 5.2 시각적 구분

```css
.comment.ai {
  background: rgba(99, 102, 241, 0.05);     /* 미세한 보라 배경 */
  border-left: 3px solid var(--info);
}

.comment.ai .badge.ai {
  font-size: 0.85em;
  color: var(--info);
  font-weight: 500;
}
```

### 5.3 사이트 푸터 안내

자식 사이트 푸터에 **명시적 안내**:

> 🤖 이 사이트는 AI 생성 댓글을 일부 사용합니다. 
> AI 댓글은 항상 🤖 AI 라벨이 표시됩니다.
> [정책 자세히 보기]

`/about/ai-policy` 페이지에 상세 정책 (자식 사이트 생성 시 자동 페이지 추가).

---

## 6. 모니터링과 한도

### 6.1 자식 사이트별 한도

```typescript
interface CommentLimits {
  maxCommentsPerPost: number          // 15
  maxCommentsPerDay: number           // 100 (전체 글 합산)
  maxAiReplyDepth: number             // 2 (AI ↔ AI 답글 깊이)
  maxAiToHumanReplies: number         // 1 (사람 댓글당 AI 답글 최대)
}
```

`settings/curation`에 저장. 운영자가 변경 가능.

### 6.2 품질 모니터링

매주 일요일 자정 자동:

```typescript
async function weeklyCommentQualityReport(siteId: string) {
  const lastWeekComments = await getCommentsFromLastWeek(siteId)
  
  const metrics = {
    totalGenerated: lastWeekComments.length,
    avgPerPost: ...,
    
    flaggedByUsers: lastWeekComments.filter(c => c.reportCount > 0).length,
    
    personaDistribution: groupBy(lastWeekComments, 'personaId'),
    // → 한 페르소나가 30% 넘으면 다양성 부족 알림
    
    avgLikes: average(lastWeekComments.map(c => c.likes)),
    
    failedGenerations: ...,
  }
  
  if (metrics.flaggedByUsers / metrics.totalGenerated > 0.05) {
    await createAlert({
      severity: 'medium',
      title: `AI 댓글 신고 비율 높음: ${siteId}`,
      message: `5% 이상 신고됨. 페르소나 점검 필요.`,
    })
  }
  
  return metrics
}
```

### 6.3 사용자 신고 처리

자식 사이트 댓글에 [신고] 버튼. 신고 시:
- `comment.reportCount` 증가
- 3회 이상 신고된 댓글 → 자동 hidden + 운영자 알림
- 운영자는 어드민에서 [복원] 또는 [영구삭제]

---

## 7. 비용 추정

### 7.1 댓글 생성 비용

```
페르소나 댓글 1개:
  - 입력 토큰: ~800 (페르소나 + 글 정보)
  - 출력 토큰: ~50 (짧은 댓글)
  - 모델: GPT-5 또는 Claude Opus
  - 비용: ~$0.012/댓글

자식 사이트 1개당 일 18편 발행 × 평균 9개 댓글 = 162 댓글/일
  - 일 비용: $1.95
  - 월 비용: ~$58

자식 사이트 6개: 월 ~$350
```

### 7.2 비용 최적화

- 댓글 모델은 가벼운 옵션 (Claude Sonnet 또는 GPT-5 mini) 가능
- 짧은 댓글일수록 토큰 적게
- 답글은 컨텍스트 더 짧게 (부모 댓글 + 글 제목만)

---

## 8. 사이트 생성 시 자동 등록

site-creation-flow.md "단계 4: 콘텐츠 정체성"에서 페르소나는 1개 자동 제안만 됨. AI 댓글 시스템 활성화하면 5개 기본 페르소나가 자동 등록.

```typescript
async function setupDefaultPersonasForSite(
  siteId: string,
  topic: string,
  language: string,
) {
  const PERSONA_TEMPLATES = [
    { id: 'persona_skeptical_accountant', /* ... */ },
    { id: 'persona_curious_student', /* ... */ },
    { id: 'persona_seasoned_veteran', /* ... */ },
    { id: 'persona_grumpy_expert', /* ... */ },
    { id: 'persona_helpful_guide', /* ... */ },
  ]
  
  // 사이트 토픽/언어에 맞게 약간 변형
  const customized = await aiService.customizePersonas(PERSONA_TEMPLATES, { topic, language })
  
  for (const persona of customized) {
    await db.collection('sites').doc(siteId).collection('personas').doc(persona.personaId).set({
      ...persona,
      isActive: true,
      totalComments: 0,
      createdAt: serverTimestamp(),
    })
  }
}
```

---

## 9. 운영자 컨트롤

### 9.1 페르소나 활성화/비활성화

`/sites/{id}/personas` 페이지 (meta-control-spec.md [9])에서:
- 각 페르소나 [편집] [일시정지]
- 새 페르소나 [+ 추가]
- 페르소나 샘플 댓글 5개 미리보기

### 9.2 댓글 수동 개입

- 글 검수 페이지 (meta-control-spec.md [15]) 사이드패널에 예약된 댓글 5개 표시
- [전부 취소] [페르소나 변경] [수동 추가] 버튼

### 9.3 AI 댓글 시스템 전체 비활성화

```typescript
// settings/curation
{
  aiCommentsEnabled: false        // 즉시 모든 페르소나 정지
}
```

기존 발행된 댓글은 유지, 새 글에는 댓글 X.

---

## 10. 답글 알림 시스템 (사람 댓글 대응)

운영자가 사람 댓글에 직접 답글을 달 수 있도록 알림:

```typescript
// 사람 댓글 작성 직후
async function notifyAdminOfHumanComment(comment: PostComment) {
  await createAlert({
    severity: 'low',
    category: 'review_request',
    siteId: extractSiteId(comment.postId),
    title: `사용자 댓글: ${truncate(comment.content, 50)}`,
    message: `${comment.authorName}님이 글에 댓글을 남겼습니다. 답변 검토.`,
    context: { postId: comment.postId, commentId: comment.commentId },
  })
}
```

운영자가 직접 답글 작성 시 `authorType: 'human'`, `authorName: 사이트 운영자명` (예: '운영자 김메타').

---

## 11. 예외 시나리오

### 11.1 글 자체가 논쟁적 (정치/종교/민감)

이런 글에는 AI 댓글 자동 비활성화. 글 메타데이터로 판정:

```typescript
function shouldDisableAiCommentsForPost(post: CuratedPost): boolean {
  const sensitiveCategories = ['politics', 'religion', 'controversial']
  if (sensitiveCategories.includes(post.category)) return true
  
  const sensitiveKeywords = ['선거', '대통령', '종교', '정치']  // 사이트별 정의
  if (sensitiveKeywords.some(kw => post.title.includes(kw))) return true
  
  return false
}
```

### 11.2 답글이 어색하거나 본문 무관

생성된 댓글이 본문과 무관한 일반론이면 자동 hidden:

```typescript
async function validateCommentRelevance(
  comment: string,
  post: CuratedPost,
): Promise<boolean> {
  const embeddingComment = await aiService.embed(comment)
  const embeddingPost = await aiService.embed(post.excerpt)
  
  const similarity = cosineSimilarity(embeddingComment, embeddingPost)
  return similarity > 0.4                          // 임계값
}
```

생성 직후 검사. 임계값 미달이면 1회 재생성, 그래도 미달이면 hidden.

---

## 12. 다음 문서로 넘어가기 전 체크리스트

이 문서가 정의한 것:
- ✅ AI 댓글 윤리 원칙 (🤖 라벨 의무, 사람 우선)
- ✅ 5개 기본 페르소나 (역할/말투/금기/시그니처)
- ✅ 사이트별 커스터마이징 패턴
- ✅ 댓글 수 결정 + 페르소나 분배 알고리즘
- ✅ 시간 분산 알고리즘 (5단계 누적 분포 + 시간대 보정)
- ✅ Cron 기반 댓글 본문 생성
- ✅ AI ↔ AI 답글 + 토론 (5% 확률 반박)
- ✅ 사람 댓글 답글 정책 (1주일+ 질문에만, 가이드 페르소나만)
- ✅ UI 표시 규칙 (시각적 구분 + 푸터 안내)
- ✅ 한도 / 품질 모니터링 / 신고 처리
- ✅ 비용 추정 (월 ~$58/사이트)
- ✅ 사이트 생성 시 5 페르소나 자동 등록
- ✅ 예외: 논쟁적 글 / 무관 댓글 자동 차단

이 문서가 정의하지 않은 것:
- ❌ Comment Persona의 베이스 프롬프트 → `ai-roles-and-prompts.md` 10장 (이미 정의됨)
- ❌ 외부 호스팅(Tistory/Blogger)에서의 AI 댓글 → 지원 안 함 (publisher-adapters.md 능력 매트릭스)
- ❌ reCAPTCHA 검증 + 사람 댓글 spam 차단 → `deployment-guide.md`

---

## 13. Tier C 완료 체크포인트

다음 4개 문서로 콘텐츠 시스템 전체가 정의됐다:

| 문서 | 역할 |
|------|-----|
| `authority-building.md` | Phase 1 권위 구축 (28~42편 자동 생성) |
| `content-pipeline.md` | Phase 2 정기 발행 (SSOKTUBE 4단계 메타 통합) |
| `ai-roles-and-prompts.md` | Writer/Verifier/Editor + 가짜 출처 3선 방어 |
| `ai-comment-system.md` | 5 페르소나 댓글 봇 + 시간 분산 + 사람 우선 |

**Tier C 핵심 주제 — 콘텐츠 신뢰성:**
- 권위 글: 출처 없이도 OK, 단 가짜 출처 절대 금지
- 일반 글: 출처 필수, 검증자 통과 의무
- 댓글: AI 라벨 의무, 사람 우선

이로써 메타사이트가 **자동으로 발행하면서도 신뢰를 잃지 않는** 시스템 골격이 완성됐다.

---

## 14. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. core.md / ai-roles-and-prompts.md v1.0 기준. |

---

*이 문서는 AI 댓글 시스템의 단일 출처다. 5 페르소나 / 시간 분산 / 사람 우선 메커니즘의 모든 결정을 담고 있다.*

*Tier C 완료. 다음 문서: `seo-automation.md` (Tier D 1번)*
