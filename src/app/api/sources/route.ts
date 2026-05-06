import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get("siteId");

  if (siteId) {
    const snap = await adminDb
      .collection("sites").doc(siteId).collection("sources")
      .orderBy("createdAt", "desc").get();
    return NextResponse.json({ sources: snap.docs.map((d) => serialize({ id: d.id, ...d.data(), siteId })) });
  }

  // All sites
  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();
  const all: unknown[] = [];
  await Promise.all(sitesSnap.docs.map(async (siteDoc) => {
    const snap = await adminDb.collection("sites").doc(siteDoc.id).collection("sources").orderBy("createdAt", "desc").get();
    snap.docs.forEach((d) => all.push(serialize({ id: d.id, ...d.data(), siteId: siteDoc.id, siteName: siteDoc.data().displayName ?? siteDoc.id })));
  }));
  return NextResponse.json({ sources: all });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { siteId: string; url: string; type?: string; name?: string };
  if (!body.siteId || !body.url) return NextResponse.json({ error: "siteId and url required" }, { status: 400 });

  const sourceId = nanoid(10);
  await adminDb.collection("sites").doc(body.siteId).collection("sources").doc(sourceId).set({
    sourceId,
    url: body.url,
    type: body.type ?? "rss",
    name: body.name ?? body.url,
    enabled: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ sourceId }, { status: 201 });
}
