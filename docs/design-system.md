# META-SITE: 디자인 시스템 (design-system.md)

> 메타사이트 어드민의 시각 언어 + 컴포넌트 시스템 + 인터랙션 패턴.
> 운영자 시안 이미지 기반 디자인 결정 + 22개 명세 문서와의 연결.

---

## 0. 이 문서의 위치

```
core.md (WHAT/WHY)
  ├─ ...
  ├─ meta-control-spec.md       (어드민 페이지 와이어프레임)
  └─ design-system.md           ★ 이 문서 — 시각 언어 + 컴포넌트
```

이 문서는:
- 22개 명세 문서가 **무엇을** 보여주는지 정의했다면, 이 문서는 **어떻게** 보여줄지를 정의한다.
- 운영자가 제공한 시안 기반 디자인 결정의 단일 출처.
- meta-control-spec.md의 와이어프레임이 이 디자인 시스템으로 구체화된다.

---

## 1. 디자인 철학

### 1.1 "운영자 1인의 control tower"

> **"많은 정보를 한 화면에. 단 정보 과부하 없이."**

운영자는 매일 30분 미만으로 N개 사이트를 봐야 한다. 디자인 원칙:

- **계층적 정보**: 가장 중요한 것은 가장 크게 / 색이 강하게
- **상태 시각화**: 숫자보다 색/아이콘으로 빠르게 인지
- **클릭 깊이 최소화**: 핵심 정보는 대시보드에서 모두 보임
- **변화율 강조**: 절대 숫자보다 "어제 대비 +18%" 형태

### 1.2 톤 — "전문적인 차분함"

> **"화려하지 않다. 차분하고 단단하다."**

- 채도 낮은 파스텔 (눈 피로 방지)
- 라이트 테마 기본 (긴 시간 사용)
- 부드러운 그림자 (떠 있는 느낌)
- 곡선보다 직선 (정보 도구)
- 이모지 절제 (필요한 자리만)

### 1.3 사용자 — "1년 사용해도 안 질림"

매일 보는 화면이라 트렌디한 디자인보다 **시간이 지나도 안 질리는 디자인**이 우선:

- 검증된 패턴 (대시보드 컨벤션)
- 과한 애니메이션 X
- 무지개 색 X (보라+청록+그린 톤 위주)
- 텍스트 가독성 우선

---

## 2. 컬러 시스템

### 2.1 브랜드 컬러

```
Primary (보라색 — 메타사이트 정체성)
  --color-primary-50:   #f5f3ff
  --color-primary-100:  #ede9fe
  --color-primary-200:  #ddd6fe
  --color-primary-300:  #c4b5fd
  --color-primary-400:  #a78bfa   ← 로고 / 액센트
  --color-primary-500:  #8b5cf6   ← 주요 버튼
  --color-primary-600:  #7c3aed   ← 호버
  --color-primary-700:  #6d28d9
  --color-primary-900:  #4c1d95
```

브랜드 색은 **보라 계열**. 메타사이트가 "여러 사이트를 묶는다"는 의미를 보라색이 잘 표현 (왕관/총괄).

### 2.2 시맨틱 컬러 (상태)

```
Success (정상)
  --color-success-50:   #f0fdf4
  --color-success-100:  #dcfce7
  --color-success-500:  #22c55e   ← 정상 라벨
  --color-success-600:  #16a34a

Warning (경고)
  --color-warning-50:   #fffbeb
  --color-warning-100:  #fef3c7
  --color-warning-500:  #f59e0b   ← 경고 라벨
  --color-warning-600:  #d97706

Error / Critical (오프라인)
  --color-error-50:     #fef2f2
  --color-error-100:    #fee2e2
  --color-error-500:    #ef4444   ← 오프라인 / critical
  --color-error-600:    #dc2626

Info (점검 중 / 정보)
  --color-info-50:      #eff6ff
  --color-info-100:     #dbeafe
  --color-info-500:     #3b82f6   ← 정보 / 점검 중
  --color-info-600:     #2563eb
```

monitoring-health.md 4단계 심각도 매핑:

```
critical → error-500   (#ef4444)
high     → warning-600 (#d97706)
medium   → warning-500 (#f59e0b)
low      → info-500    (#3b82f6)
healthy  → success-500 (#22c55e)
```

### 2.3 KPI 카드 액센트 컬러

대시보드의 5개 KPI 카드는 각각 다른 파스텔로 구분:

```
KPI 1 (운영 중인 사이트):    --color-primary-400   보라
KPI 2 (총 발행 글):           --color-cyan-400      청록 #22d3ee
KPI 3 (총 방문자):            --color-emerald-400   그린 #34d399
KPI 4 (총 페이지뷰):          --color-amber-400     앰버 #fbbf24
KPI 5 (발행 성공률):          --color-rose-400      장미 #fb7185
```

서로 인접하면 시각적 구분 + 인상적. 다른 화면에서는 보라 단일 톤.

### 2.4 중립 컬러 (배경 / 텍스트)

