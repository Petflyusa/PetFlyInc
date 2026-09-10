function createTtlCache({ now = () => Date.now() } = {}) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttlMs) {
      entries.set(key, { value, expiresAt: now() + ttlMs });
      return value;
    },
    delete(key) { entries.delete(key); },
    clear() { entries.clear(); }
  };
}

module.exports = { createTtlCache };
