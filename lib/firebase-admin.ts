/**
 * Firebase Admin operations implemented via pure REST API calls.
 * This completely replaces the firebase-admin Node.js SDK, which crashes on
 * Vercel due to an ES-module bundling issue with its dependency `jose`.
 *
 * Uses the Firebase Auth REST API + a self-signed Google OAuth2 service-account
 * JWT (no external SDKs — only Node.js built-ins: crypto, fetch).
 */

import crypto from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFirebaseConfig() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'outflank-store';
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').replace(/^"|"$/g, '');
  let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '');
  privateKey = privateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey };
}

/**
 * Build a self-signed JWT for Google OAuth2 service-account auth.
 * Used to obtain a short-lived access token.
 */
function buildServiceAccountJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.auth https://www.googleapis.com/auth/identitytoolkit',
    })
  ).toString('base64url');

  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}

/** Obtain a short-lived Google OAuth2 access token for the service account. */
async function getAccessToken(): Promise<string> {
  const { clientEmail, privateKey } = getFirebaseConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase Admin: FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY not set in environment.');
  }

  const jwt = buildServiceAccountJwt(clientEmail, privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firebase Admin: Failed to get access token: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Creates a Firebase Custom Auth Token for a WhatsApp-verified phone number.
 * Uses the Firebase Auth REST API — no firebase-admin SDK required.
 */
export async function createCustomFirebaseToken(
  uid: string,
  claims: Record<string, any> = {}
): Promise<string> {
  const { clientEmail, privateKey } = getFirebaseConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase Admin: credentials not configured.');
  }

  // Firebase custom tokens are self-signed JWTs minted by the service account
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

  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(privateKey, 'base64url');

  return `${unsigned}.${signature}`;
}

/**
 * Retrieves an existing Firebase user by phone number, or creates a new one.
 * Uses the Firebase Auth REST API v1 (Admin scope).
 */
export async function getOrCreateUserByPhone(
  formattedPhone: string,
  displayName?: string
): Promise<{ user: any; isNew: boolean }> {
  const { projectId } = getFirebaseConfig();
  const accessToken = await getAccessToken();
  const baseUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}`;

  // 1. Try to look up existing user by phone
  const lookupRes = await fetch(`${baseUrl}/accounts:lookup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber: [formattedPhone] }),
  });

  if (lookupRes.ok) {
    const lookupData = await lookupRes.json();
    if (lookupData.users && lookupData.users.length > 0) {
      const existing = lookupData.users[0];
      // Update displayName if needed
      if (displayName && (!existing.displayName || existing.displayName !== displayName)) {
        try {
          await fetch(`${baseUrl}/accounts:update`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ localId: existing.localId, displayName }),
          });
        } catch {}
      }
      return { user: { uid: existing.localId, phoneNumber: existing.phoneNumber, displayName: existing.displayName }, isNew: false };
    }
  }

  // 2. Create a new user
  const createRes = await fetch(`${baseUrl}/accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: formattedPhone,
      displayName: displayName || undefined,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Firebase Admin: Failed to create user: ${errText}`);
  }

  const created = await createRes.json();
  return {
    user: { uid: created.localId, phoneNumber: formattedPhone, displayName: displayName || null },
    isNew: true,
  };
}
