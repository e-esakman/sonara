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
    } catch (e) {
        console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT variable as JSON.");
    }
} else {
    console.warn("No FIREBASE_SERVICE_ACCOUNT found in environment. Mocking Firestore for demo.");
}

// Fallback mock export if real DB fails or isn't configured
const mockDb = {
    collection: (name: string) => ({
        doc: (id: string) => ({
            get: async () => ({
                exists: true,
                data: () => ({ streak: 14, wordsPracticed: 1200, averageScore: 90 })
            }),
            set: async (data: any, options?: any) => Promise.resolve(),
        }),
        add: async (data: any) => Promise.resolve({ id: 'mock-id' })
    })
};

export const db = admin.apps.length ? admin.firestore() : mockDb;
