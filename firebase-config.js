/**
 * Developer: Meher Salim
 * File: firebase-config.js
 * Description:
 * FIREBASE CONFIGURATION
 * ======================
 * 
 * IMPORTANT: Replace this with YOUR Firebase project configuration!
 * 
 * HOW TO SET UP FIREBASE:
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Add project" and name it "Disney Pin Collector"
 * 3. After project creation, click the "</>" icon to add a web app
 * 4. Register your app (name it "Disney Pin Vault")
 * 5. Copy the firebaseConfig object below
 * 6. Replace the placeholder values with your actual config
 * 
 * ENABLED SERVICES NEEDED:
 * - Authentication (Email/Password + Google)
 * - Firestore Database
 * - Storage
 */

// Your Firebase configuration object from Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",              // e.g., "AIzaSyD1234567890"
    authDomain: "YOUR_AUTH_DOMAIN",           // e.g., "disney-pins.firebaseapp.com"
    projectId: "YOUR_PROJECT_ID",             // e.g., "disney-pins"
    storageBucket: "YOUR_STORAGE_BUCKET",     // e.g., "disney-pins.appspot.com"
    messagingSenderId: "YOUR_SENDER_ID",      // e.g., "1234567890"
    appId: "YOUR_APP_ID"                      // e.g., "1:1234567890:web:abc123def456"
};

// ============================================
// INITIALIZE FIREBASE
// ============================================

// Initialize Firebase app
firebase.initializeApp(firebaseConfig);

// Initialize services for easy access
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ============================================
// OFFLINE PERSISTENCE
// ============================================
// Enable offline data persistence so the app works without internet
// Data will sync automatically when connection is restored

db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('⚠️ Multiple tabs open, persistence limited to one tab');
        } else if (err.code === 'unimplemented') {
            console.warn('⚠️ Browser doesn\'t support offline persistence');
        }
    });

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the current authenticated user
 * @returns {firebase.User|null} Current user or null
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!auth.currentUser;
}

/**
 * Get Firestore timestamp for server time
 * @returns {firebase.firestore.FieldValue}
 */
function getServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

console.log('🔥 Firebase initialized successfully!');
console.log('   - Auth: Ready');
console.log('   - Firestore: Ready');
console.log('   - Storage: Ready');
