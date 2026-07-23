"use server";

import {
  identitiesFromUser,
  type LinkedIdentity,
} from "@/lib/auth-identities";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getLinkedIdentities(): Promise<LinkedIdentity[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return identitiesFromUser(user ?? undefined);
}
