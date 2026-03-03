const express = require('express');
const router = express.Router();

/**
 * BFT Consensus API Controller
 * Provides REST endpoints for BFT consensus operations
 */

/**
 * Get BFT consensus status
 * GET /api/bft/status
 */
router.get('/status', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    res.json({
      success: true,
      status: {
        nodeId: bftService.nodeId,
        currentView: bftService.currentView,
        nodeState: bftService.nodeState,
        sequenceNumber: bftService.sequenceNumber,
        validatorsCount: bftService.validators.size,
        activeValidators: Array.from(bftService.validators.values()).filter(v => v.isActive).length,
        quorumSize: bftService.quorumSize,
        isLeader: bftService.isLeader(),
        leaderId: bftService.leaderId,
        stats: bftService.getStats(),
        quantumKeys: {
          publicKey: bftService.quantumResistantKeys.publicKey,
          algorithm: bftService.quantumResistantKeys.algorithm,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get validator list
 * GET /api/bft/validators
 */
router.get('/validators', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const validators = Array.from(bftService.validators.values()).map(v => ({
      id: v.id,
      address: v.address,
      stake: v.stake,
      isLeader: v.isLeader,
      isActive: v.isActive,
      reputation: v.reputation,
      byzantineScore: v.byzantineScore,
      lastHeartbeat: v.lastHeartbeat,
    }));

    res.json({
      success: true,
      validators,
      quorumSize: bftService.quorumSize,
      currentView: bftService.currentView,
      leaderId: bftService.leaderId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Register a new validator
 * POST /api/bft/validators
 */
router.post('/validators', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const { address, publicKey, stake } = req.body;

    if (!address || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'Address and publicKey are required'
      });
    }

    const validator = bftService.addValidator(address, publicKey, stake || 0);

    res.json({
      success: true,
      validator: {
        id: validator.id,
        address: validator.address,
        stake: validator.stake,
        isLeader: validator.isLeader,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Remove a validator
 * DELETE /api/bft/validators/:validatorId
 */
router.delete('/validators/:validatorId', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const { validatorId } = req.params;
    bftService.removeValidator(validatorId);

    res.json({
      success: true,
      message: 'Validator removed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Submit a transaction for BFT consensus
 * POST /api/bft/submit
 */
router.post('/submit', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const { operation, params, clientId } = req.body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'Operation is required'
      });
    }

    // Emit the request via socket to initiate consensus
    const io = req.app.get('io');
    const requestId = require('uuid').v4();

    io.emit('submit_request', {
      requestId,
      operation,
      params: params || {},
      clientId: clientId || req.body.clientId || 'api-client',
    });

    res.json({
      success: true,
      requestId,
      status: 'submitted',
      message: 'Transaction submitted for BFT consensus',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get transaction status
 * GET /api/bft/transaction/:requestId
 */
router.get('/transaction/:requestId', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const { requestId } = req.params;
    const request = bftService.pendingRequests.get(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction: {
        requestId: request.requestId,
        operation: request.operation,
        status: request.executed ? 'executed' : 'pending',
        view: request.view,
        sequenceNumber: request.sequenceNumber,
        retries: request.retries,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get BFT statistics
 * GET /api/bft/stats
 */
router.get('/stats', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    res.json({
      success: true,
      stats: bftService.getStats(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Initiate view change
 * POST /api/bft/view-change
 */
router.post('/view-change', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    bftService.initiateViewChange();

    res.json({
      success: true,
      message: 'View change initiated',
      newView: bftService.currentView,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update BFT configuration
 * PUT /api/bft/config
 */
router.put('/config', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        error: 'BFT Consensus Service not initialized'
      });
    }

    const { f, requestTimeout, viewChangeTimeout, maxRetries, checkpointInterval } = req.body;

    // Update configuration
    if (f !== undefined) bftService.BFT_CONFIG.f = f;
    if (requestTimeout !== undefined) bftService.BFT_CONFIG.REQUEST_TIMEOUT = requestTimeout;
    if (viewChangeTimeout !== undefined) bftService.BFT_CONFIG.VIEW_CHANGE_TIMEOUT = viewChangeTimeout;
    if (maxRetries !== undefined) bftService.BFT_CONFIG.MAX_RETRIES = maxRetries;
    if (checkpointInterval !== undefined) bftService.BFT_CONFIG.CHECKPOINT_INTERVAL = checkpointInterval;

    // Recalculate quorum size
    bftService.quorumSize = 3 * bftService.BFT_CONFIG.f + 1;

    res.json({
      success: true,
      message: 'BFT configuration updated',
      config: bftService.BFT_CONFIG,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check for BFT service
 * GET /api/bft/health
 */
router.get('/health', (req, res) => {
  try {
    const bftService = req.app.get('bftService');

    if (!bftService) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'BFT service not initialized'
      });
    }

    const activeValidators = Array.from(bftService.validators.values()).filter(v => v.isActive).length;
    const isHealthy = activeValidators >= bftService.quorumSize;

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      details: {
        activeValidators,
        requiredValidators: bftService.quorumSize,
        currentView: bftService.currentView,
        lastRequestTime: bftService.stats.lastBlock,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
