const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Cloud Function that handles updating a listing when an offer is accepted.
 * This runs with admin privileges to bypass client-side security rules.
 */
exports.handleOfferAccepted = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onUpdate(async (change, context) => {
    // Extract the conversation ID and message ID from the context
    const { conversationId, messageId } = context.params;

    // Get the message data before and after the update
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // If this isn't an offer, or if the status didn't change to 'accepted', exit early
    if (!afterData.isOffer ||
        afterData.status !== 'accepted' ||
        beforeData.status === 'accepted') {
      console.log('Not a newly accepted offer, exiting early');
      return null;
    }

    // Log that we've detected a newly accepted offer
    console.log(`Detected accepted offer for message ${messageId} in conversation ${conversationId}`);

    try {
      // Check if there's a listing associated with this offer
      if (!afterData.listingId) {
        console.log('No listing ID associated with this offer');
        return null;
      }

      // Get the listing reference
      const listingRef = admin.firestore().collection('listings').doc(afterData.listingId);
      const listingDoc = await listingRef.get();

      // Check if the listing exists
      if (!listingDoc.exists) {
        console.log(`Listing ${afterData.listingId} does not exist`);
        return null;
      }

      const listingData = listingDoc.data();

      // Determine who is accepting the offer (buyer or seller)
      const buyerId = afterData.senderId === listingData.userId ? afterData.receiverId : afterData.senderId;

      // Prepare update data
      const updateData = {
        sold: true,
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
        soldTo: buyerId
      };

      // Update the price if offer amount is valid
      const offerPrice = Number(afterData.offerAmount);
      if (!isNaN(offerPrice) && offerPrice > 0) {
        updateData.price = offerPrice;
      }

      // Log what we're about to update
      console.log(`Updating listing ${afterData.listingId} with:`, updateData);

      // Update the listing
      await listingRef.update(updateData);
      console.log(`Successfully updated listing ${afterData.listingId} as sold`);

      return { success: true };
    } catch (error) {
      console.error('Error updating listing for accepted offer:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Optional: Function to notify users when their offers are accepted
 * You can extend this in the future to send push notifications, emails, etc.
 */
exports.notifyOfferAccepted = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only proceed if this is an offer being accepted
    if (!afterData.isOffer ||
        afterData.status !== 'accepted' ||
        beforeData.status === 'accepted') {
      return null;
    }

    // Here you would implement notification logic (push notifications, in-app messages, etc.)
    console.log(`Offer accepted notification would be sent to ${afterData.senderId}`);

    return null;
  });
