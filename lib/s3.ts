import { S3Client } from "@aws-sdk/client-s3";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000";
const MINIO_ROOT_USER = process.env.MINIO_ROOT_USER || "minioadmin";
const MINIO_ROOT_PASSWORD = process.env.MINIO_ROOT_PASSWORD || "minioadmin";
const MINIO_REGION = process.env.MINIO_REGION || "us-east-1";

export const s3Client = new S3Client({
  region: MINIO_REGION,
  endpoint: MINIO_ENDPOINT,
  forcePathStyle: true, // Required for MinIO
  credentials: {
    accessKeyId: MINIO_ROOT_USER,
    secretAccessKey: MINIO_ROOT_PASSWORD,
  },
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || "uploads";

/**
 * Get the public (browser-facing) URL for a file.
 *
 * When MINIO_PUBLIC_URL is set, it is used as the full base path (including
 * the bucket mapping), so only the object key is appended. Example:
 *   MINIO_PUBLIC_URL=https://192.168.1.50/files  →  /files/{key}
 *   nginx proxies /files/ → minio:9000/uploads/  (the bucket)
 *
 * When MINIO_PUBLIC_URL is not set (local dev), falls back to direct MinIO
 * access: http://localhost:9000/{bucket}/{key}
 */
export function getPublicUrl(key: string): string {
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    if (publicUrl) {
        // MINIO_PUBLIC_URL maps directly to the bucket via nginx proxy
        return `${publicUrl}/${key}`;
    }
    return `${MINIO_ENDPOINT}/${BUCKET_NAME}/${key}`;
}
