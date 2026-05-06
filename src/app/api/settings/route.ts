import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await adminDb.collection("meta_sites").doc("default").get();
  const settings = doc.exists ? serialize(doc.data()!) : {};
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  const allowedKeys = ["defaultModel", "defaultLanguage", "defaultPersona", "defaultTone", "cronEnabled", "maxDailyPosts", "alertEmail", "slackWebhook"];
  for (const k of allowedKeys) {
    if (k in updates) allowed[k] = updates[k];
  }
  allowed.updatedAt = FieldValue.serverTimestamp();

  await adminDb.collection("meta_sites").doc("default").set(allowed, { merge: true });
  return NextResponse.json({ ok: true });
}
