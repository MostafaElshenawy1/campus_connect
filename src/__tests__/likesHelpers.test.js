// tests/likes_utility.test.js

const {
  formatLikeCount,
  getLikeCount,
  getLikeDelta,
  getLikeLabel,
  applyLikeCallbacks,
} = require('../test_services/likesHelpers');

describe('Like Helpers (Pure)', () => {
  describe('formatLikeCount', () => {
    it('formats small numbers as-is', () => {
      expect(formatLikeCount(999)).toBe('999');
    });

    it('formats thousands with K', () => {
      expect(formatLikeCount(1200)).toBe('1.2K');
    });

    it('formats millions with M', () => {
      expect(formatLikeCount(2500000)).toBe('2.5M');
    });
  });

  describe('getLikeCount', () => {
    it('returns likes if present', () => {
      expect(getLikeCount({ likes: 42 })).toBe(42);
    });

    it('defaults to 0 if likes missing', () => {
      expect(getLikeCount({})).toBe(0);
    });
  });

  describe('getLikeDelta', () => {
    it('returns +1 if isLiked is false (user is liking)', () => {
      expect(getLikeDelta(false)).toBe(1);
    });

    it('returns -1 if isLiked is true (user is unliking)', () => {
      expect(getLikeDelta(true)).toBe(-1);
    });
  });

  describe('getLikeLabel', () => {
    it('returns proper singular label for 1', () => {
      expect(getLikeLabel(1)).toBe('1 like');
    });

    it('returns proper plural label for >1', () => {
      expect(getLikeLabel(3)).toBe('3 likes');
    });

    it('returns formatted label for large counts', () => {
      expect(getLikeLabel(1200)).toBe('1.2K likes');
    });
  });

  describe('applyLikeCallbacks', () => {
    it('calls onSuccess with correct delta if no error', () => {
      const onSuccess = jest.fn();
      applyLikeCallbacks(onSuccess, null, 1);
      expect(onSuccess).toHaveBeenCalledWith(1);
    });

    it('calls onError if error is provided', () => {
      const onError = jest.fn();
      const err = new Error('fail');
      applyLikeCallbacks(null, onError, 1, err);
      expect(onError).toHaveBeenCalledWith(err);
    });

    it('does nothing if callbacks are missing', () => {
      expect(() => applyLikeCallbacks(null, null, 1)).not.toThrow();
    });

    it('logs error if callback throws', () => {
      const badCallback = () => {
        throw new Error('oops');
      };
      console.error = jest.fn(); // mock console error
      applyLikeCallbacks(badCallback, null, 1);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
