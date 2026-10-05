/**
 * Firebase Admin SDK — loaded via dynamic import to avoid the
 * "require() of ES Module" crash in Vercel / Next.js edge bundler.
 * All functions in this file are async.
 */

let _adminApp: any = null;

async function initializeFirebaseAdmin(): Promise<any> {
  // Dynamic import avoids the static-bundle ES-module crash on Vercel
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'outflank-store';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
    }

    if (clientEmail && privateKey) {
      // Vercel sometimes escapes newlines or wraps the key in quotes
      privateKey = privateKey.replace(/^"|"$/g, '');
      privateKey = privateKey.replace(/\\n/g, '\n');

      return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }

    // Fallback: project-only (no auth operations will work without credentials)
    return initializeApp({ projectId });
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization error:', err?.message || err);
    return null;
  }
}

async function getAdminAuthInstance(): Promise<any> {
  if (!_adminApp) {
    _adminApp = await initializeFirebaseAdmin();
  }
  if (!_adminApp) {
    throw new Error(
      'Firebase Admin could not be initialized. Please check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel env vars.'
    );
  }
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(_adminApp);
}

/**
 * Creates a Firebase Custom Auth Token for a WhatsApp-verified phone number.
 */
export async function createCustomFirebaseToken(
  uid: string,
  claims: Record<string, any> = {}
): Promise<string> {
  const auth = await getAdminAuthInstance();
  return auth.createCustomToken(uid, claims);
}

/**
 * Retrieves existing Firebase user by phone number, or creates a new one.
 */
export async function getOrCreateUserByPhone(
  formattedPhone: string,
  displayName?: string
): Promise<{ user: any; isNew: boolean }> {
  const auth = await getAdminAuthInstance();

  try {
    const existing = await auth.getUserByPhoneNumber(formattedPhone);
    if (displayName && (!existing.displayName || existing.displayName !== displayName)) {
      try {
        await auth.updateUser(existing.uid, { displayName });
      } catch {}
    }
    return { user: existing, isNew: false };
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({
        phoneNumber: formattedPhone,
        displayName: displayName || undefined,
      });
      return { user: newUser, isNew: true };
    }
    throw err;
  }
}
