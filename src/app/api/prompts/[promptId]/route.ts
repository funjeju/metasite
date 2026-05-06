import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ promptId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { promptId } = await params;
  const updates = await req.json() as Record<string, unknown>;

  const allowed: Record<string, unknown> = {};
  for (const k of ["content", "notes", "active"]) {
    if (k in updates) allowed[k] = updates[k];
  }

  // If activating, deactivate all others with same role
  if (allowed.active === true) {
    const doc = await adminDb.collection("prompt_assets").doc(promptId).get();
    if (doc.exists) {
      const role = doc.data()!.role as string;
      const snap = await adminDb.collection("prompt_assets").where("role", "==", role).where("active", "==", true).get();
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { active: false }));
      batch.update(adminDb.collection("prompt_assets").doc(promptId), { ...allowed, updatedAt: FieldValue.serverTimestamp() });
      await batch.commit();
      return NextResponse.json({ ok: true });
    }
  }

  allowed.updatedAt = FieldValue.serverTimestamp();
  await adminDb.collection("prompt_assets").doc(promptId).update(allowed);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ promptId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { promptId } = await params;
  await adminDb.collection("prompt_assets").doc(promptId).delete();
  return NextResponse.json({ ok: true });
}
