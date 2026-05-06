import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/newsletter/sender";

// POST /api/sites/[siteId]/newsletter/subscribe
// body: { email, action: "subscribe" | "unsubscribe" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const body = await req.json() as { email?: string; action?: string };
  const { email, action = "subscribe" } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const subsRef = adminDb
    .collection("child_sites").doc(siteId)
    .collection("newsletter_subscribers");

  const existing = await subsRef.where("email", "==", email).limit(1).get();

  if (action === "unsubscribe") {
    if (!existing.empty) {
      await existing.docs[0].ref.update({ status: "unsubscribed", updatedAt: FieldValue.serverTimestamp() });
    }
    return NextResponse.json({ ok: true, action: "unsubscribed" });
  }

  // subscribe
  if (!existing.empty && existing.docs[0].data().status === "active") {
    return NextResponse.json({ ok: true, action: "already_subscribed" });
  }

  const token = nanoid(24);
  if (!existing.empty) {
    await existing.docs[0].ref.update({ status: "active", token, updatedAt: FieldValue.serverTimestamp() });
  } else {
    await subsRef.add({
      email,
      status: "active",
      token,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Send confirmation email
  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  const site = siteDoc.data() ?? {};
  const siteName: string = site.displayName ?? site.name ?? siteId;
  const canonicalDomain: string = site.seoConfig?.canonicalDomain ?? "";
  const from = site.newsletter?.fromEmail ?? `Newsletter <noreply@${canonicalDomain || "example.com"}>`;
  const unsubUrl = canonicalDomain
    ? `https://${canonicalDomain}/newsletter/unsubscribe?token=${token}`
    : `${process.env.NEXTAUTH_URL ?? ""}/api/sites/${siteId}/newsletter/subscribe?email=${encodeURIComponent(email)}&action=unsubscribe`;

  await sendEmail({
    from,
    to: [email],
    subject: `[${siteName}] 뉴스레터 구독 완료`,
    html: `<p><b>${siteName}</b> 뉴스레터 구독이 완료되었습니다.<br>새 글이 발행될 때마다 주간 다이제스트를 보내드립니다.</p>
<p><a href="${unsubUrl}">구독 해지하기</a></p>`,
  });

  return NextResponse.json({ ok: true, action: "subscribed" });
}

// GET /api/sites/[siteId]/newsletter/subscribe — list subscribers (auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const snap = await adminDb
    .collection("child_sites").doc(siteId)
    .collection("newsletter_subscribers")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .get();

  const subscribers = snap.docs.map((d) => ({
    id: d.id,
    email: d.data().email,
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json({ subscribers, total: subscribers.length });
}
