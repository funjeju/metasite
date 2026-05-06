export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  body: string; // Markdown
  faq: { question: string; answer: string }[];
  tags: string[];
  citations: string[];
  wordCount: number;
}

export interface VerifiedArticle extends GeneratedArticle {
  removedCitations: string[];
  factCheckNotes: string;
}

export interface EditedArticle extends VerifiedArticle {
  bodyHtml: string; // HTML after md→html + SEO edits
  internalLinkMarkers: string[]; // slugs to link to
  adSlots: number[]; // paragraph indices where ads should be inserted
  metaTitle: string;
  metaDescription: string;
}

export interface OutlineItem {
  seq: number;
  title: string;
  slug: string;
  angle: string; // 1-line description of the angle / hook
  targetKeyword: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface SiteContext {
  siteId: string;
  name: string;
  topic: string;
  persona: string;
  tone: string;
  language: string;
  canonicalDomain: string;
  siteKeywords?: string[];
  promptOverrides?: {
    writer?: string;
    verifier?: string;
    editor?: string;
    outlineGenerator?: string;
  };
}
