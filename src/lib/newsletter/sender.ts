// Newsletter email sender using Resend REST API

export interface SendNewsletterOptions {
  from: string; // e.g. "Newsletter <noreply@yourdomain.com>"
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendNewsletterOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend API error:", res.status, body);
    return false;
  }
  return true;
}

export function buildDigestHtml(
  siteName: string,
  posts: Array<{ title: string; excerpt: string; url: string; publishedAt: string }>,
  unsubscribeUrl: string
): string {
  const items = posts.map((p) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
        <h3 style="margin:0 0 8px;font-size:16px;"><a href="${p.url}" style="color:#111827;text-decoration:none;">${p.title}</a></h3>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${p.excerpt}</p>
        <a href="${p.url}" style="color:#6366f1;font-size:13px;">읽기 →</a>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#6366f1;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">${siteName} 뉴스레터</h1>
    </td></tr>
    <tr><td style="padding:24px 32px;">
      <p style="color:#374151;font-size:15px;">이번 주 새 글을 보내드립니다.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${items}</table>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        더 이상 받고 싶지 않으신가요? <a href="${unsubscribeUrl}" style="color:#9ca3af;">구독 해지</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
