import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Checks credential presence; project activation is managed in Xsolla.
export function isXsollaConfigured(): boolean {
  return Boolean(process.env.XSOLLA_PROJECT_ID && process.env.XSOLLA_MERCHANT_ID && process.env.XSOLLA_API_KEY);
}

// Defaults to the sandbox host unless XSOLLA_SANDBOX is explicitly set to "false" -- never
// want a missing/misconfigured env var to accidentally point at production.
function isSandbox(): boolean {
  return process.env.XSOLLA_SANDBOX !== "false";
}

/** Creates a catalog order and payment token for one package.
 * https://developers.xsolla.com/api/catalog/payment-server-side
 */
export async function createXsollaToken(params: { uid: string; email: string; sku: string; returnUrl: string }): Promise<{ token: string; paymentUrl: string }> {
  const projectId = process.env.XSOLLA_PROJECT_ID;
  const merchantId = process.env.XSOLLA_MERCHANT_ID;
  const apiKey = process.env.XSOLLA_API_KEY;
  if (!projectId || !merchantId || !apiKey) throw new Error("Xsolla is not configured.");

  const sandbox = isSandbox();
  const auth = Buffer.from(`${merchantId}:${apiKey}`).toString("base64");
  const response = await fetch(`https://store.xsolla.com/api/v3/project/${projectId}/admin/payment/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      sandbox,
      user: {
        id: { value: params.uid },
        email: { value: params.email },
        country: { value: "PH", allow_modify: true },
      },
      purchase: {
        items: [{ sku: params.sku, quantity: 1 }],
      },
      settings: {
        return_url: params.returnUrl,
        currency: "PHP",
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
