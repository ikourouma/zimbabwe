import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 adapter (S3-compatible). Objects are private; downloads are only ever served via
 * a short-lived signed URL after a Route Handler re-checks the caller's access. Mirrors the
 * convention documented in lib/db/schema/documents.ts / attachments.ts.
 *
 * Lazily constructed so `next build` never fails when R2 env vars are absent — the client is only
 * built the first time an upload/download actually runs.
 */
let client: S3Client | null = null;

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured");
  return bucket;
}

function getClient(): S3Client {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not configured");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType })
  );
}

/** Returns true when the object exists in the configured bucket. */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return true;
  } catch (error) {
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) return false;
    throw error;
  }
}

/** A short-lived (default 5 min) signed GET URL — long enough to stream one download, short enough
 *  that a leaked URL is useless. `disposition` defaults to `"attachment"` (forces a save-to-disk
 *  download); pass `"inline"` so the browser renders the file in-tab instead — the signal behind
 *  the lightweight "document.previewed" telemetry event (see the download route), distinct from a
 *  full VDR watermarking pipeline (deferred — see BACKLOG.md). */
export async function getSignedDownloadUrl(
  key: string,
  fileName?: string,
  expiresInSeconds = 300,
  disposition: "attachment" | "inline" = "attachment"
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ...(fileName
      ? { ResponseContentDisposition: `${disposition}; filename="${fileName.replace(/"/g, "")}"` }
      : {}),
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}
