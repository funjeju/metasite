import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// POST /api/webhook/[siteId]
// External trigger for pipeline. Requires x-webhook-secret header matching site.webhookSecret.
// Body: { action: "generate" | "authority", seq?: number }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const secret = req.headers.get("x-webhook-secret");

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const site = siteDoc.data()!;
  const webhookSecret = site.webhookSecret as string | undefined;
  if (!webhookSecret || secret !== webhookSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { action?: string; seq?: number };
  const action = body.action ?? "generate";
  const phase: string = site.currentPhase ?? "authority";
  const endpoint = (action === "authority" || phase === "authority")
    ? "/api/pipeline/authority"
    : "/api/pipeline/generate";

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get("host")}`;

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass a special internal auth header so the pipeline route can accept it
        "x-webhook-secret": webhookSecret,
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ siteId, ...(body.seq !== undefined ? { seq: body.seq } : {}) }),
    });
    const data = await res.json() as Record<string, unknown>;
    return NextResponse.json({ ok: res.ok, ...data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
