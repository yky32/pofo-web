export type ProjectStatus =
  | "draft"
  | "shared"
  | "proofing"
  | "final"
  | "archived";

export type ShotKind = "preview" | "jpeg" | "raw" | "final";

export interface Profile {
  id: string;
  display_name: string | null;
  studio_name: string | null;
  /** Public handle → {slug}.pofo.app */
  slug: string | null;
  custom_domain: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioPublic {
  slug: string | null;
  studio_name: string | null;
  display_name: string | null;
  avatar_url?: string | null;
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

export interface Shot {
  id: string;
  project_id: string;
  container_id: string;
  owner_id: string;
  kind: ShotKind;
  storage_key: string | null;
  preview_url: string | null;
  thumbnail_key: string | null;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  captured_at: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  project_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  allow_download: boolean;
  allow_raw_download: boolean;
  raw_expires_at: string | null;
  is_active: boolean;
  selection_limit_override: number | null;
  created_at: string;
}

export interface ShotSelection {
  id: string;
  project_id: string;
  share_link_id: string;
  shot_id: string;
  client_label: string | null;
  created_at: string;
}

/** Client gallery payload from get_client_gallery RPC */
export interface ClientGalleryShot {
  id: string;
  preview_url: string | null;
  filename: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
}

export interface ClientGalleryPayload {
  token: string;
  share_link_id: string;
  project: {
    id: string;
    title: string;
    client_name: string | null;
    description: string | null;
    status: ProjectStatus;
    selection_limit: number;
  };
  studio?: StudioPublic;
  shots: ClientGalleryShot[];
  selected_shot_ids: string[];
  error?: string;
}

/** Display URL for a shot (demo URLs or future signed R2). */
export function shotDisplayUrl(shot: Pick<Shot, "preview_url" | "storage_key">) {
  if (shot.preview_url) return shot.preview_url;
  if (shot.storage_key?.startsWith("http")) return shot.storage_key;
  return null;
}

/** @deprecated Use Project — kept for gradual migration of mock UI */
export type Gallery = Project;
export type GalleryStatus = ProjectStatus;
