import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

// IndexNow — notify Bing/Yandex/etc. of new URLs
export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { urls, host, apiKey } = await req.json() as {
    urls: string[];
    host: string;
    apiKey: string;
  };

  if (!urls?.length || !host || !apiKey) {
    return NextResponse.json({ error: "urls, host, apiKey required" }, { status: 400 });
  }

  const payload = {
    host,
    key: apiKey,
    keyLocation: `https://${host}/${apiKey}.txt`,
    urlList: urls,
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
  ];

  const results = await Promise.allSettled(
    endpoints.map((endpoint) =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      })
    )
  );

  const statuses = results.map((r, i) =>
    r.status === "fulfilled" ? { endpoint: endpoints[i], status: r.value.status } : { endpoint: endpoints[i], error: String((r as PromiseRejectedResult).reason) }
  );

  return NextResponse.json({ submitted: urls.length, results: statuses });
}
