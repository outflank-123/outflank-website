import { getAdminAuth, createCustomFirebaseToken } from './lib/firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const auth = getAdminAuth();
    console.log("Auth initialized successfully");
    const uid = 'jrUmnfIJTCRO7o9EdLDREwRqroN2';
    const token = await createCustomFirebaseToken(uid, { phone: '+918447334407', provider: 'whatsapp' });
    console.log("Token:", token.substring(0, 20) + '...');
  } catch (e) {
    console.error("Firebase token error:", e);
  }
}
run();
