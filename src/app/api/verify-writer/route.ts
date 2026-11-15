import { verifyWriter } from "@/lib/submission-service";

export async function POST(request: Request) {
  const status = await verifyWriter(request);
  return Response.json({ status }, { status: status === "unavailable" ? 503 : 200 });
}
