import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Whether real Xsolla credentials are present. The project has not been approved/activated
// yet (see CLAUDE.md's Xsolla checklist) -- every caller of createXsollaToken/the token API
// route must check this first and fail soft ("not configured yet") rather than attempting
// a request that can only ever fail.
export function isXsollaConfigured(): boolean {
  return Boolean(process.env.XSOLLA_PROJECT_ID && process.env.XSOLLA_MERCHANT_ID && process.env.XSOLLA_API_KEY);
}

// Defaults to the sandbox host unless XSOLLA_SANDBOX is explicitly set to "false" -- never
// want a missing/misconfigured env var to accidentally point at production.
function isSandbox(): boolean {
  return process.env.XSOLLA_SANDBOX !== "false";
}

/**
 * Requests a Xsolla Pay Station token for a single virtual-item purchase.
 *
 * NOT VERIFIED against a live Xsolla account -- there is none yet. Based on Xsolla's
 * documented Pay Station Token API (Merchant API v2, "create token" for a purchase of one
 * or more `items` by SKU) as of when this was written. Before relying on this in
 * production, re-check the request shape, auth scheme, and response field names against
 * https://developers.xsolla.com/api/pay-station-merchant/ once real credentials exist --
 * exact field names or the auth mechanism may have changed since.
 */
export async function createXsollaToken(params: { uid: string; email: string; sku: string; returnUrl: string }): Promise<{ token: string; paymentUrl: string }> {
  const projectId = process.env.XSOLLA_PROJECT_ID;
  const merchantId = process.env.XSOLLA_MERCHANT_ID;
  const apiKey = process.env.XSOLLA_API_KEY;
  if (!projectId || !merchantId || !apiKey) throw new Error("Xsolla is not configured.");

  const sandbox = isSandbox();
  const auth = Buffer.from(`${merchantId}:${apiKey}`).toString("base64");
  const response = await fetch(`https://api.xsolla.com/merchant/v2/projects/${projectId}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      user: {
        id: { value: params.uid },
        email: { value: params.email },
      },
      purchase: {
        items: [{ sku: params.sku, quantity: 1 }],
      },
      settings: {
        return_url: params.returnUrl,
        ...(sandbox ? { mode: "sandbox" } : {}),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Xsolla token request failed (${response.status}): ${detail}`);
  }

  const data: { token?: string } = await response.json();
  if (!data.token) throw new Error("Xsolla response did not include a token.");

  const host = sandbox ? "sandbox-secure.xsolla.com" : "secure.xsolla.com";
  return { token: data.token, paymentUrl: `https://${host}/paystation4/?token=${data.token}` };
}

/**
 * Verifies the `Authorization: Signature <hash>` header Xsolla sends on webhook requests.
 * NOT VERIFIED against a real webhook delivery -- based on Xsolla's documented scheme
 * (hex SHA-1 of the raw request body concatenated with the project's secret key). Re-check
 * against https://developers.xsolla.com/doc/pay-station/how-to/webhooks/#security once a
 * real webhook can actually be received and inspected.
 */
export function verifyXsollaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.XSOLLA_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHash("sha1").update(rawBody + secret).digest("hex");
  const provided = signatureHeader.replace(/^Signature\s+/i, "").trim();
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
