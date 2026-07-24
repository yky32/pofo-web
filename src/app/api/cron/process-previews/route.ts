import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingPreviews } from "@/lib/preview-worker";

/**
 * Minimum viable background preview worker.
 * Protect with CRON_SECRET (Authorization: Bearer …) or x-cron-secret header.
 *
 * Vercel cron example:
 *   path: /api/cron/process-previews
 *   schedule: every 5 minutes
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.PREVIEW_WORKER_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    const header = req.headers.get("x-cron-secret") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : header;
    if (token !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Refuse open cron in production without a secret
    return NextResponse.json(
      { error: "Set CRON_SECRET to enable the preview worker." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 25);

  const result = await processPendingPreviews(admin, {
    limit: Number.isFinite(limit) ? limit : 25,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
