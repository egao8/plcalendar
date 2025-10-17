# Firebase Setup Instructions

Follow these steps to set up Firebase for your P&L Calendar application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "plcalendar")
4. Disable Google Analytics (optional, not needed for this app)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "P&L Calendar Web")
3. **Do NOT** check "Set up Firebase Hosting" (we'll use Netlify)
4. Click "Register app"

## Step 3: Get Your Firebase Config

After registering, you'll see your Firebase configuration. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 4: Update Your Project

1. Open `src/firebase.ts` in your project
2. Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // Replace with your apiKey
  authDomain: "YOUR_AUTH_DOMAIN",   // Replace with your authDomain
  projectId: "YOUR_PROJECT_ID",     // Replace with your projectId
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Set Up Firestore Database

1. In the Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Select **Start in production mode** (we'll update rules next)
4. Choose a location closest to you (e.g., us-central)
5. Click "Enable"

## Step 6: Configure Firestore Security Rules

Since this is a single-user app with password protection on the frontend, we'll allow read/write access to all documents:

1. In Firestore Database, go to the **Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

**Note:** This allows anyone with your Firebase config to read/write data. Since your app has password protection on the frontend and is for personal use only, this is acceptable. For a multi-user production app, you would implement proper Firebase Authentication and stricter rules.

## Step 7: Environment Variables (Optional but Recommended)

For better security, especially when deploying:

1. Create a `.env` file in your project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

2. Update `src/firebase.ts` to use environment variables:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

3. In Netlify, add these as environment variables:
   - Go to Site settings > Build & deploy > Environment
   - Add each variable with the prefix `VITE_`

## Step 8: Test Your Setup

1. Run `npm install` to install all dependencies
2. Run `npm run dev` to start the development server
3. Open http://localhost:5173 in your browser
4. Set a password (first-time setup)
5. Try adding a calendar entry
6. Check Firebase Console > Firestore Database to verify data is being saved

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've created a Firestore database (Step 5)

### Data not saving
- Check Firestore security rules (Step 6)
- Open browser console (F12) to see error messages
- Verify your Firebase config is correct

### Can't access after closing browser
- Check that Firestore rules allow reading
- Your password should persist in Firebase

## Data Structure

Your app stores data in two Firestore collections:

1. **dayEntries**: One document per trading day
   - Document ID: YYYY-MM-DD format
   - Contains: totalPL, trades, numberOfTrades, notes, tags

2. **settings**: Single document for user settings
   - Document ID: "user"
   - Contains: password, netWorth, startingBalance

You can view and manage this data directly in the Firebase Console.