```
Gray (텍스트 + 배경)
  --color-gray-50:   #f9fafb   ← 페이지 배경
  --color-gray-100:  #f3f4f6   ← 카드 배경 (옅게)
  --color-gray-200:  #e5e7eb   ← 보더
  --color-gray-300:  #d1d5db   ← 비활성 보더
  --color-gray-400:  #9ca3af   ← placeholder
  --color-gray-500:  #6b7280   ← 보조 텍스트
  --color-gray-600:  #4b5563   ← 본문 텍스트
  --color-gray-700:  #374151   ← 부제
  --color-gray-800:  #1f2937   ← 제목
  --color-gray-900:  #111827   ← 강조 제목

White:
  --color-white:     #ffffff   ← 카드 / 컨테이너 배경

Background:
  --color-bg:        #f8f9fc   ← 페이지 베이스 (살짝 보라 빛깔)
```

페이지 베이스가 순백이 아닌 `#f8f9fc` — 보라 빛이 살짝 도는 회백색. 메타사이트의 정체성.

### 2.5 컬러 사용 규칙

```
□ 한 화면에서 시맨틱 색은 의미가 일관 (red = 항상 위험)
□ 보라색은 브랜드 액센트 + 주요 버튼만 (남용 X)
□ 텍스트는 gray-600~900 위주 (보라 본문 텍스트 X)
□ 배경은 white 또는 bg, 카드는 white + shadow
□ 다크모드: 1차 출시 후 추가 (현재는 라이트 only)
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```
Primary: Inter (한국어 + 영어 모두 지원, 가독성 우수)
Korean fallback: Pretendard (한국어 최적화 가독)
Monospace: JetBrains Mono (코드 / 숫자 데이터)

CSS:
  font-family: 'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

Pretendard는 한국어, Inter는 영어. 두 폰트가 시각적으로 비슷해 자연스러운 mix.

### 3.2 타입 스케일

```
H1 (페이지 타이틀)      → 28px / 600 / line-height 1.3
H2 (섹션 타이틀)        → 20px / 600 / line-height 1.4
H3 (카드 타이틀)        → 16px / 600 / line-height 1.4
Body (본문)             → 14px / 400 / line-height 1.5
Body Large              → 16px / 400 / line-height 1.6
Caption (보조)          → 12px / 400 / line-height 1.4
KPI 숫자 (강조)         → 32px / 700 / line-height 1.0
KPI 변화율              → 12px / 500
Label (배지)            → 11px / 600 / line-height 1.0 / uppercase optional
```

### 3.3 KPI 숫자의 미세 디테일

이미지에서 본 KPI 숫자 (12 / 1,248 / 128,521):

```css
.kpi-number {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;        /* 큰 숫자는 살짝 좁게 */
  font-variant-numeric: tabular-nums;  /* 숫자 폭 균일 */
  color: var(--color-gray-900);
}
```

`tabular-nums`로 1, 2, 8 같은 숫자 폭이 같아져 정렬 깔끔.

### 3.4 변화율 표시

```
▲ 2  (success, +)
▼ 5  (error, -)
▲ 24.5%
```

```css
.change-positive {
  color: var(--color-success-600);
  &::before { content: '▲ '; font-size: 0.85em; }
}
.change-negative {
  color: var(--color-error-600);
  &::before { content: '▼ '; font-size: 0.85em; }
}
.change-neutral {
  color: var(--color-gray-500);
}
```

### 3.5 텍스트 컬러 계층

```
가장 중요  → gray-900   (KPI 숫자, 메인 제목)
중요       → gray-700~800 (섹션 제목, 본문 강조)
보통       → gray-600   (본문)
보조       → gray-500   (메타 정보, 시간, 작은 라벨)
힌트       → gray-400   (placeholder, 비활성)
```

---

## 4. 레이아웃 그리드

### 4.1 페이지 구조

```
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  [Top Bar]                                    │
│             ├───────────────────────────────────────────────┤
│   사이드바  │  [Main Content Area]                          │
│   240px     │     - 12-column grid                          │
│   고정      │     - max-width: 1440px                       │
│             │     - gap: 24px                                │
│             │                                                │
└─────────────────────────────────────────────────────────────┘
```

```css
:root {
  --layout-sidebar-width: 240px;
  --layout-topbar-height: 64px;
  --layout-content-max-width: 1440px;
  --layout-content-padding: 32px;
  --layout-grid-gap: 24px;
}
```

### 4.2 12-column 그리드

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 col col col col col col col col col col col col
```

KPI 카드 5개: 각 col-span-2 (총 10) + 1.5 gap... 실제로는:

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}
```

5개 균등. 1440px width 기준 카드 폭 ~270px.

### 4.3 메인 콘텐츠 그리드

이미지 기준:

