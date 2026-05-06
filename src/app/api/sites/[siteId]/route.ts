import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Timestamp } from "firebase-admin/firestore";

type Params = { params: Promise<{ siteId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  try {
    const doc = await adminDb.collection("child_sites").doc(siteId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ site: serialize(doc.data()!) });
  } catch (err) {
    console.error(`GET /api/sites/${siteId}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  try {
    const body = await req.json();
    const ALLOWED = [
      "name", "displayName", "topic", "persona", "tone",
      "status", "currentPhase", "sections",
      "seoConfig", "monetization", "analytics", "hostingConfig", "newsletter", "integrations", "promptOverrides",
    ];

    const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key];
    }

    await adminDb.collection("child_sites").doc(siteId).update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`PATCH /api/sites/${siteId}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  try {
    await adminDb.collection("child_sites").doc(siteId).update({
      status: "archived",
      updatedAt: Timestamp.now(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/sites/${siteId}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
