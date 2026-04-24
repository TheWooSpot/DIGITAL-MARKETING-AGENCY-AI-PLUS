const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

type RequestBody = {
  email?: string;
  business_name?: string;
  share_url?: string;
  share_token?: string;
  submitted_url?: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "Socialutely <onboarding@resend.dev>";
  const SITE_URL = Deno.env.get("SITE_URL") ?? "https://socialutely-any-door-engine.vercel.app";

  if (!RESEND_API_KEY) return json({ error: "Missing RESEND_API_KEY" }, 500);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = String(body.email ?? "").trim();
  if (!email || !email.includes("@")) return json({ error: "Missing or invalid email" }, 400);

  const businessName = String(body.business_name ?? "Your business").trim() || "Your business";
  const shareUrl = String(body.share_url ?? "").trim();
  const submittedUrl = String(body.submitted_url ?? "").trim();
  const token = String(body.share_token ?? "").trim();
  const fallbackShareUrl = shareUrl || `${SITE_URL.replace(/\/$/, "")}/report/${token}`;

  if (!fallbackShareUrl) return json({ error: "Missing share_url/share_token" }, 400);

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 12px 0;">Your Socialutely Diagnostic Report</h2>
    <p style="margin:0 0 10px 0;">Thanks for running your diagnostic for <strong>${businessName}</strong>.</p>
    <p style="margin:0 0 14px 0;">Use this secure link to view your full report:</p>
    <p style="margin:0 0 18px 0;">
      <a href="${fallbackShareUrl}" style="display:inline-block;background:#c9973a;color:#07080d;text-decoration:none;padding:10px 14px;border-radius:6px;font-weight:700;">
        Open Your Report
      </a>
    </p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#555;">Direct link: <a href="${fallbackShareUrl}">${fallbackShareUrl}</a></p>
    ${
      submittedUrl
        ? `<p style="margin:0;font-size:12px;color:#777;">Scanned URL: ${submittedUrl}</p>`
        : ""
    }
  </div>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: `Your Diagnostic Report for ${businessName}`,
      html,
    }),
  });

  const resendBody = await resendRes.text();
  if (!resendRes.ok) {
    return json({ error: "Failed to send email", detail: resendBody.slice(0, 500) }, 500);
  }

  return json({ success: true });
});

