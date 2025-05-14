// services/like_utility.js

function formatLikeCount(count) {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  }
  
  function getLikeCount(listing) {
    return listing.likes || 0;
  }
  
  function getLikeDelta(isLiked) {
    return isLiked ? -1 : 1;
  }
  
  function getLikeLabel(count) {
    const formatted = formatLikeCount(count);
    return `${formatted} like${count === 1 ? '' : 's'}`;
  }
  
  function applyLikeCallbacks(onSuccess, onError, delta, error = null) {
    try {
      if (error && onError) {
        onError(error);
      } else if (!error && onSuccess) {
        onSuccess(delta);
      }
    } catch (err) {
      console.error('Callback error:', err);
    }
  }
  
  module.exports = {
    formatLikeCount,
    getLikeCount,
    getLikeDelta,
    getLikeLabel,
    applyLikeCallbacks,
  };
  