import { GoogleAuth } from "google-auth-library";
import type { PublishPayload, PublishResult, SitePublisher } from "./types";

interface BloggerConfig {
  blogId: string;
  serviceAccountEmail: string;
  serviceAccountKey: string; // PEM private key
}

export class BloggerPublisher implements SitePublisher {
  private auth: GoogleAuth;

  constructor(private config: BloggerConfig) {
    this.auth = new GoogleAuth({
      credentials: {
        client_email: config.serviceAccountEmail,
        private_key: config.serviceAccountKey,
      },
      scopes: ["https://www.googleapis.com/auth/blogger"],
    });
  }

  async canPublish(): Promise<boolean> {
    try {
      await this.auth.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const token = await this.auth.getAccessToken();

    const res = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${this.config.blogId}/posts/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: payload.title,
          content: payload.body,
          labels: payload.tags.slice(0, 20),
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Blogger API error ${res.status}: ${text}` };
    }

    const json = await res.json();
    return {
      success: true,
      externalId: json.id as string,
      externalUrl: json.url as string,
    };
  }
}
