import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { generateOutline } from "@/lib/ai/outline-generator";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";

// GET: fetch existing outline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;

  const snap = await adminDb
    .collection("sites")
    .doc(siteId)
    .collection("outline")
    .orderBy("seq", "asc")
    .get();

  const items = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
  return NextResponse.json({ items });
}

// POST: generate new outline via AI
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const site = siteDoc.data()!;
  const ctx = {
    siteId,
    name: site.displayName ?? site.name ?? siteId,
    topic: site.topic ?? "",
    persona: site.persona ?? "curator",
    tone: site.tone ?? "professional",
    language: site.language ?? "ko",
    canonicalDomain: site.seoConfig?.canonicalDomain ?? "",
    promptOverrides: (site.promptOverrides as { writer?: string; verifier?: string; editor?: string; outlineGenerator?: string }) ?? {},
  };

  try {
    const outline = await generateOutline(ctx);

    // Batch write to Firestore
    const batch = adminDb.batch();
    const colRef = adminDb.collection("sites").doc(siteId).collection("outline");

    for (const item of outline) {
      const docRef = colRef.doc(`${item.seq}`);
      batch.set(docRef, {
        ...item,
        status: "pending", // pending | approved | rejected | published
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // Update site status
    await adminDb.collection("child_sites").doc(siteId).update({
      "stats.outlineCount": outline.length,
      outlineGeneratedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ count: outline.length, items: outline });
  } catch (err) {
    console.error("POST /api/sites/[siteId]/outline:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}

// PATCH: update outline item status (approve/reject)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  const body = await req.json() as {
    seq?: number;
    status?: "approved" | "rejected" | "pending";
    bulkAction?: "approve_all" | "reject_all";
  };

  // Bulk action
  if (body.bulkAction) {
    const snap = await adminDb
      .collection("sites").doc(siteId).collection("outline")
      .where("status", "==", "pending")
      .get();
    const newStatus = body.bulkAction === "approve_all" ? "approved" : "rejected";
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { status: newStatus, updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();
    return NextResponse.json({ ok: true, updated: snap.size });
  }

  if (body.seq === undefined || !body.status) {
    return NextResponse.json({ error: "seq and status required" }, { status: 400 });
  }

  await adminDb
    .collection("sites")
    .doc(siteId)
    .collection("outline")
    .doc(`${body.seq}`)
    .update({ status: body.status, updatedAt: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true });
}