```
[KPI 1] [KPI 2] [KPI 3] [KPI 4] [KPI 5]    ← 5개 균등

[──── 사이트 네트워크 (지도) ────] [실시간 상태 (도넛)]    ← 8 + 4

[── 콘텐츠 큐 현황 ──]            [── 사이트별 성과 ──]    ← 6 + 6
```

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.network-card { grid-column: span 8; }
.system-status-card { grid-column: span 4; }
.queue-card { grid-column: span 6; }
.performance-card { grid-column: span 6; }
```

### 4.4 반응형 브레이크포인트

```
Mobile      < 640px      : 1-column 모두 stack, sidebar drawer
Tablet      640~1023px   : 2-column 부분, sidebar 축소형
Desktop     1024~1439px  : 12-column 정상
Wide        ≥ 1440px     : 12-column + max-width 제한
```

### 4.5 spacing scale

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px        ← 카드 내부 패딩
--space-5:  20px
--space-6:  24px        ← 카드 사이 gap
--space-8:  32px        ← 섹션 사이
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

8px 베이스. 모든 마진/패딩은 이 scale 사용.

---

## 5. 카드 컴포넌트

대시보드의 모든 정보는 카드 단위.

### 5.1 기본 카드

```css
.card {
  background: var(--color-white);
  border: 1px solid var(--color-gray-100);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
```

borderless하게 보이지만 미세 보더로 구조 명확.

### 5.2 KPI 카드

이미지의 큰 KPI 카드 5개:

```
┌──────────────────────┐
│ [icon] 운영 중인 사이트 │
│        12             │
│        ▲ 2 지난 7일 대비 │
└──────────────────────┘
```

```html
<div class="kpi-card kpi-card--primary">
  <div class="kpi-card__icon">
    <svg>...</svg>
  </div>
  <div class="kpi-card__content">
    <div class="kpi-card__label">운영 중인 사이트</div>
    <div class="kpi-card__value">12</div>
    <div class="kpi-card__change change-positive">▲ 2 지난 7일 대비</div>
  </div>
</div>
```

```css
.kpi-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.kpi-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

/* 색상 변형 */
.kpi-card--primary .kpi-card__icon {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.kpi-card--cyan .kpi-card__icon {
  background: #cffafe;
  color: #0891b2;
}

/* 그린, 앰버, 장미도 동일 패턴 */

.kpi-card__label {
  font-size: 13px;
  color: var(--color-gray-500);
  margin-bottom: 4px;
}

.kpi-card__value {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-gray-900);
  font-variant-numeric: tabular-nums;
}

.kpi-card__change {
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}
```

### 5.3 섹션 카드 (제목 + 콘텐츠)

```html
<div class="card">
  <div class="card__header">
    <h2 class="card__title">사이트 네트워크 현황</h2>
    <button class="card__action">전체 사이트 보기</button>
  </div>
  <div class="card__body">
    [실제 콘텐츠]
  </div>
</div>
```

```css
.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-gray-900);
}

.card__action {
  font-size: 13px;
  color: var(--color-gray-500);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  
  &:hover {
    background: var(--color-gray-100);
    color: var(--color-gray-900);
  }
}
```

---

## 6. 사이드바

### 6.1 구조

```
┌──────────────────────┐
│  [META-SITE 로고]    │
│  Control Tower        │
├──────────────────────┤
│  📊 대시보드          │ ← active
│  📁 사이트 관리       │
│  📋 콘텐츠 큐         │
│  🔄 파이프라인        │
│  📡 모니터링          │
│  🔍 검색운영          │
│  📈 애널리틱스        │
│  📜 프롬프트 자산     │
│  📌 출처 풀 관리      │
│  💰 광고/어필리에이트 │
│  📧 이메일 리스트     │
│  ⚙️ 설정              │
├──────────────────────┤
│  👤 Master            │
│  admin@meta.site      │
└──────────────────────┘
```

### 6.2 스타일

```css
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--color-white);
  border-right: 1px solid var(--color-gray-100);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
}

.sidebar__logo {
  padding: 24px 20px;
  border-bottom: 1px solid var(--color-gray-100);
}

.sidebar__nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-gray-600);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--color-gray-50);
  color: var(--color-gray-900);
}

.nav-item--active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  font-weight: 600;
}

.nav-item--active .nav-item__icon {
  color: var(--color-primary-600);
}

.nav-item__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
```

### 6.3 사이드바 푸터 (운영자 정보)

```css
.sidebar__footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-100);
  display: grid;
  place-items: center;
  font-weight: 600;
  color: var(--color-primary-700);
}

.user-info__name { font-size: 13px; font-weight: 600; }
.user-info__email { font-size: 11px; color: var(--color-gray-500); }
```

### 6.4 모바일 사이드바

```
≤640px: drawer 모드
  - 햄버거 버튼 → 슬라이드 인
  - 배경 dim 처리
  - 항목 클릭 시 자동 close
```

---

## 7. 상단 바 (Top Bar)

```
┌─────────────────────────────────────────────────────────────┐
│ 컨트롤 타워 ✨                  [날짜 범위 ▾] [전체 사이트 ▾]│
│ 모든 사이트를 한눈에 제어하고...                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.1 페이지 타이틀

```css
.page-header {
  padding: 24px 32px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-header__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-gray-900);
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header__subtitle {
  font-size: 14px;
  color: var(--color-gray-500);
  margin-top: 4px;
}
```

### 7.2 필터 (날짜 / 사이트)

```html
<div class="header-filters">
  <button class="filter-button">
    <span class="filter-button__label">2024.05.12 ~ 2024.05.12</span>
    <ChevronDownIcon />
  </button>
  <button class="filter-button">
    <span class="filter-button__label">전체 사이트</span>
    <ChevronDownIcon />
  </button>
</div>
```

