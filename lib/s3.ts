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
 * Get the public URL for a file.
 * Replaces internal docker endpoint with localhost for browser access if needed.
 */
export function getPublicUrl(key: string): string {
    // If endpoint contains 'minio' (docker service name), replace with localhost for browser
    // This is a naive check for the dev environment
    let baseUrl = MINIO_ENDPOINT;
    if (baseUrl.includes('minio')) {
        baseUrl = 'http://localhost:9000';
    }
    return `${baseUrl}/${BUCKET_NAME}/${key}`;
}
