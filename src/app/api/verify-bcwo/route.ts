import { verifyWriter } from "@/lib/submission-service";

export async function POST(request: Request) {
  const status = await verifyWriter(request);
  return Response.json({ verified: status === "verified" || status === "limit-reached", status }, {
    status: status === "unavailable" ? 503 : status === "incomplete" ? 400 : 200,
  });
}
