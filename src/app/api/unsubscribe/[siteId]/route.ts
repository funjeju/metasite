import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

type Params = { params: Promise<{ siteId: string }> };

// GET: browser-friendly unsubscribe via email param (linked from emails)
export async function GET(req: NextRequest, { params }: Params) {
  const { siteId } = await params;
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.redirect(new URL(`/unsubscribe/${siteId}?error=missing`, req.url));

  const subRef = adminDb
    .collection("child_sites").doc(siteId)
    .collection("newsletter_subscribers").doc(Buffer.from(email).toString("base64url"));

  await subRef.set({ email, status: "unsubscribed", updatedAt: Timestamp.now() }, { merge: true });
  return NextResponse.redirect(new URL(`/unsubscribe/${siteId}?done=1&email=${encodeURIComponent(email)}`, req.url));
}
