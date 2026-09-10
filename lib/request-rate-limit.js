function createRateLimiter({ now = () => Date.now() } = {}) {
  const attempts = new Map();

  return {
    allow(key, limit, windowMs) {
      const cutoff = now() - windowMs;
      const recent = (attempts.get(key) || []).filter(timestamp => timestamp > cutoff);
      if (recent.length >= limit) {
        attempts.set(key, recent);
        return false;
      }
      recent.push(now());
      attempts.set(key, recent);
      return true;
    }
  };
}

module.exports = { createRateLimiter };
