import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Note: Ensure FIREBASE_SERVICE_ACCOUNT is set in your .env file
// containing the JSON string of your service account key.
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountKey) {
    try {
        const payload = JSON.parse(serviceAccountKey);
        admin.initializeApp({
            credential: admin.credential.cert(payload)
        });
        console.log("Firebase Admin Initialized successfully.");
    } catch {
        console.warn(
            "⚠️  Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON. " +
            "Progress data will not be persisted. " +
            "Ensure the value is a valid JSON string (see backend/.env.example)."
        );
    }
} else {
    console.warn(
        "⚠️  FIREBASE_SERVICE_ACCOUNT is not set. " +
        "Progress data will not be persisted. " +
        "Set this variable in backend/.env to enable persistent progress tracking."
    );
}

// Fallback no-op mock used when Firebase is not configured.
// Returns empty/zero data so the app is functional but no fake scores are shown.
const mockDb = {
    collection: () => ({
        doc: () => ({
            get: async () => ({ exists: false, data: () => undefined }),
            set: async () => Promise.resolve(),
        }),
        add: async () => Promise.resolve({ id: 'mock-id' })
    })
};

export const db = admin.apps.length ? admin.firestore() : mockDb;
