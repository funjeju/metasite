import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

type Params = { params: Promise<{ siteId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { siteId } = await params;
  const { email, action } = await req.json() as { email?: string; action?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "유효한 이메일 주소를 입력하세요." }, { status: 400 });
  }

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "사이트를 찾을 수 없습니다." }, { status: 404 });

  const subRef = adminDb
    .collection("child_sites").doc(siteId)
    .collection("newsletter_subscribers").doc(Buffer.from(email).toString("base64url"));

  if (action === "unsubscribe") {
    await subRef.set({ email, status: "unsubscribed", updatedAt: Timestamp.now() }, { merge: true });
    return NextResponse.json({ ok: true, message: "구독이 취소되었습니다." });
  }

  await subRef.set({ email, status: "active", subscribedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  return NextResponse.json({ ok: true, message: "구독 완료! 다음 뉴스레터부터 받아보실 수 있습니다." });
}
