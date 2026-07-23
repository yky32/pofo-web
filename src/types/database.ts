export type ProjectStatus =
  | "draft"
  | "shared"
  | "proofing"
  | "final"
  | "archived";

export interface Profile {
  id: string;
  display_name: string | null;
  studio_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  client_name: string | null;
  description: string | null;
  status: ProjectStatus;
  selection_limit: number;
  created_at: string;
  updated_at: string;
  /** Optional UI denorms */
  photo_count?: number;
  selection_count?: number;
}

export interface Container {
  id: string;
  project_id: string;
  name: string;
  concept: string | null;
  sort_order: number;
  selection_limit: number | null;
  is_client_visible_default: boolean;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Project — kept for gradual migration of mock UI */
export type Gallery = Project;
export type GalleryStatus = ProjectStatus;
