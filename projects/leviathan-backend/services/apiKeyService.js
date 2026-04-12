/**
 * apiKeyService.js — Key Generation & In-Memory Store
 *
 * Architecture note:
 *   The `apiKeyStore` object is intentionally a thin interface so you can
 *   swap the in-memory Map for MongoDB / Redis with zero changes to callers.
 *   Every operation goes through this object — never touch _store directly
 *   outside this file.
 */

const crypto = require('crypto');
const { hashKey } = require('../utils/hash');

// ─── In-Memory Data Store ────────────────────────────────────────────────────
// Replace each method body with a DB call when you're ready to persist.

const _store = new Map(); // keyHash → keyRecord

const apiKeyStore = {
  /** Find a key record by its SHA-256 hash (the safe identifier). */
  findByHash(hash) {
    return _store.get(hash) || null;
  },

  /** Find a key record by its unique UUID (for admin operations). */
  findById(id) {
    for (const record of _store.values()) {
      if (record.id === id) return record;
    }
    return null;
  },

  /** Persist a key record — called once at key creation time. */
  save(record) {
    _store.set(record.keyHash, record);
    return record;
  },

  /** Return all key metadata for a given userId (no hashes exposed). */
  getByUserId(userId) {
    return [..._store.values()]
      .filter((r) => r.userId === userId)
      .map(sanitize);
  },

  /** Return every key in the store (admin only route). */
  getAll() {
    return [..._store.values()].map(sanitize);
  },

  /**
   * Soft-revoke a key by its UUID.
   * @returns {boolean} true if found and revoked, false if key not found
   */
  revoke(keyId) {
    const record = this.findById(keyId);
    if (!record) return false;
    record.isActive = false;
    record.revokedAt = new Date().toISOString();
    return true;
  },

  /**
   * Restore a previously revoked key.
   * @returns {boolean} true if found and reactivated
   */
  activate(keyId) {
    const record = this.findById(keyId);
    if (!record) return false;
    record.isActive = true;
    record.revokedAt = null;
    return true;
  },

  /** Total number of keys in the store. */
  count() {
    return _store.size;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip internal fields before any public API response. */
function sanitize(record) {
  const { keyHash, requestLog, ...safe } = record;
  return safe;
}

// ─── Available Scopes ────────────────────────────────────────────────────────

const SCOPES = {
  WILDCARD: '*',           // Full access (admin/master keys only)

  // DAO governance
  DAO_READ: 'dao:read',
  DAO_WRITE: 'dao:write',

  // Staking
  STAKING_READ: 'staking:read',
  STAKING_WRITE: 'staking:write',

  // Mining
  MINING_READ: 'mining:read',
  MINING_WRITE: 'mining:write',

  // Token operations
  TOKEN_READ: 'token:read',
  TOKEN_WRITE: 'token:write',

  // NFT
  NFT_READ: 'nft:read',
  NFT_WRITE: 'nft:write',

  // BFT consensus
  BFT_READ: 'bft:read',

  // Infrastructure
  INFRA_READ: 'infra:read',

  // Wallet (read-only for safety)
  WALLET_READ: 'wallet:read',
};

const ALL_SCOPES = Object.values(SCOPES);

// ─── Core: Key Generation ────────────────────────────────────────────────────

/**
 * Generate a new cryptographically secure API key.
 *
 * @param {object}   opts
 * @param {string}   opts.userId         Owner identifier (wallet address or user ID)
 * @param {string}   opts.label          Human-readable label e.g. "CI Pipeline Key"
 * @param {string[]} opts.scopes         Permissions array — defaults to full wildcard
 * @param {number}   opts.rateLimit      Max requests/minute — defaults to 100
 * @param {number|null} opts.expiresInDays  Days until expiry — null = never expires
 *
 * @returns {{ rawKey: string, record: object }}
 *   rawKey → the plain-text key to show the user ONCE and never store
 *   record → sanitized metadata safe to return in API responses
 */
function generateApiKey({
  userId,
  label = 'Unnamed Key',
  scopes = [SCOPES.WILDCARD],
  rateLimit = 100,
  expiresInDays = null,
} = {}) {
  if (!userId) throw new Error('userId is required to generate an API key');

  // Validate requested scopes
  const invalidScopes = scopes.filter((s) => !ALL_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    throw new Error(
      `Invalid scope(s): [${invalidScopes.join(', ')}]. ` +
        `Valid scopes: [${ALL_SCOPES.join(', ')}]`
    );
  }

  // Build the raw key — prefix makes it immediately identifiable in logs/configs
  const rawKey = `lv_live_${crypto.randomBytes(28).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const truncated = `${rawKey.substring(0, 10)}...${rawKey.slice(-6)}`;

  const record = {
    id: crypto.randomUUID(),
    userId,
    label,
    keyHash,          // stored — never the raw key
    truncated,        // shown in dashboard for identification
    scopes,
    rateLimit,
    isActive: true,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : null,
    revokedAt: null,
    lastUsedAt: null,
    totalRequests: 0,
    requestLog: [],   // sliding window buffer — NOT exposed in API responses
  };

  apiKeyStore.save(record);

  return {
    rawKey,              // show to user ONCE — never retrievable again
    record: sanitize(record),
  };
}

// ─── Bootstrap: Seed a Master Key on First Start ─────────────────────────────

/**
 * Called once at server startup.
 * If the store is empty, creates a master wildcard key and prints it to stdout.
 * The MASTER_API_KEY env var prevents regeneration across restarts.
 */
function bootstrapMasterKey() {
  const existingHash = process.env.MASTER_API_KEY_HASH;
  if (existingHash) {
    // Restore the master key record from env on restart
    const record = {
      id: 'master-0',
      userId: 'system',
      label: 'Master Key (bootstrapped)',
      keyHash: existingHash,
      truncated: process.env.MASTER_API_KEY_TRUNCATED || 'lv_live_...',
      scopes: [SCOPES.WILDCARD],
      rateLimit: 1000,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      totalRequests: 0,
      requestLog: [],
    };
    apiKeyStore.save(record);
    console.log('🔑 Master API key restored from environment.');
    return;
  }

  // First-ever boot — generate and print master key
  const { rawKey, record } = generateApiKey({
    userId: 'system',
    label: 'Master Key (auto-generated at first boot)',
    scopes: [SCOPES.WILDCARD],
    rateLimit: 1000,
  });

  // Re-derive the hash for display — record is already sanitized (keyHash stripped)
  const masterHash = hashKey(rawKey);
  const hashPreview = `${masterHash.substring(0, 32)}...`;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🔑  MASTER API KEY — SAVE THIS NOW!               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Key : ${rawKey}`);
  console.log(`║  ID  : ${record.id}`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Add these to your .env to persist this key across restarts:║');
  console.log(`║  MASTER_API_KEY_HASH=${hashPreview}`);
  console.log(`║  MASTER_API_KEY_TRUNCATED=${record.truncated}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  apiKeyStore,
  generateApiKey,
  bootstrapMasterKey,
  SCOPES,
  ALL_SCOPES,
  sanitize,
};