```css
.filter-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid var(--color-gray-200);
  border-radius: 8px;
  background: var(--color-white);
  font-size: 13px;
  color: var(--color-gray-700);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-button:hover {
  border-color: var(--color-gray-300);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
```

---

## 8. 차트 / 시각화

### 8.1 차트 라이브러리 선택

```
권장: Recharts (React 친화 + 가벼움)
대안: Chart.js / Visx / D3 직접
```

이미지 분석:
- 도넛 차트 (실시간 시스템 상태) — **Recharts PieChart**
- 세계 지도 (사이트 네트워크) — **D3 또는 react-simple-maps**
- Sparkline (사이트별 성과) — **Recharts LineChart 작은 변형**

### 8.2 도넛 차트 (시스템 상태)

```
       ╭─────╮
      ╱       ╲
     │         │     전체 정상
     │   12    │     12 / 12
     │         │
      ╲       ╱
       ╰─────╯
   
  ✅ 정상      12
  ⚠ 경고       0
  🔴 오프라인  0
  ⏸ 점검 중   0
```

```typescript
import { PieChart, Pie, Cell } from 'recharts'

const data = [
  { name: '정상', value: 12, color: '#22c55e' },
  { name: '경고', value: 0, color: '#f59e0b' },
  { name: '오프라인', value: 0, color: '#ef4444' },
  { name: '점검 중', value: 0, color: '#3b82f6' },
]

<PieChart width={200} height={200}>
  <Pie
    data={data}
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={90}
    dataKey="value"
    stroke="none"
  >
    {data.map((entry, index) => (
      <Cell key={index} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

중앙 텍스트 (`전체 정상 12 / 12`)는 SVG `<text>` 또는 absolute div.

### 8.3 세계 지도 (사이트 네트워크)

```
                  • aikr.tistory.com
                    KR / Tistory
                    ✅ 정상 운영
                            
                       
       • travel.com         • insurance.com
         KR / Next.js          KR / Next.js
         ✅ 정상 운영           ✅ 정상 운영
                            
                            • ai-en.blogspot.com
                              EN / Blogspot
                              ✅ 정상 운영
```

```typescript
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

<ComposableMap projection="geoMercator">
  <Geographies geography={worldGeoUrl}>
    {({ geographies }) => geographies.map(geo => (
      <Geography
        key={geo.rsmKey}
        geography={geo}
        fill="#f3f4f6"      // 옅은 회색
        stroke="#e5e7eb"
      />
    ))}
  </Geographies>
  
  {sites.map(site => (
    <Marker key={site.id} coordinates={[site.lng, site.lat]}>
      <circle r={5} fill={statusColor[site.status]} />
      <text x={10} y={4} fontSize={11}>{site.domain}</text>
    </Marker>
  ))}
