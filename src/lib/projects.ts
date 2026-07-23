import { isSupabaseConfigured } from "@/lib/env";
import { listProjects } from "@/actions/projects";
import { mockGalleries } from "@/lib/mock-data";
import type { Project } from "@/types/database";

/** Real projects when Supabase+auth; otherwise demo mocks. */
export async function getDashboardProjects(): Promise<{
  projects: Project[];
  demoMode: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      projects: mockGalleries as Project[],
      demoMode: true,
    };
  }

  const projects = await listProjects();
  return { projects, demoMode: false };
}
