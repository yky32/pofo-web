import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function bucket() {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not configured");
  return name;
}

export async function createUploadUrl(key: string, contentType: string) {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: 60 * 15 });
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
  galleryId: string,
  filename: string
) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `owners/${ownerId}/galleries/${galleryId}/${Date.now()}-${safe}`;
}
