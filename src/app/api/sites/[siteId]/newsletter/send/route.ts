import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { sendEmail, buildDigestHtml } from "@/lib/newsletter/sender";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/sites/[siteId]/newsletter/send
// Sends weekly digest to all active subscribers
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const site = siteDoc.data()!;
  const siteName: string = site.displayName ?? site.name ?? siteId;
  const canonicalDomain: string = site.seoConfig?.canonicalDomain ?? "";
  const from: string = site.newsletter?.fromEmail ?? `${siteName} <noreply@${canonicalDomain || "example.com"}>`;

  // Get posts published in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const postsSnap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "published")
    .where("publishedAt", ">=", sevenDaysAgo.toISOString())
    .orderBy("publishedAt", "desc")
    .limit(10)
    .get();

  if (postsSnap.empty) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_new_posts" });
  }

  const posts = postsSnap.docs.map((d) => {
    const data = serialize({ id: d.id, ...d.data() }) as Record<string, string>;
    const slug = data.slug ?? d.id;
    const url = canonicalDomain ? `https://${canonicalDomain}/${slug}` : "";
    return { title: data.title ?? "", excerpt: data.excerpt ?? "", url, publishedAt: data.publishedAt ?? "" };
  });

  // Get active subscribers
  const subsSnap = await adminDb
    .collection("child_sites").doc(siteId)
    .collection("newsletter_subscribers")
    .where("status", "==", "active")
    .get();

  if (subsSnap.empty) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_subscribers" });
  }

  const subject = `[${siteName}] 이번 주 새 글 ${posts.length}편이 발행되었습니다`;
  let sent = 0;

  // Send in batches of 50
  const emails = subsSnap.docs.map((d) => d.data().email as string);
  const batchSize = 50;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    for (const email of batch) {
      const baseUrl = process.env.NEXTAUTH_URL ?? "";
      const unsubUrl = `${baseUrl}/api/unsubscribe/${siteId}?email=${encodeURIComponent(email)}`;

      const html = buildDigestHtml(siteName, posts, unsubUrl);
      const ok = await sendEmail({ from, to: [email], subject, html });
      if (ok) sent++;
    }
  }

  // Record last sent timestamp on site
  await siteDoc.ref.update({
    "newsletter.lastSentAt": FieldValue.serverTimestamp(),
    "newsletter.lastSentCount": sent,
  });

  return NextResponse.json({ ok: true, sent, total: emails.length });
}
