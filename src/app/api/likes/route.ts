import { cookies } from "next/headers";
import { getArticleBySlug } from "@/lib/articles";
import { callSubmissionScript } from "@/lib/submission-service";
import { EMAIL_PATTERN } from "@/lib/submission-upload";

const cookieName = "tamed-comment-session";
const unavailable = () => Response.json({ error: "Likes are temporarily unavailable." }, { status: 503 });

async function readOrSetLike(slug: string, liked?: boolean, credentials?: { bcwoId: string; verificationEmail: string }) {
  const article = getArticleBySlug(slug);
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return unavailable();

  const jar = await cookies();
  const commentSession = jar.get(cookieName)?.value;
  const verify = () => Response.json({ error: "Enter your active BCWO ID and registered email.", verify: true }, { status: 403 });
  if (liked !== undefined && !commentSession && !credentials) return verify();
  try {
    const result = await callSubmissionScript(endpoint, {
      action: liked === undefined ? "getLikes" : "setLike",
      articleId: article.id, commentSession, liked, ...credentials,
    }, 12_000);
    if (!result.success && ["COMMENT_VERIFICATION_REQUIRED", "WRITER_NOT_FOUND", "WRITER_INACTIVE"].includes(result.code ?? "")) {
      jar.delete(cookieName);
      return verify();
    }
    if (!result.success || !Number.isInteger(result.likes) || typeof result.liked !== "boolean") return unavailable();
    if (liked !== undefined) {
      if (!result.commentSession) return unavailable();
      jar.set(cookieName, result.commentSession, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60,
      });
    }
    return Response.json({ likes: result.likes, liked: result.liked }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return unavailable();
  }
}

export async function GET(request: Request) {
  return readOrSetLike(new URL(request.url).searchParams.get("article") ?? "");
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Invalid request." }, { status: 403 });
  }
  const input = await request.json().catch(() => null);
  if (typeof input?.article !== "string" || typeof input?.liked !== "boolean") {
    return Response.json({ error: "Invalid like." }, { status: 400 });
  }
  const bcwoId = typeof input.bcwoId === "string" ? input.bcwoId.trim() : "";
  const verificationEmail = typeof input.verificationEmail === "string" ? input.verificationEmail.trim() : "";
  const credentials = bcwoId && bcwoId.length <= 120 && verificationEmail.length <= 254 && EMAIL_PATTERN.test(verificationEmail)
    ? { bcwoId, verificationEmail } : undefined;
  return readOrSetLike(input.article, input.liked, credentials);
}
