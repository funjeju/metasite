import { adminDb } from "@/lib/firebase-admin";
import type { PublishPayload, PublishResult, SitePublisher } from "./types";
import { FieldValue } from "firebase-admin/firestore";

export class NextjsPublisher implements SitePublisher {
  constructor(private siteId: string) {}

  async canPublish(): Promise<boolean> {
    return true; // Firestore is always available
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    try {
      const ref = adminDb
        .collection("sites")
        .doc(this.siteId)
        .collection("curated_posts")
        .doc(payload.postId);

      await ref.set(
        {
          publishStatus: "published",
          publishedAt: FieldValue.serverTimestamp(),
          externalUrl: null,
          ...(payload.aiUsage ? { aiUsage: payload.aiUsage } : {}),
        },
        { merge: true }
      );

      // Increment publishedPosts counter on the site doc
      await adminDb
        .collection("child_sites")
        .doc(this.siteId)
        .update({ "stats.publishedPosts": FieldValue.increment(1) });

      // IndexNow ping (best-effort, non-blocking)
      const siteDoc = await adminDb.collection("child_sites").doc(this.siteId).get();
      const domain = siteDoc.data()?.seoConfig?.canonicalDomain as string | undefined;
      const indexNowKey = siteDoc.data()?.seoConfig?.indexNowKey as string | undefined;
      if (domain && indexNowKey && payload.slug) {
        const articleUrl = `https://${domain}/articles/${payload.slug}`;
        const baseUrl = process.env.NEXTAUTH_URL ?? `https://${domain}`;
        fetch(`${baseUrl}/api/indexnow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [articleUrl], host: domain, apiKey: indexNowKey }),
        }).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
