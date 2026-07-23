import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isR2Configured } from "@/lib/env";

let cached: S3Client | null = null;

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured");
  }

  if (!cached) {
    cached = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return cached;
}

function bucket() {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not configured");
  return name;
}

/** Public base for serving objects (custom domain or r2.dev). */
export function r2PublicBaseUrl() {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  return base;
}

export function r2PublicObjectUrl(key: string) {
  return `${r2PublicBaseUrl()}/${key.replace(/^\//, "")}`;
}

export function isR2Ready() {
  return isR2Configured() && Boolean(process.env.R2_PUBLIC_URL);
}

export async function createUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 60 * 20
) {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function createDownloadUrl(key: string, expiresIn = 60 * 60) {
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export function photoStorageKey(
  ownerId: string,
  projectId: string,
  filename: string,
  unique = crypto.randomUUID()
) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `owners/${ownerId}/projects/${projectId}/${unique}-${safe}`;
}
