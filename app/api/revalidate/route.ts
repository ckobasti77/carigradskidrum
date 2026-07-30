import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand cache invalidation, called by Convex actions after admin
 * approvals (M2+): POST { secret, tags?: string[], paths?: string[] }.
 * Tags come from lib/data.ts ("directory", "categories", `company:{slug}`).
 * Next 16: revalidateTag REQUIRES the cacheLife profile second argument.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const body = (await request.json().catch(() => null)) as {
    secret?: string;
    tags?: unknown;
    paths?: unknown;
  } | null;

  if (!secret || !body || body.secret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((path): path is string => typeof path === "string")
    : [];

  for (const tag of tags) revalidateTag(tag, "max");
  for (const path of paths) revalidatePath(path);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true, tags: tags.length, paths: paths.length });
}
