import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Lazy proxy that defers Firebase initialization to first use at runtime,
// preventing build-time failures when env vars are absent.
function lazy<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = factory();
      const val = (instance as Record<string | symbol, unknown>)[prop];
      return typeof val === "function"
        ? (val as (...args: unknown[]) => unknown).bind(instance)
        : val;
    },
  });
}

export const adminApp = lazy(() => getAdminApp());
export const adminDb = lazy(() => getFirestore(getAdminApp()));
export const adminAuth = lazy(() => getAuth(getAdminApp()));
export const adminStorage = lazy(() => getStorage(getAdminApp()));
