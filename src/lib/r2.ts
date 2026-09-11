import { S3Client } from "@aws-sdk/client-s3";

// Reads credentials from env vars (see .env.local.example) rather than committing
// them to the repo. R2's S3-compatible API needs an Access Key ID/Secret pair,
// which is distinct from the Cloudflare API token wrangler/the dashboard use.
function loadR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      "Missing R2 credentials. Copy .env.local.example entries for R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL into .env.local."
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (client) return client;
  const { accountId, accessKeyId, secretAccessKey } = loadR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getR2Bucket(): string {
  return loadR2Config().bucket;
}

export function getR2PublicUrl(key: string): string {
  const { publicBaseUrl } = loadR2Config();
  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}
