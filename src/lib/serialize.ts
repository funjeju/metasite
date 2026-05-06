import type { Timestamp } from "firebase-admin/firestore";

type AnyValue = string | number | boolean | null | undefined | AnyValue[] | { [k: string]: AnyValue };

function isTimestamp(v: unknown): v is Timestamp {
  return !!v && typeof v === "object" && "toDate" in v && typeof (v as Timestamp).toDate === "function";
}

export function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (isTimestamp(data)) return data.toDate().toISOString() as unknown as T;
  if (Array.isArray(data)) return data.map(serialize) as unknown as T;
  if (typeof data === "object") {
    const result: Record<string, AnyValue> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serialize(value) as AnyValue;
    }
    return result as T;
  }
  return data;
}
