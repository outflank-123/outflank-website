import { getAdminAuth } from './lib/firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const auth = getAdminAuth();
    console.log("Auth initialized successfully");
    const test = await auth.getUserByPhoneNumber('+918447334407').catch(e => {
        if(e.code === 'auth/user-not-found') return "not found";
        throw e;
    });
    console.log("User check:", test);
  } catch (e) {
    console.error("Firebase error:", e);
  }
}
run();
