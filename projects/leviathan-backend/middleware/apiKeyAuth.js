/**
 * apiKeyAuth.js — The Gatekeeper Middleware
 * Intercepts every incoming request, verifies the API key, checks scopes,
 * enforces per-key rate limiting, and attaches the caller's identity.
 */

const { hashKey } = require('../utils/hash');

// Lazy-loaded to avoid circular dependency (apiKeyService also imports this file's hashKey)
function getStore() {
  return require('../services/apiKeyService').apiKeyStore;
}

// ─── Middleware Factory ──────────────────────────────────────────────────────

/**
 * Returns an Express middleware that:
 * 1. Extracts the raw API key from headers (x-api-key or Authorization: Bearer)
 * 2. Hashes it and looks it up in the store
 * 3. Validates: active flag, expiry, required scope
 * 4. Rate-limits: sliding 1-minute window per key
 * 5. Attaches req.apiKey = { userId, scopes, keyId } on success
 *
 * @param {string|null} requiredScope  e.g. 'dao:read', 'mining:write', or null for any valid key
 */
function apiKeyAuth(requiredScope = null) {
  return (req, res, next) => {
    // ── 1. EXTRACT ───────────────────────────────────────────────────────────
    const rawKey =
      req.headers['x-api-key'] ||
      (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing API key.',
        hint: 'Pass your key via the x-api-key header or Authorization: Bearer <key>',
      });
    }

    // ── 2. HASH & LOOKUP ─────────────────────────────────────────────────────
    const keyHash = hashKey(rawKey);
    const record = getStore().findByHash(keyHash);

    if (!record) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid API key.',
      });
    }

    // ── 3. VALIDATE ──────────────────────────────────────────────────────────
    if (!record.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: This API key has been revoked.',
      });
    }

    if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: This API key has expired.',
        expiredAt: record.expiresAt,
      });
    }

    // ── 4. SCOPE CHECK ───────────────────────────────────────────────────────
    if (requiredScope) {
      const hasWildcard = record.scopes.includes('*');
      const hasRequiredScope = record.scopes.includes(requiredScope);
      if (!hasWildcard && !hasRequiredScope) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Key missing required scope '${requiredScope}'.`,
          yourScopes: record.scopes,
        });
      }
    }

    // ── 5. RATE LIMIT (sliding window) ───────────────────────────────────────
    const now = Date.now();
    const windowMs = 60 * 1000;                           // 1 minute window
    const maxRequests = record.rateLimit || 100;          // requests per window

    // Trim entries older than the window
    record.requestLog = (record.requestLog || []).filter(
      (timestamp) => now - timestamp < windowMs
    );
    record.requestLog.push(now);

    if (record.requestLog.length > maxRequests) {
      const oldestInWindow = record.requestLog[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      res.set('Retry-After', Math.ceil(retryAfterMs / 1000));
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        error: `Too Many Requests: Limit is ${maxRequests} requests/minute.`,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      });
    }

    // ── 6. UPDATE USAGE STATS ────────────────────────────────────────────────
    record.lastUsedAt = new Date().toISOString();
    record.totalRequests = (record.totalRequests || 0) + 1;

    // Set informational rate-limit headers
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - record.requestLog.length);

    // ── 7. ATTACH IDENTITY & PROCEED ─────────────────────────────────────────
    req.apiKey = {
      keyId: record.id,
      userId: record.userId,
      scopes: record.scopes,
      rateLimit: maxRequests,
      remaining: maxRequests - record.requestLog.length,
    };

    next();
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────
// hashKey is re-exported so callers that used to import it from here still work.
module.exports = { apiKeyAuth, hashKey };
