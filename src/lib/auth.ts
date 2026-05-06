import { adminAuth } from "./firebase-admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14일

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
}

export async function verifySession(): Promise<{ uid: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!session) return null;

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const email = decoded.email ?? "";

    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null;

    return { uid: decoded.uid, email };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session;
}

export function verifyInternal(req: { headers: { get(name: string): string | null } }): boolean {
  const secret = req.headers.get("x-cron-secret");
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}
