import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, UserRecord } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'outflank-store';
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
      // Fix escaped newlines in private key
      privateKey = privateKey.replace(/\\n/g, '\n');
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    }

    // Default initialization or project-only initialization if credentials not yet set
    return initializeApp({
      projectId,
    });
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization error:', err?.message || err);
    return null;
  }
}

export function getAdminAuth(): Auth {
  if (!adminApp) {
    adminApp = initializeFirebaseAdmin();
  }
  if (!adminApp) {
    throw new Error('Firebase Admin could not be initialized. Please check your FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env');
  }
  return getAuth(adminApp);
}

/**
 * Creates a Firebase Custom Auth Token for a WhatsApp-verified phone number.
 */
export async function createCustomFirebaseToken(
  uid: string,
  claims: Record<string, any> = {}
): Promise<string> {
  const auth = getAdminAuth();
  return auth.createCustomToken(uid, claims);
}

/**
 * Retrieves existing Firebase user by phone number, or creates a new one.
 */
export async function getOrCreateUserByPhone(
  formattedPhone: string,
  displayName?: string
): Promise<{ user: UserRecord; isNew: boolean }> {
  const auth = getAdminAuth();

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
      // Create new user with phone number
      const newUser = await auth.createUser({
        phoneNumber: formattedPhone,
        displayName: displayName || undefined,
      });
      return { user: newUser, isNew: true };
    }
    throw err;
  }
}
