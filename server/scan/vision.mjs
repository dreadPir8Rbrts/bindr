// Google Cloud Vision TEXT_DETECTION over REST. Authenticates with either an API key
// (GOOGLE_VISION_API_KEY) or a base64 service-account JSON (GOOGLE_CREDENTIALS_BASE64,
// the same format leftovers.gg uses), signing the OAuth JWT with node:crypto.
import { createSign } from 'node:crypto';

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
const SCOPE = 'https://www.googleapis.com/auth/cloud-vision';
const b64url = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

export function createVisionClient({ apiKey, credentialsBase64, fetchImpl = fetch, now = () => Date.now() }) {
 let account = null, cachedToken = null;
 if (!apiKey) {
  try { account = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf8')); } catch { throw Error('GOOGLE_CREDENTIALS_BASE64 is not valid base64 JSON.'); }
  if (!account.client_email || !account.private_key) throw Error('GOOGLE_CREDENTIALS_BASE64 is missing client_email or private_key.');
 }

 async function accessToken() {
  if (cachedToken && cachedToken.expires > now() + 60_000) return cachedToken.value;
  const iat = Math.floor(now() / 1000), aud = account.token_uri || 'https://oauth2.googleapis.com/token';
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ iss: account.client_email, scope: SCOPE, aud, iat, exp: iat + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  const res = await fetchImpl(aud, {
   method: 'POST',
   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
   signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw Error(`Google auth failed (${res.status}): ${body.error_description || body.error || 'no token'}`);
  cachedToken = { value: body.access_token, expires: now() + (body.expires_in || 3600) * 1000 };
  return cachedToken.value;
 }

 // Returns the full detected text block, or '' when the image has no text.
 return async function detectText(imageBytes) {
  const url = apiKey ? `${VISION_URL}?key=${encodeURIComponent(apiKey)}` : VISION_URL;
  const headers = { 'Content-Type': 'application/json' };
  if (!apiKey) headers.Authorization = `Bearer ${await accessToken()}`;
  const res = await fetchImpl(url, {
   method: 'POST',
   headers,
   body: JSON.stringify({ requests: [{ image: { content: Buffer.from(imageBytes).toString('base64') }, features: [{ type: 'TEXT_DETECTION' }] }] }),
   signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(`Google Vision request failed (${res.status}): ${body.error?.message || 'unknown error'}`);
  const annotation = body.responses?.[0] || {};
  if (annotation.error?.message) throw Error(`Google Vision error: ${annotation.error.message}`);
  return annotation.textAnnotations?.[0]?.description || '';
 };
}
