import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ personaId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { personaId } = await params;
  const { siteId, ...updates } = await req.json() as { siteId?: string; [k: string]: unknown };

  const allowed: Record<string, unknown> = {};
  for (const k of ["name", "role", "systemPrompt", "tone", "language"]) {
    if (k in updates) allowed[k] = updates[k];
  }
  allowed.updatedAt = FieldValue.serverTimestamp();

  const ref = siteId
    ? adminDb.collection("sites").doc(siteId).collection("personas").doc(personaId)
    : adminDb.collection("personas").doc(personaId);

  await ref.update(allowed);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ personaId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { personaId } = await params;
  const siteId = req.nextUrl.searchParams.get("siteId");

  const ref = siteId
    ? adminDb.collection("sites").doc(siteId).collection("personas").doc(personaId)
    : adminDb.collection("personas").doc(personaId);

  await ref.delete();
  return NextResponse.json({ ok: true });
}
