/**
 * apiKeyController.js — REST API for Key Management
 *
 * Routes:
 *   POST   /api/keys/generate         Create a new key (master key required)
 *   GET    /api/keys/list/:userId      List keys for a user (sanitized)
 *   GET    /api/keys/scopes            List all available permission scopes
 *   PATCH  /api/keys/:keyId/revoke     Soft-revoke a key
 *   PATCH  /api/keys/:keyId/activate   Re-activate a revoked key
 *   GET    /api/keys/admin/all         List ALL keys (wildcard scope required)
 *   GET    /api/keys/validate          Test that your key is valid (any auth'd key)
 */

const express = require('express');
const router = express.Router();

const { generateApiKey, apiKeyStore, SCOPES, ALL_SCOPES } = require('../services/apiKeyService');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

// ─── POST /generate ──────────────────────────────────────────────────────────

/**
 * Create a new API key.
 * Protected: caller must already hold a key with wildcard ('*') scope.
 * On a fresh install, use the master key printed at server startup.
 */
router.post('/generate', apiKeyAuth(SCOPES.WILDCARD), (req, res) => {
  try {
    const { userId, label, scopes, rateLimit, expiresInDays } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required.' });
    }

    const { rawKey, record } = generateApiKey({
      userId,
      label,
      scopes,
      rateLimit,
      expiresInDays,
    });

    return res.status(201).json({
      success: true,
      message: '⚠️  Save this key immediately — it will NEVER be shown again.',
      apiKey: rawKey,
      keyInfo: record,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ─── GET /scopes ─────────────────────────────────────────────────────────────

/** List every defined permission scope. No auth required (public metadata). */
router.get('/scopes', (req, res) => {
  res.json({
    success: true,
    scopes: ALL_SCOPES,
    descriptions: {
      '*':              'Full access (master/admin keys only)',
      'dao:read':       'Read DAO proposals, votes, and stats',
      'dao:write':      'Create and execute DAO proposals',
      'staking:read':   'Read staking pools and validator info',
      'staking:write':  'Stake, unstake, and claim rewards',
      'mining:read':    'Read mining stats and history',
      'mining:write':   'Submit mining requests',
      'token:read':     'Read token balances and metadata',
      'token:write':    'Mint, transfer, and burn tokens',
      'nft:read':       'Read NFT collections',
      'nft:write':      'Mint and transfer NFTs',
      'bft:read':       'Read BFT consensus state',
      'infra:read':     'Read infrastructure and network metrics',
      'wallet:read':    'Read wallet balances and addresses',
    },
  });
});

// ─── GET /validate ───────────────────────────────────────────────────────────

/** Test your API key. Returns your key metadata — any valid key accepted. */
router.get('/validate', apiKeyAuth(), (req, res) => {
  res.json({
    success: true,
    message: 'API key is valid.',
    identity: req.apiKey,
  });
});

// ─── GET /list/:userId ───────────────────────────────────────────────────────

/**
 * List all keys for a userId.
 * Hashes are never returned — only truncated identifiers and metadata.
 */
router.get('/list/:userId', apiKeyAuth(), (req, res) => {
  try {
    const { userId } = req.params;

    // Non-admin keys can only see their own keys
    if (!req.apiKey.scopes.includes('*') && req.apiKey.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only list your own keys.',
      });
    }

    const keys = apiKeyStore.getByUserId(userId);
    res.json({ success: true, count: keys.length, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /admin/all ───────────────────────────────────────────────────────────

/** List ALL keys in the system. Requires wildcard ('*') scope. */
router.get('/admin/all', apiKeyAuth(SCOPES.WILDCARD), (req, res) => {
  try {
    const keys = apiKeyStore.getAll();
    res.json({ success: true, count: keys.length, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /:keyId/revoke ─────────────────────────────────────────────────────

/** Soft-revoke a key by its UUID. */
router.patch('/:keyId/revoke', apiKeyAuth(), (req, res) => {
  try {
    const { keyId } = req.params;

    // Non-admin can only revoke their own keys
    const target = apiKeyStore.findById(keyId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }
    if (!req.apiKey.scopes.includes('*') && target.userId !== req.apiKey.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only revoke your own keys.',
      });
    }

    apiKeyStore.revoke(keyId);
    res.json({ success: true, message: `Key ${keyId} has been revoked.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /:keyId/activate ───────────────────────────────────────────────────

/** Re-activate a previously revoked key. Requires wildcard scope. */
router.patch('/:keyId/activate', apiKeyAuth(SCOPES.WILDCARD), (req, res) => {
  try {
    const { keyId } = req.params;
    const reactivated = apiKeyStore.activate(keyId);
    if (!reactivated) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }
    res.json({ success: true, message: `Key ${keyId} has been reactivated.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
