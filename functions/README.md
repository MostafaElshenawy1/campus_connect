# Firebase Cloud Functions for Campus Connect

This directory contains Firebase Cloud Functions that handle backend operations that require admin privileges or need to run securely server-side.

## Functions

### handleOfferAccepted

This function automatically updates listing status when an offer is accepted in the messaging system. It responds to changes in message status and runs with admin privileges to bypass client-side security rules.

Key features:
- Triggers when a message's status changes to 'accepted'
- Verifies the message is an offer with a linked listing
- Updates the listing as sold
- Sets the correct buyer ID
- Updates the price to match the accepted offer

### notifyOfferAccepted

This function is designed to send notifications when offers are accepted. Currently, it only logs the event, but it can be extended to send push notifications, emails, or other alerts.

## Deployment

To deploy these functions:

1. Install the Firebase CLI globally if you haven't already:
   ```
   npm install -g firebase-tools
   ```

2. Log in to your Firebase account:
   ```
   firebase login
   ```

3. Navigate to the project root and deploy the functions:
   ```
   cd path/to/project
   firebase deploy --only functions
   ```

## Local Testing

To test functions locally:

```
cd functions
npm run serve
```

This will start the Firebase emulator suite, allowing you to test the functions without deploying them.
