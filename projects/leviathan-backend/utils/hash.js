/**
 * utils/hash.js — Shared cryptographic utilities
 *
 * Extracted here to break the circular dependency between:
 *   middleware/apiKeyAuth.js  (needs hashKey)
 *   services/apiKeyService.js (needs hashKey)
 *
 * Both files import from here instead of from each other.
 */

const crypto = require('crypto');

/**
 * Hash a raw API key using SHA-256.
 * This is the only identifier ever persisted — the raw key is never stored.
 *
 * @param {string} rawKey  The plain-text API key
 * @returns {string}       64-char hex digest
 */
function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

module.exports = { hashKey };
