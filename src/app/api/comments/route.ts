import { cookies } from "next/headers";
import { getArticleBySlug } from "@/lib/articles";
import { callSubmissionScript } from "@/lib/submission-service";
import { EMAIL_PATTERN } from "@/lib/submission-upload";

const cookieName = "tamed-comment-session";
const unavailable = () => Response.json({ error: "Comments are temporarily unavailable." }, { status: 503 });

export async function GET(request: Request) {
  const article = getArticleBySlug(new URL(request.url).searchParams.get("article") ?? "");
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return unavailable();
  try {
    const result = await callSubmissionScript(endpoint, { action: "listComments", articleId: article.id }, 12_000);
    if (!result.success || !Array.isArray(result.comments)) return unavailable();
    return Response.json({ comments: result.comments, remembered: (await cookies()).has(cookieName) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Invalid request." }, { status: 403 });
  }
  const input = await request.json().catch(() => null);
  const article = typeof input?.article === "string" ? getArticleBySlug(input.article) : undefined;
  const text = typeof input?.text === "string" ? input.text.trim() : "";
  if (!article || !text || text.length > 2000) {
    return Response.json({ error: "Enter a comment of up to 2,000 characters." }, { status: 400 });
  }
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return unavailable();
  const jar = await cookies();
  const commentSession = jar.get(cookieName)?.value;
  const bcwoId = typeof input?.bcwoId === "string" ? input.bcwoId.trim() : "";
  const verificationEmail = typeof input?.verificationEmail === "string" ? input.verificationEmail.trim() : "";
  if (!commentSession && (!bcwoId || bcwoId.length > 120 || verificationEmail.length > 254 || !EMAIL_PATTERN.test(verificationEmail))) {
    return Response.json({ error: "Enter your BCWO registration ID and email.", verify: true }, { status: 400 });
  }
  try {
    const result = await callSubmissionScript(endpoint, {
      action: "addComment", articleId: article.id, text, commentSession, bcwoId, verificationEmail,
    }, 12_000);
    if (!result.success || !result.comment || !result.commentSession) {
      if (result.code === "COMMENT_VERIFICATION_REQUIRED" || result.code === "WRITER_NOT_FOUND" || result.code === "WRITER_INACTIVE") {
        jar.delete(cookieName);
        return Response.json({ error: "Enter an active BCWO registration ID and its registered email.", verify: true }, { status: 403 });
      }
      if (result.code === "COMMENT_RATE_LIMIT") {
        return Response.json({ error: "Please wait a moment before commenting again." }, { status: 429 });
      }
      return unavailable();
    }
    jar.set(cookieName, result.commentSession, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60,
    });
    return Response.json({ comment: result.comment }, { status: 201 });
  } catch {
    return unavailable();
  }
}
