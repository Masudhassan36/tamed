import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getArticleBySlug } from "@/lib/articles";
import { callSubmissionScript } from "@/lib/submission-service";

const cookieName = "tamed-like-browser";
const unavailable = () => Response.json({ error: "Likes are temporarily unavailable." }, { status: 503 });

async function readOrSetLike(slug: string, liked?: boolean) {
  const article = getArticleBySlug(slug);
  if (!article) return Response.json({ error: "Article not found." }, { status: 404 });
  const endpoint = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!endpoint) return unavailable();

  const jar = await cookies();
  const existing = jar.get(cookieName)?.value;
  const visitor = existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID();
  try {
    const result = await callSubmissionScript(endpoint, {
      action: liked === undefined ? "getLikes" : "setLike",
      articleId: article.id, visitor, liked,
    }, 12_000);
    if (!result.success || !Number.isInteger(result.likes) || typeof result.liked !== "boolean") return unavailable();
    jar.set(cookieName, visitor, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60,
    });
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
  return readOrSetLike(input.article, input.liked);
}