</ComposableMap>
```

연결선은 `<Line />` 컴포넌트로 사이트 간 곡선.

### 8.4 Sparkline (작은 추세 차트)

이미지의 사이트별 성과 옆 작은 차트:

```typescript
import { LineChart, Line, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width={80} height={32}>
  <LineChart data={sevenDayData}>
    <Line
      type="monotone"
      dataKey="visitors"
      stroke="#a78bfa"
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

축/그리드 없이 라인만. 80x32 크기로 컴팩트.

### 8.5 차트 컬러 팔레트

```
Single line/bar:        primary-400 (#a78bfa)
Multi-series:           [primary-500, cyan-500, emerald-500, amber-500, rose-500]
Status colors:          [success, warning, error, info]
Background grid:        gray-100
Axis labels:            gray-500
```

---

## 9. 상태 인디케이터

### 9.1 상태 배지

```
🟢 정상    🟡 경고    🔴 오프라인    ⚪ 점검 중
```

```html
<span class="status-badge status-badge--healthy">정상</span>
<span class="status-badge status-badge--warning">경고</span>
<span class="status-badge status-badge--critical">오프라인</span>
<span class="status-badge status-badge--neutral">점검 중</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}

.status-badge--healthy {
  background: var(--color-success-50);
  color: var(--color-success-600);
  &::before { background: var(--color-success-500); }
}

.status-badge--warning {
  background: var(--color-warning-50);
  color: var(--color-warning-600);
  &::before { background: var(--color-warning-500); }
}

/* critical, neutral 동일 패턴 */
```

### 9.2 Phase 배지

이미지의 "Phase 2", "Phase 1" 표시:

```html
<span class="phase-badge phase-badge--1">Phase 1</span>
<span class="phase-badge phase-badge--2">Phase 2</span>
```

```css
.phase-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.phase-badge--1 {
  background: #fef3c7;
  color: #92400e;        /* Phase 1 — 권위 구축, 앰버 */
}

.phase-badge--2 {
  background: #dbeafe;
  color: #1e40af;        /* Phase 2 — 정기 발행, 블루 */
}

.phase-badge--paused {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}
```

### 9.3 펄스 애니메이션 (실시간 상태)

```css
.status-badge--healthy::before {
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
}
```

심각도 critical은 빨간 펄스, 빠르게 (1초).

---

## 10. 데이터 테이블 / 리스트

### 10.1 사이트별 성과 리스트 (이미지 기준)

```
사이트            방문자    페이지뷰    발행 글    성장률
travel.com        45,621    98,213     24         ╱╲╱╲
KR / Next.js      ▲ 12.5%   ▲ 8.7%     ▲ 2

aikr.tistory.com  32,145    71,254     18         ╱╲╱
KR / Tistory      ▲ 18.2%   ▲ 15.1%    ▲ 3
...
```

```css
.data-table {
  width: 100%;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  font-weight: 500;
  color: var(--color-gray-500);
  font-size: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--color-gray-100);
}

.data-table td {
  padding: 16px 8px;
  border-bottom: 1px solid var(--color-gray-50);
  vertical-align: middle;
}

.data-table tr:hover td {
  background: var(--color-gray-50);
}

.site-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.site-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary-100);
  display: grid;
  place-items: center;
}

.site-name { font-weight: 500; color: var(--color-gray-900); }
.site-meta { font-size: 11px; color: var(--color-gray-500); }
```

### 10.2 콘텐츠 큐 stat 박스

이미지의 "검수 대기 28 / 검수 중 16 / 발행 대기 9 / 발행 완료 128":

```html
<div class="stat-box stat-box--warning">
  <div class="stat-box__icon">🕐</div>
  <div class="stat-box__label">검수 대기</div>
  <div class="stat-box__value">28</div>
  <div class="stat-box__change">▲ 5</div>
</div>
```

```css
.stat-box {
  background: var(--color-white);
  border: 1px solid var(--color-gray-100);
  border-radius: 12px;
  padding: 16px;
  border-top: 3px solid;       /* 색상 액센트 */
}

.stat-box--warning { border-top-color: var(--color-amber-400); }
.stat-box--info { border-top-color: var(--color-info-400); }
.stat-box--primary { border-top-color: var(--color-primary-400); }
.stat-box--success { border-top-color: var(--color-success-400); }
```

### 10.3 최근 검수 대기 글 리스트

```html
<ul class="article-list">
  <li class="article-item">
    <div class="article-item__site">
      <span class="site-domain">aikr.tistory.com</span>
      <span class="phase-badge phase-badge--2">Phase 2</span>
    </div>
    <div class="article-item__title">AI 에이전트란 무엇인가? (최신 동향과 전망)</div>
    <div class="article-item__time">방금 전</div>
  </li>
  <!-- ... -->
</ul>
```

```css
.article-item {
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-gray-50);
  align-items: center;
  cursor: pointer;
  
  &:hover {
    background: var(--color-gray-50);
    border-radius: 8px;
    margin: 0 -8px;
    padding: 12px 8px;
  }
}

.article-item__title {
  color: var(--color-gray-700);
  font-size: 13px;
}

.article-item__time {
  color: var(--color-gray-500);
  font-size: 12px;
}
```

---

## 11. 버튼 시스템

### 11.1 종류

```
Primary    ⬛ 보라색 채워짐         주요 액션 (저장, 발행)
Secondary  ⬜ 보라 보더              보조 액션
Ghost      텍스트만                  취소, 부가 액션
Danger     ⬛ 빨간색 채워짐         삭제, 영구 정지
Icon       작은 아이콘만             더보기, 필터 등
```

### 11.2 스타일

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  outline: none;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
  
  &:hover { background: var(--color-primary-600); }
  &:active { background: var(--color-primary-700); }
}

.btn-secondary {
  background: white;
  color: var(--color-primary-700);
  border: 1px solid var(--color-primary-200);
  
  &:hover { background: var(--color-primary-50); border-color: var(--color-primary-300); }
}

.btn-ghost {
  background: transparent;
  color: var(--color-gray-600);
  
  &:hover { background: var(--color-gray-100); color: var(--color-gray-900); }
}

.btn-danger {
  background: var(--color-error-500);
  color: white;
  
  &:hover { background: var(--color-error-600); }
}

.btn-icon {
  padding: 8px;
  width: 32px;
  height: 32px;
}
```

### 11.3 사이즈

```
sm: 28px height, 12px font
md: 36px height, 13px font  ← 기본
lg: 44px height, 14px font
```

---

## 12. 폼 요소

### 12.1 입력 필드

```css
.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-gray-200);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.15s ease;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-400);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  
  &::placeholder {
    color: var(--color-gray-400);
  }
  
  &:disabled {
    background: var(--color-gray-50);
    color: var(--color-gray-500);
    cursor: not-allowed;
  }
}

.input--error {
  border-color: var(--color-error-400);
  
  &:focus {
    box-shadow: 0 0 0 3px var(--color-error-50);
  }
}
```

### 12.2 라벨 + 헬퍼 텍스트

```html
<div class="form-field">
  <label class="form-label">
    사이트 ID
    <span class="form-label__required">*</span>
  </label>
  <input class="input" placeholder="travel-kr" />
  <p class="form-helper">URL과 내부 식별자에 사용됨</p>
  <p class="form-error">이미 사용 중인 ID입니다</p>
</div>
```

```css
.form-field { margin-bottom: 20px; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-gray-700);
  margin-bottom: 6px;
}

.form-label__required {
  color: var(--color-error-500);
  margin-left: 2px;
}

.form-helper {
  font-size: 12px;
  color: var(--color-gray-500);
  margin-top: 6px;
}

