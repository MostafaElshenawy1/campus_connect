function validateMessageContent(content) {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
}

function validateOfferAmount(amount) {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Offer amount must be positive');
  }
}

function createConversationId(userA, userB) {
  // Sort user IDs to ensure consistent conversation ID
  const [id1, id2] = [userA, userB].sort();
  return `${id1}_${id2}`;
}

function canUserSendMessage(userId, blockedSet) {
  return !blockedSet.has(userId);
}

function validateOfferStatusChange(status) {
  if (status !== 'pending') {
    throw new Error('Offer is not pending');
  }
}

module.exports = {
  validateMessageContent,
  validateOfferAmount,
  createConversationId,
  canUserSendMessage,
  validateOfferStatusChange,
};