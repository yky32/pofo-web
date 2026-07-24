export type ProjectStatus =
  | "draft"
  | "shared"
  | "proofing"
  | "final"
  | "archived";

export type ShotKind = "preview" | "jpeg" | "raw" | "paired" | "final";
export type ProcessingStatus = "pending" | "ready" | "failed";

/** Who owns a project: personal user or studio team */
export type ProjectOwnerType = "user" | "team";

export type TeamMemberRole = "owner" | "admin" | "member";
export type TeamMemberStatus = "active" | "invited";

export interface Profile {
  id: string;
  display_name: string | null;
  studio_name: string | null;
  /** Personal public brand → {slug}.pofo.app /s/{slug} */
  slug: string | null;
  avatar_url: string | null;
  /**
   * Linked auth providers (google, apple, email, …).
   * Denormalized from auth.identities — source of truth remains Auth.
   */
  providers?: string[] | null;
  /** free | solo | pro — Free by default */
  plan?: "free" | "solo" | "pro" | null;
  billing_interval?: "monthly" | "annual" | null;
  created_at: string;
  updated_at: string;
}

/** Studio company workspace (team) */
export interface Team {
  id: string;
  name: string;
  /** Team public brand slug (separate from profiles.slug) */
  slug: string;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** Role of current user when listed for session */
  my_role?: TeamMemberRole;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  created_at: string;
}

/** Cookie / UI workspace context */
export type WorkspaceContext =
  | { kind: "personal" }
  | { kind: "team"; teamId: string; teamName?: string; teamSlug?: string };

export interface StudioPublic {
  slug: string | null;
  studio_name: string | null;
  display_name: string | null;
  avatar_url?: string | null;
}

export interface Project {
  id: string;
  owner_id: string;
  /**
   * `user` → owner_id is profiles.id (default, existing rows)
   * `team` → owner_id is teams.id
   */
  owner_type?: ProjectOwnerType;
  title: string;
  client_name: string | null;
  description: string | null;
  /**
   * When the shoot/event happened (calendar date).
   * Separate from created_at — for Memories timeline / filter.
   */
  event_date?: string | null;
  /**
   * Where it happened. Free text; multiple places ok
   * e.g. "Hong Kong · The Peninsula · Church of St. John"
   */
  location?: string | null;
  /**
   * Free-form labels for library filter + job nature
   * e.g. ["Wedding", "Commercial"].
   */
  tags?: string[] | null;
  status: ProjectStatus;
  selection_limit: number;
  /** Client marked proofing complete (or hit limit) */
  proofing_completed_at?: string | null;
  proofing_completed_count?: number | null;
  proofing_completed_via?: "client" | "limit" | null;
  created_at: string;
  updated_at: string;
  /** Optional UI denorms */
  photo_count?: number;
  selection_count?: number;
  /** First photo signed/external URL for cards (read-time only) */
  cover_url?: string | null;
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
  /** Companion RAW when kind = paired */
  raw_key?: string | null;
  /** Web-safe preview object key (never use raw_key for <img>) */
  preview_key?: string | null;
  /** ready | pending | failed — pending when RAW has no web preview */
  processing_status?: ProcessingStatus | null;
  processing_error?: string | null;
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
  /** Client may download originals (JPEG/RAW) while window is open */
  allow_original_download?: boolean;
  original_expires_at?: string | null;
}

export interface PortfolioItem {
  id: string;
  owner_id: string;
  shot_id: string;
  project_id: string | null;
  title: string | null;
  caption: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
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
    proofing_completed_at?: string | null;
  };
  studio?: StudioPublic;
  shots: ClientGalleryShot[];
  selected_shot_ids: string[];
  /** Photographer enabled original/RAW download for this link */
  allow_original_download?: boolean;
  /** ISO timestamp; null = no extra expiry beyond link */
  original_expires_at?: string | null;
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