.form-error {
  font-size: 12px;
  color: var(--color-error-600);
  margin-top: 6px;
}
```

### 12.3 셀렉트 / 드롭다운

```css
.select {
  appearance: none;
  padding-right: 36px;
  background-image: url('chevron-down.svg');
  background-repeat: no-repeat;
  background-position: right 12px center;
  /* input 스타일 상속 */
}
```

라디오 (호스팅 옵션 같은 큰 선택):

```html
<label class="radio-card">
  <input type="radio" name="hosting" />
  <div class="radio-card__content">
    <div class="radio-card__title">Next.js (자체 도메인) — 추천</div>
    <div class="radio-card__description">Vercel에 배포 + 모든 기능 사용</div>
    <div class="radio-card__features">
      ✅ 검색  ✅ 뉴스레터  ✅ AI 댓글  ✅ /llms.txt
    </div>
  </div>
</label>
```

```css
.radio-card {
  display: block;
  padding: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: var(--color-primary-300);
  }
}

.radio-card input:checked ~ .radio-card__content {
  /* 부모 자동 활성 — has() 또는 JS */
}

.radio-card--active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}
```

---

## 13. 모달 + 다이얼로그

### 13.1 기본 모달

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 50;
  display: grid;
  place-items: center;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 540px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s ease;
}

.modal__header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal__title { font-size: 18px; font-weight: 600; }
.modal__close { /* btn-icon */ }

.modal__body { padding: 24px; }

.modal__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

### 13.2 확인 다이얼로그 (위험한 액션)

```html
<div class="modal modal--danger">
  <div class="modal__icon">
    <AlertTriangleIcon class="text-error-500" />
  </div>
  <h3>사이트를 삭제하시겠습니까?</h3>
  <p>이 작업은 되돌릴 수 없습니다. 모든 글, 출처, 댓글 데이터가 영구 삭제됩니다.</p>
  <input class="input" placeholder='확인하려면 "DELETE"를 입력하세요' />
  <div class="modal__footer">
    <button class="btn-ghost">취소</button>
    <button class="btn-danger">영구 삭제</button>
  </div>
</div>
```

위험한 액션은 **타이핑 확인** + **빨간 버튼** + **취소가 더 두드러지게**.

---

## 14. 토스트 / 알림

### 14.1 토스트 (1회성 알림)

```
┌────────────────────────────────────┐
│ ✅  사이트 'travel-kr' 생성됨       │
│     발행 시작까지 5분 소요         │  [×]
└────────────────────────────────────┘
```

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: white;
  border-left: 4px solid;
  border-radius: 8px;
  padding: 14px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 12px;
  min-width: 320px;
  max-width: 480px;
  z-index: 100;
  animation: slideInRight 0.3s ease;
}

.toast--success { border-color: var(--color-success-500); }
.toast--warning { border-color: var(--color-warning-500); }
.toast--error { border-color: var(--color-error-500); }
.toast--info { border-color: var(--color-info-500); }
```

### 14.2 영구 알림 (어드민 알림 패널)

monitoring-health.md의 alerts. 어드민의 우상단 종 모양 + drawer:

```
🔔 (3)
   ↓ 클릭
┌─────────────────────────────────────┐
│ 알림 (3)              [모두 읽음]   │
├─────────────────────────────────────┤
│ 🔴 critical · 5분 전                │
│ 비용 이상 급증 — ai-kr               │
│ 시간당 $0.50 → $2.50 (5x)            │
│                                     │
│ ⚠ high · 2시간 전                  │
│ 출처 다운 — TheAIShow (5회 연속)    │
│                                     │
│ 🟡 medium · 4시간 전                │
│ 검수 대기 5편+ 누적                 │
└─────────────────────────────────────┘
```

```css
.alert-drawer {
  position: fixed;
  top: 64px;
  right: 0;
  width: 400px;
  max-height: calc(100vh - 64px);
  background: white;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  z-index: 40;
  border-left: 1px solid var(--color-gray-100);
}
```

---

## 15. 인터랙션 + 애니메이션

### 15.1 트랜지션 토큰

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### 15.2 애니메이션

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 카드 hover */
.card { transition: box-shadow var(--transition-base); }
```

### 15.3 로딩 상태

```
스켈레톤 (skeleton loader)    데이터 fetch 중 카드 형태 유지
스피너                         버튼 클릭 후 작업 중
프로그레스 바                  파일 업로드 / 사이트 생성 진행률
```

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-gray-100) 25%,
    var(--color-gray-50) 37%,
    var(--color-gray-100) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: -100% 50%; }
}
```

### 15.4 호버 + 포커스

```
버튼:    배경색 살짝 어둡게 / 그림자 미세 증가
카드:    그림자 증가 (elevated 느낌)
링크:    색상 약간 진하게
폼:      보더 강조 + 포커스 링 (3px)
테이블:  행 배경 색상 변화
```

### 15.5 마이크로 인터랙션

```
□ KPI 카드 진입 시 숫자 카운트업 애니메이션 (count from 0)
□ 도넛 차트 진입 시 시계방향 회전 애니메이션
□ 사이드바 nav-item 호버 시 살짝 우측 이동
□ 알림 표시 시 종 모양 흔들기 (한 번)
□ 발행 성공 시 작은 색종이 효과 (연 1회 보일까말까)
```

