# Dar Rent Nest Firebase

Dar Rent Nest is now wired to Firebase for the frontend and backend services.

## What Is Included

- React/Vite frontend
- Firebase Authentication
- Cloud Firestore entity storage
- Firebase Storage file uploads
- Firebase Hosting config
- Firestore and Storage rules

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Update the Firebase web app config in `src/api/firebaseClient.js` if you want to use a different Firebase project.

3. Start the app:

   ```bash
   npm run dev
   ```

## Firebase Deploy

1. Install and log in to Firebase CLI.
2. Update `.firebaserc` with your Firebase project id.
3. Build and deploy:

   ```bash
   npm run build
   firebase deploy
   ```

More details are in `FIREBASE_SETUP.md`.

## Google Login

For local testing, add `127.0.0.1` and `localhost` in Firebase Console:

Authentication -> Settings -> Authorized domains

For the deployed app, also make sure these domains are allowed:

- `pro-estate-system.web.app`
- `pro-estate-system.firebaseapp.com`
