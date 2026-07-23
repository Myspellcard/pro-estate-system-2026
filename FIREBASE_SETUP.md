# Firebase deployment

This project is configured for Firebase project `rzbank-61a64`.

## Enabled services
- Firebase Authentication: Email/Password and Google
- Cloud Firestore
- Firebase Storage
- Firebase Hosting

## Owner
The protected owner email is `myspellcard@gmail.com`.

## Deploy
```bash
npm install
npm run build
npx firebase-tools deploy
```

Registration is invite-only for non-owner accounts. Add invitations from `/admin/users`.
The invite action creates the invitation inside Firestore; automatic email delivery requires a separate Cloud Function/email provider.
