import { Timestamp } from "firebase/firestore";

// ============================================================
// META-LEVEL TYPES
// ============================================================

export interface MetaSiteConfig {
  adminEmails: string[];
  ownerName: string;
  defaultLanguage: "ko" | "en";
  defaultTimezone: string;
  maxChildSites: number;
  dailyAiBudgetUSD: number;
  perSiteDailyBudgetUSD: number;
  defaultModels: {
    writer: string;
    verifier: string;
    editor: string;
    summarizer: string;
    embedding: string;
  };
  notifications: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    emailFrom?: string;
    emailTo?: string[];
    severityThreshold: "low" | "medium" | "high";
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChildSite {
  siteId: string;
  name: string;
  displayName: string;
  topic: string;
  language: "ko" | "en" | "ja" | string;
  persona: string;
  tone: string;
  hostingType: "nextjs" | "tistory" | "blogger";
  hostingConfig: NextjsHostingConfig | TistoryHostingConfig | BloggerHostingConfig;
  currentPhase: "authority" | "ongoing" | "paused";
  authorityOutlineId?: string;
  pillarPagePostId?: string;
  sections: Section[];
  seoConfig: {
    siteDescription: string;
    siteKeywords: string[];
    ogImageUrl: string;
    canonicalDomain: string;
    searchConsoleVerified: boolean;
    indexNowKey?: string;
  };
  monetization: {
    adsenseId?: string;
    affiliatePool: Record<string, AffiliateLink[]>;
    slotsEnabled: AdSlot[];
    enabled: boolean;
  };
  analytics: {
    ga4MeasurementId?: string;
    gscPropertyUrl?: string;
    vercelAnalyticsEnabled: boolean;
  };
  status: "active" | "paused" | "archived";
  healthStatus: {
    overall: "healthy" | "warning" | "critical";
    lastHealthCheck: Timestamp;
    issues: string[];
  };
  stats: {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    failedPosts: number;
    lastPublishedAt?: Timestamp;
    weeklyTrafficEstimate?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface NextjsHostingConfig {
  type: "nextjs";
  domain: string;
  vercelProjectId: string;
  vercelDeploymentUrl: string;
  firebaseProjectId?: string;
}

export interface TistoryHostingConfig {
  type: "tistory";
  blogName: string;
  blogUrl: string;
  accessTokenSecretKey: string;
  defaultCategoryId?: string;
}

export interface BloggerHostingConfig {
  type: "blogger";
  blogId: string;
  blogUrl: string;
  serviceAccountSecretKey: string;
}

export interface Section {
  sectionId: string;
  name: string;
  slug: string;
  enabled: boolean;
  publishFrequency: "daily" | "thrice_weekly" | "weekly";
  toneOverride?: string;
  sourceIds: string[];
  promptOverride?: string;
  schedule: {
    cronExpression: string;
    lastRun?: Timestamp;
    nextRun?: Timestamp;
  };
}

export interface AffiliateLink {
  partnerId: string;
  url: string;
  label: string;
  imageUrl?: string;
  weight?: number;
}

export type AdSlot =
  | "header"
  | "top"
  | "mid"
  | "bottom"
  | "sidebar-1"
  | "sidebar-2"
  | "inline-cta";

export interface PromptAsset {
  promptId: string;
  role:
    | "writer"
    | "verifier"
    | "editor"
    | "summarizer"
    | "evaluator"
    | "comment_persona"
    | "authority_outline_generator";
  version: number;
  isLatest: boolean;
  template: string;
  variables: string[];
  targetModel: string;
  usedBySiteIds: string[];
  metrics: {
    totalCalls: number;
    successCount: number;
    failureCount: number;
    avgLatencyMs: number;
    avgOutputTokens: number;
    avgCostUSD: number;
    qualityScores?: number[];
  };
  description: string;
  createdAt: Timestamp;
  createdBy: string;
  changelog?: string;
}

export interface Alert {
  alertId: string;
  severity: "low" | "medium" | "high" | "critical";
  category:
    | "health"
    | "publish_failure"
    | "review_request"
    | "budget"
    | "security"
    | "source_dead"
    | "fake_citation";
  siteId?: string;
  postId?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  status: "open" | "acknowledged" | "resolved" | "archived";
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface AuditLog {
  logId: string;
  action: string;
  actorEmail: string;
  actorRole: "admin" | "system";
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

// ============================================================
// CHILD SITE LEVEL TYPES
// ============================================================

export interface AuthorityOutline {
  outlineId: string;
  siteId: string;
  version: number;
  pillarTopic: string;
  clusterTopics: ClusterTopic[];
  targetArticleCount: number;
  generatedArticleCount: number;
  status: "generating" | "active" | "completed";
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClusterTopic {
  clusterId: string;
  name: string;
  keywords: string[];
  articles: OutlineArticle[];
}

export interface OutlineArticle {
  articleId: string;
  title: string;
  targetKeyword: string;
  status: "pending" | "queued" | "published" | "failed";
  postId?: string;
  publishedAt?: Timestamp;
}

export interface CuratedPost {
  postId: string;
  siteId: string;
  sectionId?: string;
  title: string;
  slug: string;
  content: string;
  htmlContent?: string;
  excerpt: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  categories: string[];
  tags: string[];
  authorPersonaId?: string;
  sourceIds: string[];
  aiMetadata: {
    writerModel: string;
    verifierModel: string;
    editorModel: string;
    writtenAt: Timestamp;
    verifiedAt?: Timestamp;
    editedAt?: Timestamp;
    totalCostUSD: number;
    qualityScore?: number;
    factCheckPassed?: boolean;
  };
  seoMetadata: {
    metaTitle: string;
    metaDescription: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    readingTimeMin: number;
    wordCount: number;
  };
  publishStatus: "draft" | "review" | "approved" | "published" | "failed" | "archived";
  publishedAt?: Timestamp;
  publishError?: string;
  externalPostUrl?: string;
  externalPostId?: string;
  phase: "authority" | "ongoing";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SavedSummary {
  summaryId: string;
  siteId: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: "youtube" | "rss" | "web" | "newsletter";
  rawContent: string;
  summary: string;
  keyPoints: string[];
  sectionId?: string;
  usedInPostId?: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface Source {
  sourceId: string;
  siteId: string;
  name: string;
  url: string;
  type: "youtube_channel" | "youtube_playlist" | "rss_feed" | "web_scrape" | "newsletter";
  language: string;
  isActive: boolean;
  checkFrequency: "hourly" | "daily" | "weekly";
  lastCheckedAt?: Timestamp;
  lastSuccessAt?: Timestamp;
  failureCount: number;
  totalArticlesSourced: number;
  sectionIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Persona {
  personaId: string;
  siteId?: string;
  name: string;
  displayName: string;
  description: string;
  avatarUrl?: string;
  traits: string[];
  writingStyle: string;
  exampleComments: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnalyticsSnapshot {
  snapshotId: string;
  siteId: string;
  date: string;
  source: "gsc" | "ga4" | "vercel";
  metrics: {
    impressions?: number;
    clicks?: number;
    ctr?: number;
    avgPosition?: number;
    sessions?: number;
    pageviews?: number;
    bounceRate?: number;
    avgSessionDuration?: number;
  };
  topPages?: { url: string; clicks: number; impressions: number }[];
  topQueries?: { query: string; clicks: number; impressions: number }[];
  createdAt: Timestamp;
}

export interface NewsletterSubscriber {
  subscriberId: string;
  siteId: string;
  email: string;
  name?: string;
  status: "active" | "unsubscribed" | "bounced";
  tags: string[];
  subscribedAt: Timestamp;
  unsubscribedAt?: Timestamp;
}

// ============================================================
// PIPELINE TYPES
// ============================================================

export interface AiScoutQueueItem {
  itemId: string;
  siteId: string;
  sectionId: string;
  sourceId: string;
  sourceType: string;
  contentUrl: string;
  contentTitle: string;
  rawData: Record<string, unknown>;
  status: "pending" | "processing" | "scouted" | "failed" | "skipped";
  scoutedAt?: Timestamp;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface AiEvaluateQueueItem {
  itemId: string;
  siteId: string;
  sectionId: string;
  scoutItemId: string;
  summaryId?: string;
  evaluationScore?: number;
  evaluationReason?: string;
  shouldProceed?: boolean;
  status: "pending" | "processing" | "evaluated" | "failed";
  evaluatedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface MagazineLog {
  logId: string;
  siteId: string;
  sectionId?: string;
  phase: "authority" | "ongoing";
  pipelineStep: "scout" | "evaluate" | "summarize" | "generate" | "publish";
  status: "started" | "completed" | "failed";
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  costUSD?: number;
  modelUsed?: string;
  tokensUsed?: number;
  createdAt: Timestamp;
}

// ============================================================
// UI HELPER TYPES
// ============================================================

export type SiteStatus = "active" | "paused" | "archived";
export type SitePhase = "authority" | "ongoing" | "paused";
export type HealthStatus = "healthy" | "warning" | "critical";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type PostPublishStatus = "draft" | "review" | "approved" | "published" | "failed" | "archived";
