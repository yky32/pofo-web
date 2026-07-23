export type GalleryStatus = "draft" | "shared" | "proofing" | "final" | "archived";
export type PhotoKind = "jpeg" | "raw" | "final";
export type VersionLabel = "draft" | "final";

export interface Profile {
  id: string;
  display_name: string | null;
  studio_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gallery {
  id: string;
  owner_id: string;
  title: string;
  client_name: string | null;
  description: string | null;
  cover_photo_id: string | null;
  status: GalleryStatus;
  selection_limit: number;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  selection_count?: number;
}

export interface Photo {
  id: string;
  gallery_id: string;
  owner_id: string;
  kind: PhotoKind;
  storage_key: string;
  thumbnail_key: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  version_label: VersionLabel;
  created_at: string;
}

export interface ShareLink {
  id: string;
  gallery_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  allow_raw_download: boolean;
  raw_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PhotoSelection {
  id: string;
  gallery_id: string;
  photo_id: string;
  share_link_id: string | null;
  client_label: string | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  owner_id: string;
  photo_id: string;
  gallery_id: string | null;
  title: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}
