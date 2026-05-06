import { adminDb } from "@/lib/firebase-admin";
import { NextjsPublisher } from "./nextjs-publisher";
import { TistoryPublisher } from "./tistory-publisher";
import { BloggerPublisher } from "./blogger-publisher";
import type { SitePublisher } from "./types";

export async function getPublisher(siteId: string): Promise<SitePublisher> {
  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) throw new Error(`Site not found: ${siteId}`);

  const data = siteDoc.data()!;
  const hostingType: string = data.hostingType ?? "nextjs";
  const hostingConfig = data.hostingConfig ?? {};

  if (hostingType === "tistory") {
    return new TistoryPublisher({
      accessToken: hostingConfig.accessToken as string,
      blogName: hostingConfig.blogName as string,
      defaultCategoryId: hostingConfig.defaultCategoryId as number | undefined,
    });
  }

  if (hostingType === "blogger") {
    return new BloggerPublisher({
      blogId: hostingConfig.blogId as string,
      serviceAccountEmail: hostingConfig.serviceAccountEmail as string,
      serviceAccountKey: hostingConfig.serviceAccountKey as string,
    });
  }

  // Default: nextjs (Firestore only)
  return new NextjsPublisher(siteId);
}
