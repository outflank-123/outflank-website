/**
 * Firebase Admin operations via pure REST — no firebase-admin SDK needed.
 * Uses Node.js built-in `crypto` to sign JWTs + native `fetch` for REST calls.
 * This avoids the jose/ES-module crash that firebase-admin causes on Vercel.
 */

import crypto from 'crypto';

// ─── Config ─────────────────────────────────────────────────────────────────

function getConfig() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'outflank-store';
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').replace(/^"|"$/g, '').trim();
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').trim();
  privateKey = privateKey.replace(/\\n/g, '\n');
  return { projectId, clientEmail, privateKey };
}

// ─── Google OAuth2 Access Token ───────────────────────────────────────────────

let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
    return _cachedToken.token;
  }

  const { clientEmail, privateKey } = getConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase Admin: FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY is not set.');
  }

  const now = Math.floor(Date.now() / 1000);

  // Build service-account JWT for Google OAuth2 token exchange
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimsPayload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase',
        'https://www.googleapis.com/auth/identitytoolkit',
      ].join(' '),
    })
  ).toString('base64url');

  const signingInput = `${header}.${claimsPayload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data: any = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Firebase Admin: Failed to obtain Google access token: ${JSON.stringify(data)}`
    );
  }

  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return _cachedToken.token;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a Firebase Custom Auth Token (self-signed JWT) for the given UID.
 * This token can be passed directly to `signInWithCustomToken()` on the client.
 */
export async function createCustomFirebaseToken(
  uid: string,
  claims: Record<string, any> = {}
): Promise<string> {
  const { clientEmail, privateKey } = getConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase Admin: credentials not configured.');
  }

  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now,
      exp: now + 3600,
      uid,
      claims,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Looks up a Firebase user by phone number, or creates one if not found.
 * Uses the Firebase Auth REST API (Identity Toolkit v1).
 */
export async function getOrCreateUserByPhone(
  formattedPhone: string,
  displayName?: string
): Promise<{ user: any; isNew: boolean }> {
  const { projectId } = getConfig();
  const accessToken = await getGoogleAccessToken();
  const base = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}`;
  const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // 1. Look up by phone number
  const lookupRes = await fetch(`${base}/accounts:lookup`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({ phoneNumber: [formattedPhone] }),
  });

  if (lookupRes.ok) {
    const lookupData: any = await lookupRes.json();
    if (lookupData.users && lookupData.users.length > 0) {
      const u = lookupData.users[0];
      // Optionally update displayName
      if (displayName && (!u.displayName || u.displayName !== displayName)) {
        try {
          await fetch(`${base}/accounts:update`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({ localId: u.localId, displayName }),
          });
        } catch {}
      }
      return {
        user: { uid: u.localId, phoneNumber: u.phoneNumber, displayName: u.displayName || displayName || null },
        isNew: false,
      };
    }
  }

  // 2. Create a new user
  const createRes = await fetch(`${base}/accounts`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      phoneNumber: formattedPhone,
      ...(displayName ? { displayName } : {}),
    }),
  });

  const created: any = await createRes.json();

  if (!createRes.ok || created.error) {
    throw new Error(
      `Firebase Admin: Failed to create user: ${JSON.stringify(created.error || created)}`
    );
  }

  return {
    user: { uid: created.localId, phoneNumber: formattedPhone, displayName: displayName || null },
    isNew: true,
  };
}