과한 애니메이션은 거슬림. **실용 + 약간의 즐거움**.

---

## 16. 아이콘 시스템

### 16.1 아이콘 라이브러리

```
권장: Lucide React (가벼움 + 일관성)
대안: Heroicons / Phosphor / Tabler
```

### 16.2 아이콘 사이즈

```
xs: 12px    배지 안
sm: 16px    버튼 / 폼 안
md: 20px    네비게이션 / 카드 헤더
lg: 24px    KPI 카드
xl: 48px    빈 상태 / 일러스트
```

### 16.3 색상

```
기본:        gray-500
강조:        primary-500
상태:        시맨틱 색
호버:        gray-700
비활성:      gray-300
```

### 16.4 사이드바 아이콘 매핑

```
대시보드        LayoutDashboard
사이트 관리     Globe
콘텐츠 큐       FileText
파이프라인      GitBranch
모니터링        Activity
검색운영        Search
애널리틱스      BarChart3
프롬프트 자산   FileCode
출처 풀 관리    Database
광고/어필리에이트  DollarSign
이메일 리스트   Mail
설정            Settings
```

---

## 17. 빈 상태 (Empty State)

데이터 없을 때 사용자에게 안내:

```
┌─────────────────────────────────┐
│                                 │
│         [큰 아이콘 일러스트]    │
│                                 │
│      아직 사이트가 없습니다     │
│   첫 사이트를 만들어 시작하세요 │
│                                 │
│      [+ 새 사이트 만들기]       │
│                                 │
└─────────────────────────────────┘
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state__icon {
  width: 96px;
  height: 96px;
  color: var(--color-gray-300);
  margin-bottom: 16px;
}

.empty-state__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-gray-900);
  margin-bottom: 8px;
}

.empty-state__description {
  font-size: 14px;
  color: var(--color-gray-500);
  margin-bottom: 24px;
}
```

운영자에게 "다음에 뭐 할지" 명확하게 알려줌.

---

## 18. 접근성 (Accessibility)

### 18.1 색상 대비

```
WCAG AA 준수:
  본문 텍스트:  4.5:1 이상  (gray-600 on white = 7.4:1 ✅)
  큰 텍스트:    3:1 이상
  비디오/이미지 대체 텍스트
```

상태를 색상만으로 전달하지 않음 (색맹 고려):

```html
<!-- 나쁜 예 -->
<div class="status">
  <div style="color: red;"></div>
</div>

<!-- 좋은 예 -->
<div class="status">
  <div style="color: red;">⚠ 오프라인</div>
  <!-- 색 + 아이콘 + 텍스트 모두 있음 -->
</div>
```

### 18.2 키보드 네비게이션

```
Tab            모든 인터랙티브 요소 순회
Enter / Space  버튼 활성
Esc            모달 닫기
Arrow keys     리스트 / 메뉴 내 이동
```

### 18.3 ARIA 레이블

```html
<button aria-label="알림 보기, 3개 미처리">🔔 (3)</button>
<div role="status" aria-live="polite">사이트 생성 중...</div>
<nav aria-label="주 네비게이션">...</nav>
```

### 18.4 포커스 표시

```css
*:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## 19. 다크 모드 (1차 출시 후)

### 19.1 컬러 토큰 매핑

```css
:root {
  --color-bg: #f8f9fc;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
}
```

CSS 변수 기반으로 다크모드 추가는 1줄 토글로 가능.

### 19.2 다크모드 차트 색상 조정

라이트의 파스텔 → 다크의 채도 높은 색:

```
Light primary-400  → Dark primary-300 (더 밝게)
Light gray-100 (배경)  → Dark gray-800
```

---

## 20. 모바일 대응

### 20.1 핵심 원칙

```
모바일은 "확인 + 빠른 액션" 위주
복잡한 작업 (사이트 생성, 글 편집)은 데스크톱 권장
```

### 20.2 모바일 변경점

```
□ Sidebar → drawer (햄버거 메뉴)
□ KPI 카드 5개 → 1열 stack
□ 12-column grid → 1~2 column
□ 사이드 차트 → 풀-width
□ 데이터 테이블 → 카드 형태 변환
□ 폰트 사이즈 살짝 작게 (가독 유지)
```

### 20.3 모바일 알림

```
모바일에서 critical 알림 = 푸시 알림 (PWA 지원)
나머지는 어드민 접속 시 표시
```

---

## 21. 디자인 토큰 종합 (CSS 변수)

```css
:root {
  /* === 컬러 === */
  /* Primary */
  --color-primary-50: #f5f3ff;
  --color-primary-400: #a78bfa;
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  
  /* Semantic */
  --color-success-500: #22c55e;
  --color-warning-500: #f59e0b;
  --color-error-500: #ef4444;
  --color-info-500: #3b82f6;
  
  /* Gray */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-700: #374151;
  --color-gray-900: #111827;
  
  /* === Spacing === */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* === Border Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* === Shadow === */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.15);
  
  /* === Transition === */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  
  /* === Layout === */
  --layout-sidebar-width: 240px;
  --layout-topbar-height: 64px;
  --layout-content-max-width: 1440px;
  
  /* === Typography === */
  --font-family: 'Pretendard', 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 28px;
  --font-size-2xl: 32px;
}
```

---

## 22. 구현 권장사항

### 22.1 기술 스택

```
프레임워크:    Next.js 15 (core.md 기술 스택과 일치)
스타일링:      Tailwind CSS + CSS Variables
컴포넌트:      shadcn/ui base + 커스텀 (core.md 일치)
차트:          Recharts
지도:          react-simple-maps
아이콘:        Lucide React
폼:            React Hook Form + Zod
애니메이션:    Framer Motion (선택, 절제 사용)
```

### 22.2 컴포넌트 구조

```
components/
├── ui/                          shadcn 베이스
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── dashboard/                   대시보드 컴포넌트
│   ├── KpiCard.tsx
│   ├── SiteNetworkMap.tsx
│   ├── SystemStatusChart.tsx
│   ├── ContentQueueStats.tsx
│   └── SitePerformanceList.tsx
├── layout/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── PageHeader.tsx
├── badges/
│   ├── StatusBadge.tsx
│   ├── PhaseBadge.tsx
│   └── ChangeBadge.tsx
└── ...
```

### 22.3 디자인 토큰 단일 출처

```
tailwind.config.ts에서 모든 토큰 export:

