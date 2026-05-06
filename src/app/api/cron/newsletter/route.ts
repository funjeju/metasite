import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Called by Vercel Cron every Monday at 09:00 UTC
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sitesSnap = await adminDb
    .collection("child_sites")
    .where("status", "==", "active")
    .where("newsletter.enabled", "==", true)
    .get();

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get("host")}`;
  const results: Array<{ siteId: string; ok: boolean; sent?: number }> = [];

  for (const doc of sitesSnap.docs) {
    try {
      const res = await fetch(`${baseUrl}/api/sites/${doc.id}/newsletter/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET ?? "",
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json() as { sent?: number };
        results.push({ siteId: doc.id, ok: true, sent: data.sent });
      } else {
        results.push({ siteId: doc.id, ok: false });
      }
    } catch (err) {
      console.error(`Newsletter send failed for ${doc.id}:`, err);
      results.push({ siteId: doc.id, ok: false });
    }
  }

  return NextResponse.json({ ok: true, results });
}
