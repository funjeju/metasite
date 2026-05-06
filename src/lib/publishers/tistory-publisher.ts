import type { PublishPayload, PublishResult, SitePublisher } from "./types";

interface TistoryConfig {
  accessToken: string;
  blogName: string;
  defaultCategoryId?: number;
}

export class TistoryPublisher implements SitePublisher {
  constructor(private config: TistoryConfig) {}

  async canPublish(): Promise<boolean> {
    try {
      const res = await fetch(
        `https://www.tistory.com/apis/blog/info?access_token=${this.config.accessToken}&output=json`
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const params = new URLSearchParams({
      access_token: this.config.accessToken,
      output: "json",
      blogName: this.config.blogName,
      title: payload.title,
      content: payload.body,
      visibility: "3", // public
      tag: payload.tags.slice(0, 10).join(","),
      ...(this.config.defaultCategoryId
        ? { category: String(this.config.defaultCategoryId) }
        : {}),
    });

    const res = await fetch(`https://www.tistory.com/apis/post/write?${params}`, {
      method: "POST",
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Tistory API error ${res.status}: ${text}` };
    }

    const json = await res.json();
    const postId = json?.tistory?.postId as string | undefined;
    const url = json?.tistory?.url as string | undefined;

    if (!postId) {
      return { success: false, error: "Tistory did not return postId" };
    }

    return { success: true, externalId: postId, externalUrl: url };
  }
}
