import { S3Client } from "@aws-sdk/client-s3";

export class R2ConfigurationError extends Error {}

// Reads credentials from env vars (see .env.local.example) rather than committing
// them to the repo. R2's S3-compatible API needs an Access Key ID/Secret pair,
// which is distinct from the Cloudflare API token wrangler/the dashboard use.
function loadR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    const missing = Object.entries({ R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET_NAME: bucket, R2_PUBLIC_BASE_URL: publicBaseUrl })
      .filter(([, value]) => !value).map(([name]) => name);
    throw new R2ConfigurationError(`Missing website settings: ${missing.join(", ")}. Add them to your hosting project's production environment and redeploy the website.`);
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