const colors = {
  primary: {
    50: 'var(--color-primary-50)',
    // ...
  }
}

→ Tailwind 클래스 + CSS 변수 양쪽 동기화
```

### 22.4 Storybook (선택)

컴포넌트 카탈로그를 Storybook으로 문서화:

```
□ 모든 KpiCard variant
□ 모든 button state
□ 모든 status badge
□ 빈 상태 / 로딩 상태 / 에러 상태
```

운영자가 "이런 카드 또 보고 싶다" 할 때 빠르게 참조.

---

## 23. 22개 명세 문서와의 연결

이 디자인 시스템은 다음 문서들의 **시각적 구현 가이드**:

| 명세 문서 | 디자인 시스템 적용 |
|---------|------------------|
| `meta-control-spec.md` | 모든 어드민 페이지의 와이어프레임 → 컴포넌트 |
| `site-creation-flow.md` | 6단계 마법사 → RadioCard, 폼 컴포넌트 |
| `monitoring-health.md` | 4단계 심각도 → 시맨틱 컬러, 알림 drawer |
| `analytics-integration.md` | 차트 시스템 → Recharts 구현 |
| `authority-building.md` | Phase 배지 + 진행률 표시 |
| `monetization.md` | 광고 슬롯 시각화 + 수익 차트 |
| ... | ... |

22개 문서가 "무엇을" 정의했다면, 이 문서가 "어떻게 보일지"를 채움.

---

## 24. 디자인 검증 체크리스트

새 화면 구현 시 점검:

```
□ 컬러는 디자인 토큰만 사용 (하드코딩 X)
□ 텍스트 컬러 계층 따름 (gray-900 / 700 / 600 / 500)
□ Spacing은 8px scale 따름
□ 보더 radius 4가지 중 사용 (4 / 8 / 12 / 16)
□ 모든 인터랙티브 요소에 hover / focus 상태
□ 빈 상태 / 로딩 / 에러 상태 모두 디자인됨
□ 모바일에서 깨지지 않는지 확인
□ WCAG AA 색 대비 확인
□ 키보드만으로 모든 액션 가능한지
□ 차트의 색상이 시맨틱 의미와 일치
□ 애니메이션이 거슬리지 않는지
```

---

## 25. 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2026-05-06 | 초안 작성. 운영자 시안 이미지 기반. 22개 명세 문서와 통합. |

---

## 26. 디자인 결정 정리

이 문서가 결정한 것:

**브랜드 + 시각**
- ✅ 보라 액센트 + 라이트 테마 + 차분한 톤
- ✅ Pretendard + Inter 폰트
- ✅ 5종 KPI 액센트 컬러 (보라/청록/그린/앰버/장미)
- ✅ 시맨틱 4색 (success/warning/error/info)

**레이아웃**
- ✅ 240px 고정 사이드바 + 12-column 그리드
- ✅ max-width 1440px 중앙 정렬
- ✅ 8px spacing scale

**컴포넌트**
- ✅ KpiCard / StatusBadge / PhaseBadge / 5종 버튼 / 폼 / 모달 / 토스트 / 빈 상태
- ✅ Recharts 기반 차트 + react-simple-maps 지도
- ✅ Lucide 아이콘

**인터랙션**
- ✅ 200ms 트랜지션 + 절제된 애니메이션
- ✅ skeleton 로딩 + 카운트업 KPI
- ✅ pulse 상태 표시

**접근성**
- ✅ WCAG AA + 색 + 아이콘 + 텍스트 3중 표현
- ✅ 키보드 네비게이션 + ARIA 레이블

---

*이 문서는 메타사이트 어드민의 시각 언어 단일 출처다. 22개 명세의 "what"을 "how"로 변환하는 디자인 시스템.*

*시각화 보너스 문서. 명세 시리즈는 22개로 완료, 이건 시각 가이드.*
