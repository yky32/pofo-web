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
  avatar_url: string | null;
  /**
   * Linked auth providers (google, apple, email, …).
   * Denormalized from auth.identities — source of truth remains Auth.
   */
  providers?: string[] | null;
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
  sort_order: number;
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
  /** Object key in Supabase Storage or R2 — not a public URL */
  storage_key: string | null;
  /**
   * Optional permanent external URL (demo Unsplash samples only).
   * Uploaded files should leave this null and use signed `display_url`.
   */
  preview_url: string | null;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
  /** Short-lived signed URL attached at read time (not stored in DB) */
  display_url?: string | null;
  /** Signed thumbnail URL when thumbnail_key is set (not stored in DB) */
  thumb_url?: string | null;
  /** Studio-only note */
  studio_note?: string | null;
  /** Studio flag: none | print | retouch | hero | reject */
  studio_flag?: string | null;
  /** Optional web thumbnail object key */
  thumbnail_key?: string | null;
}

export interface ShareLink {
  id: string;
  project_id: string;
  /** Unguessable URL token — not derived from password */
  token: string;
  /** scrypt hash only; never send plain password or hash to the client UI */
  password_hash: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  view_count?: number;
  last_viewed_at?: string | null;
  last_email_to?: string | null;
  last_email_at?: string | null;
}

export type StudioFlag = "none" | "print" | "retouch" | "hero" | "reject";

export interface ShotSelection {
  id: string;
  project_id: string;
  share_link_id: string;
  shot_id: string;
  created_at: string;
}

/** Client gallery payload from get_client_gallery RPC (+ signed display_url) */
export interface ClientGalleryShot {
  id: string;
  storage_key?: string | null;
  preview_url: string | null;
  /** Short-lived signed URL for private storage objects */
  display_url?: string | null;
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

/**
 * Prefer short-lived display_url (signed), then demo/external preview_url.
 * Never treat raw storage_key as a browser URL unless it is already http(s).
 */
export function shotDisplayUrl(
  shot: Pick<Shot, "preview_url" | "storage_key"> & {
    display_url?: string | null;
  }
) {
  if (shot.display_url) return shot.display_url;
  if (shot.preview_url) return shot.preview_url;
  if (shot.storage_key?.startsWith("http")) return shot.storage_key;
  return null;
}

/** @deprecated Use Project — kept for gradual migration of mock UI */
export type Gallery = Project;
export type GalleryStatus = ProjectStatus;
