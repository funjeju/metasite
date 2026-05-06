import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  try {
    let q = adminDb.collection("alerts").orderBy("createdAt", "desc").limit(limit) as FirebaseFirestore.Query;
    if (status) q = q.where("status", "==", status);
    const snap = await q.get();
    const alerts = snap.docs.map((d) => serialize(d.data()));
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("GET /api/alerts:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { alertId, status } = await req.json();
    if (!alertId || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const update: Record<string, unknown> = { status };
    if (status === "acknowledged") {
      update.acknowledgedBy = session.email;
      update.acknowledgedAt = Timestamp.now();
    } else if (status === "resolved") {
      update.resolvedAt = Timestamp.now();
    }

    await adminDb.collection("alerts").doc(alertId).update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/alerts:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
