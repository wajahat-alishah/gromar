// client/src/App.tsx

import React, { useState, useEffect } from 'react';
import { initializeApp, FirebaseApp } from 'firebase/app'; // Import FirebaseApp type
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, connectAuthEmulator, User } from 'firebase/auth'; // Import User type
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'; // Import Firestore type
import { getFunctions, httpsCallable, Functions, connectFunctionsEmulator, HttpsCallableResult } from 'firebase/functions'; // Import Functions and HttpsCallableResult types

// IMPORTANT: Replace these with your actual Firebase project configuration values!
// You can find these in your Firebase Console -> Project settings -> General
// under "Your apps" section, click on "Web" and copy the config snippet.
const firebaseConfig = {
  apiKey: "AIzaSyAhCsuqVvNf3Gckf48VAnsGGYJJ5iD_EAk",
  authDomain: "growmar.firebaseapp.com",
  projectId: "growmar",
  storageBucket: "growmar.firebasestorage.app",
  messagingSenderId: "613199918343",
  appId: "1:613199918343:web:b8edb851742ced597481a2",
  measurementId: "G-WMZ83GCYBS"
};

// Initialize Firebase services
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Initialized Firestore instance
const functions: Functions = getFunctions(app); // Initialized Functions instance

// Explicitly connect to Firebase Emulators if running on localhost
// Use the higher ports you configured in firebase.json (12000 for Auth, 12001 for Firestore, 12002 for Functions)
if (window.location.hostname === "localhost") {
    console.log("Connecting to Firebase Emulators...");
    connectAuthEmulator(auth, "http://localhost:12000"); // Auth emulator port
    connectFirestoreEmulator(db, "localhost", 12001); // Firestore emulator port
    connectFunctionsEmulator(functions, "localhost", 12002); // Functions emulator port
}

// Get a callable Cloud Function reference for generating websites
const generateWebsiteJson = httpsCallable<
  { websiteDescription: string; userId: string }, // Request data type
  { url?: string; projectId?: string; pageId?: string; error?: string } // Response data type
>(functions, 'callable_generateWebsiteJson');

function App() {
  const [user, setUser] = useState<User | null>(null); // Stores the authenticated user
  const [websiteDescription, setWebsiteDescription] = useState<string>(''); // Textarea input for description
  const [loading, setLoading] = useState<boolean>(false); // Loading state for the button
  const [error, setError] = useState<string | null>(null); // Error message display
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null); // URL of the generated website

  // Effect to handle user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
        console.log("Logged in as:", currentUser.uid);
      } else {
        // No user signed in, sign in anonymously
        console.log("Attempting anonymous sign-in...");
        signInAnonymously(auth)
          .then((credential) => {
            setUser(credential.user);
            console.log("Signed in anonymously as:", credential.user.uid);
          })
          .catch((err: any) => { // Use 'any' for unknown error types from catch
            console.error("Anonymous sign-in failed:", err);
            setError("Failed to sign in anonymously. Please try again.");
          });
      }
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  // Handles the click event for the "Generate Website" button
  const handleGenerateClick = async () => {
    if (!user || !websiteDescription.trim()) {
      setError("Please provide a website description and ensure you are logged in.");
      return;
    }

    setLoading(true); // Set loading state to true
    setError(null);    // Clear previous errors
    setWebsiteUrl(null); // Clear previous URL

    try {
      // Call the Cloud Function with the description and user's UID
      const result: HttpsCallableResult<
        { url?: string; projectId?: string; pageId?: string; error?: string }
      > = await generateWebsiteJson({
        websiteDescription: websiteDescription,
        userId: user.uid, // Pass the authenticated user's UID to the backend
      });

      // The plan states callable_generateWebsiteJson will trigger deployWebsite
      // and return projectId and pageId, and deployWebsite returns the full URL.
      // So, result.data should contain the necessary info.
      // Let's assume for now it returns a 'url' directly or 'projectId' and 'pageId'.
      if (result.data) {
        if (result.data.url) {
          setWebsiteUrl(result.data.url);
        } else if (result.data.projectId && result.data.pageId) {
          // Construct the anticipated URL based on the deployWebsite function's expected output
          // Example: https://YOUR_PROJECT_ID.web.app/sites/{userId}/{projectId}/{pageId}/index.html
          const constructedUrl = `https://${firebaseConfig.projectId}.web.app/sites/${user.uid}/${result.data.projectId}/${result.data.pageId}/index.html`;
          setWebsiteUrl(constructedUrl);
        } else if (result.data.error) {
          setError(`Function Error: ${result.data.error}`);
        } else {
          setError("Function returned unexpected data. Could not get website URL.");
        }
      } else {
        setError("Function did not return any data.");
      }


    } catch (err: any) { // Use 'any' for unknown error types from catch
      console.error("Error calling Cloud Function:", err);
      // Display a user-friendly error message
      setError(`Failed to generate website: ${err.message || "An unknown error occurred."}`);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">PageHub.ai Generator</h1>

        {/* Display user ID or signing-in message */}
        {user ? (
          <p className="text-sm text-gray-600 mb-4 text-center">
            Logged in as: <span className="font-mono text-blue-700 break-all select-all">{user.uid}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-4 text-center">Signing in anonymously...</p>
        )}

        {/* Textarea for website description */}
        <textarea
          className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          rows={5} // `rows` expects a number in TSX/React
          placeholder="Describe the website you want to generate (e.g., 'A simple portfolio website for a graphic designer showing off their best work with a clean, minimalist design, dark theme, and a contact form.')."
          value={websiteDescription}
          onChange={(e) => setWebsiteDescription(e.target.value)}
          disabled={loading || !user} // Disable if loading or user not yet authenticated
        ></textarea>

        {/* Generate Website button */}
        <button
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGenerateClick}
          disabled={loading || !user || !websiteDescription.trim()} // Disable if loading, no user, or description is empty
        >
          {loading ? 'Generating...' : 'Generate Website'}
        </button>

        {/* Error message display */}
        {error && (
          <p className="text-red-600 text-center mt-4 text-sm">{error}</p>
        )}

        {/* Generated website URL display */}
        {websiteUrl && (
          <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-md text-center">
            <p className="font-semibold text-green-800 mb-2">Website Generated!</p>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {websiteUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
