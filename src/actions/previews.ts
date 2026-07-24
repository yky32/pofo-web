"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { processPendingPreviews } from "@/lib/preview-worker";

/**
 * Photographer-triggered: generate missing previews/thumbs for this project
 * (Sharp on JPEG originals). Does not block the upload path.
 */
export async function processProjectPreviews(input: {
  projectId: string;
  limit?: number;
}): Promise<{
  ok?: boolean;
  error?: string;
  processed?: number;
  failed?: number;
  skipped?: number;
}> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  // Prefer service role for storage download/upload
  const worker = createAdminClient() ?? supabase;
  const result = await processPendingPreviews(worker, {
    projectId: input.projectId,
    ownerId: user.id,
    limit: input.limit ?? 30,
  });

  revalidatePath(`/dashboard/galleries/${input.projectId}`);
  return {
    ok: true,
    processed: result.processed,
    failed: result.failed,
    skipped: result.skipped,
    ...(result.errors.length
      ? { error: result.errors[0] }
      : {}),
  };
}
