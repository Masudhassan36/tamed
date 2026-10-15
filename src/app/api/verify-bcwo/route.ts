import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return NextResponse.json({ verified: false }, { status: 503 });
  const body = await request.json() as { bcwoId?: string; verificationEmail?: string };
  if (!body.bcwoId?.trim() || !body.verificationEmail?.trim()) return NextResponse.json({ verified: false }, { status: 400 });
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", bcwoId: body.bcwoId, verificationEmail: body.verificationEmail }) });
    const result = await response.json() as { verified?: boolean };
    return NextResponse.json({ verified: response.ok && result.verified === true });
  } catch { return NextResponse.json({ verified: false }, { status: 502 }); }
}
