const {
  validateMessageContent,
  validateOfferAmount,
  createConversationId,
  canUserSendMessage,
  validateOfferStatusChange
} = require('../test_services/messagesServices');

describe('Messages Validation Logic', () => {
  describe('validateMessageContent', () => {
    it('should accept non-empty, trimmed content', () => {
      expect(() => validateMessageContent('Hello!')).not.toThrow();
    });

    it('should reject empty or whitespace-only content', () => {
      expect(() => validateMessageContent('   ')).toThrow('Message content is required');
    });
  });

  describe('validateOfferAmount', () => {
    it('should accept a positive offer amount', () => {
      expect(() => validateOfferAmount(100)).not.toThrow();
    });

    it('should reject zero or negative offer amounts', () => {
      expect(() => validateOfferAmount(0)).toThrow('Offer amount must be positive');
      expect(() => validateOfferAmount(-5)).toThrow('Offer amount must be positive');
    });
  });

  describe('createConversationId', () => {
    it('should create a sorted conversation ID from two user IDs', () => {
      expect(createConversationId('b', 'a')).toBe('a_b');
      expect(createConversationId('user1', 'user2')).toBe('user1_user2');
    });
  });

  describe('canUserSendMessage', () => {
    it('should allow sending if user is not blocked', () => {
      const blocked = new Set(['blockedUser']);
      expect(canUserSendMessage('userA', blocked)).toBe(true);
    });

    it('should reject sending if user is blocked', () => {
      const blocked = new Set(['userB']);
      expect(canUserSendMessage('userB', blocked)).toBe(false);
    });
  });

  describe('validateOfferStatusChange', () => {
    it('should allow status change if offer is pending', () => {
      expect(() => validateOfferStatusChange('pending')).not.toThrow();
    });

    it('should reject status change if offer is not pending', () => {
      expect(() => validateOfferStatusChange('accepted')).toThrow('Offer is not pending');
      expect(() => validateOfferStatusChange('rejected')).toThrow('Offer is not pending');
    });
  });
});