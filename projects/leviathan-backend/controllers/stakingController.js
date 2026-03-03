const express = require('express');
const router = express.Router();
const stakingService = require('../services/stakingService');

/**
 * Staking API Controller
 * Handles all staking-related operations
 */

// Get staking statistics
router.get('/stats', (req, res) => {
  try {
    const stats = stakingService.getStakingStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's stake info
router.get('/info/:address', (req, res) => {
  try {
    const { address } = req.params;
    const stakeInfo = stakingService.getStakeInfo(address);
    res.json({ success: true, stakeInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stake tokens
router.post('/stake', async (req, res) => {
  try {
    const { address, amount } = req.body;

    if (!address || !amount) {
      return res.status(400).json({ success: false, error: 'Address and amount are required' });
    }

    const algosdk = require('algosdk');
    const algodClient = req.app.get('algodClient');

    const result = await stakingService.stakeTokens(address, parseInt(amount), algosdk, algodClient);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request unstaking
router.post('/unstake', async (req, res) => {
  try {
    const { address, amount } = req.body;

    if (!address || !amount) {
      return res.status(400).json({ success: false, error: 'Address and amount are required' });
    }

    const result = await stakingService.requestUnstake(address, parseInt(amount));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete unstaking
router.post('/unstake/complete', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }

    const result = await stakingService.completeUnstake(address);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claim rewards
router.post('/claim', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, error: 'Address is required' });
    }

    const result = await stakingService.claimRewards(address);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get validators
router.get('/validators', (req, res) => {
  try {
    const validators = stakingService.getValidators();
    res.json({ success: true, validators });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get staking leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { limit } = req.query;
    const leaderboard = stakingService.getStakingLeaderboard(parseInt(limit) || 10);
    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update APY (admin)
router.put('/config/apy', (req, res) => {
  try {
    const { apy } = req.body;

    if (apy === undefined) {
      return res.status(400).json({ success: false, error: 'APY is required' });
    }

    const result = stakingService.updateAPY(apy);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  try {
    const stats = stakingService.getStakingStats();
    const isHealthy = stats.totalStaked > 0;

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'initializing',
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
