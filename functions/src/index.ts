// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import axios from "axios";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore and Storage instances
const db = admin.firestore();
// We'll manage Storage rules manually for now, but the Admin SDK for Storage is still useful.
const storage = admin.storage(); 

// Initialize Secret Manager client
const client = new SecretManagerServiceClient();

// Project ID from Firebase Environment Configuration
// This is automatically set for Cloud Functions deployed via Firebase CLI.
// We'll use this for constructing resource paths, e.g., for Secret Manager.
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;

if (!projectId) {
  // This should ideally not happen in a deployed Cloud Function
  console.error("Firebase Project ID not found in environment variables.");
}

/**
 * Helper function to retrieve secret values from Google Cloud Secret Manager.
 * @param secretName The name of the secret (e.g., 'IMAGEN_API_KEY').
 * @returns The secret value as a string.
 */
async function getSecret(secretName: string): Promise<string> {
  // Construct the full secret path using the project ID.
  // The service account email `growmar@appspot.gserviceaccount.com` should have
  // Secret Manager Secret Accessor permissions on these secrets.
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  // Access the secret version.
  const [version] = await client.accessSecretVersion({ name });

  // Extract the payload as a string.
  const payload = version.payload?.data?.toString();

  if (!payload) {
    throw new Error(`Secret '${secretName}' not found or empty.`);
  }

  return payload;
}

// --- Future Cloud Functions will be added below this line ---

// Regarding __app_id for Firestore paths:
// For Callable Functions, the `admin.firestore()` instance already operates within the context
// of your 'growmar' project. You would typically access collections directly, e.g.:
// `db.collection('users').doc(userId).collection('generatedPages')`.
// If your plan involves a specific top-level collection structure like `artifacts/{appId}/...`,
// you would integrate `projectId` or a specific app identifier into the path string where needed.
// For now, `db` is globally available for Firestore operations.

// Example of how to structure a callable function (will be implemented later)
/*
export const callable_exampleFunction = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  const userId = context.auth.uid;
  // ... rest of the function logic
});
*/
