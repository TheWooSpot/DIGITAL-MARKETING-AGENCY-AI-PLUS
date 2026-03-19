import { NextRequest, NextResponse } from "next/server";

const PROSPECT_DIAGNOSTIC_URL =
  process.env.NEXT_PUBLIC_DIAGNOSTIC_URL ||
  process.env.NEXT_PUBLIC_PROSPECT_DIAGNOSTIC_URL ||
  "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/prospect-diagnostic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(PROSPECT_DIAGNOSTIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("prospect-diagnostic proxy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach diagnostic service" },
      { status: 502 }
    );
  }
}
