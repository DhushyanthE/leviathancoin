const express = require('express');
const router = express.Router();
const daoService = require('../services/daoService');
const stakingService = require('../services/stakingService');

/**
 * DAO Controller
 * Handles all governance and voting operations
 */

// Get DAO statistics
router.get('/stats', (req, res) => {
  try {
    const stats = daoService.getDAOStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all proposals
router.get('/proposals', (req, res) => {
  try {
    const { status, type, creator } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (creator) filters.creator = creator;

    const proposals = daoService.getProposals(filters);
    res.json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active proposals
router.get('/proposals/active', (req, res) => {
  try {
    const proposals = daoService.getActiveProposals();
    res.json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposal by ID
router.get('/proposals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const proposal = daoService.getProposal(id);

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.json({ success: true, proposal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposal results
router.get('/proposals/:id/results', (req, res) => {
  try {
    const { id } = req.params;
    const results = daoService.getProposalResults(id);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new proposal
router.post('/proposals', async (req, res) => {
  try {
    const { creator, title, description, type, payload } = req.body;

    if (!creator || !title || !description || !type) {
      return res.status(400).json({
        success: false,
        error: 'Creator, title, description, and type are required'
      });
    }

    const validTypes = ['parameter', 'upgrade', 'treasury', 'governance'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await daoService.createProposal(
      creator,
      title,
      description,
      type,
      payload || {},
      stakingService
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vote on a proposal
router.post('/vote', async (req, res) => {
  try {
    const { voter, proposalId, support } = req.body;

    if (!voter || !proposalId || support === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Voter, proposalId, and support are required'
      });
    }

    const result = await daoService.voteOnProposal(
      voter,
      proposalId,
      support,
      stakingService
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute a passed proposal
router.post('/proposals/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await daoService.executeProposal(id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel a proposal
router.post('/proposals/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { canceller } = req.body;

    if (!canceller) {
      return res.status(400).json({ success: false, error: 'Canceller address is required' });
    }

    const result = await daoService.cancelProposal(id, canceller);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get voter's vote on a proposal
router.get('/vote/:proposalId/:voter', (req, res) => {
  try {
    const { proposalId, voter } = req.params;
    const vote = daoService.getVote(proposalId, voter);

    res.json({ success: true, vote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delegate voting power
router.post('/delegate', (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'From and to addresses are required' });
    }

    const result = daoService.delegateVote(from, to);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  try {
    const stats = daoService.getDAOStats();
    const isHealthy = stats.totalProposals > 0;

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
