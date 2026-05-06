export interface PublishPayload {
  siteId: string;
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string; // HTML
  tags: string[];
  categoryName?: string;
  publishedAt: string; // ISO
  aiUsage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number };
}

export interface PublishResult {
  success: boolean;
  externalId?: string; // Tistory postId, Blogger postId, etc.
  externalUrl?: string;
  error?: string;
}

export interface SitePublisher {
  publish(payload: PublishPayload): Promise<PublishResult>;
  canPublish(): Promise<boolean>;
}
