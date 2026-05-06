import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = await params;
  const { siteId, ...updates } = await req.json() as { siteId: string; [k: string]: unknown };
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  for (const k of ["name", "url", "type", "enabled"]) {
    if (k in updates) allowed[k] = updates[k];
  }
  allowed.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection("sites").doc(siteId).collection("sources").doc(sourceId).update(allowed);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = await params;
  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  await adminDb.collection("sites").doc(siteId).collection("sources").doc(sourceId).delete();
  return NextResponse.json({ ok: true });
}
