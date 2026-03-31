const express = require('express');
const router = express.Router();

/**
 * Infrastructure Controller
 * Exposes endpoints for decentralized backend services, including P2P,
 * decentralized oracle, and zero-knowledge proof scaffolding.
 */

router.get('/status', (req, res) => {
  try {
    const p2pService = req.app.get('p2pService');
    const oracleService = req.app.get('oracleService');
    const zkProofService = req.app.get('zkProofService');
    const bftService = req.app.get('bftService');

    res.json({
      success: true,
      infrastructure: {
        p2p: Boolean(p2pService),
        oracle: Boolean(oracleService),
        zkProof: Boolean(zkProofService),
        bft: Boolean(bftService),
      },
      details: {
        p2p: p2pService ? {
          topicPrefix: p2pService.topicPrefix,
          relayNodes: p2pService.relayNodes,
          bootstrapPeers: p2pService.bootstrapPeers,
          connected: p2pService.connected,
        } : null,
        oracle: oracleService ? {
          topicPrefix: oracleService.topicPrefix,
          cacheTtl: oracleService.cacheTtl,
          oracleSources: oracleService.oracleSources,
        } : null,
        zkProof: zkProofService ? {
          circuitsDir: zkProofService.circuitsDir,
          artifactsDir: zkProofService.artifactsDir,
          protocol: zkProofService.protocol,
        } : null,
        bft: bftService ? {
          currentView: bftService.currentView,
          nodeState: bftService.nodeState,
          validatorsCount: bftService.validators.size,
        } : null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/p2p/topic/:name', async (req, res) => {
  try {
    const p2pService = req.app.get('p2pService');
    if (!p2pService) {
      return res.status(503).json({ success: false, error: 'P2P service unavailable' });
    }

    const { name } = req.params;
    const topic = p2pService.getTopic(name);

    res.json({ success: true, topic });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/p2p/subscribe', async (req, res) => {
  try {
    const p2pService = req.app.get('p2pService');
    if (!p2pService) {
      return res.status(503).json({ success: false, error: 'P2P service unavailable' });
    }

    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ success: false, error: 'topic is required' });
    }

    const subscribedTopic = await p2pService.subscribe(topic, (message) => {
      req.app.get('io').emit('P2P_MESSAGE', { topic, message });
    });

    res.json({ success: true, topic: subscribedTopic, message: 'Subscribed to P2P topic' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/oracle/:symbol', async (req, res) => {
  try {
    const oracleService = req.app.get('oracleService');
    if (!oracleService) {
      return res.status(503).json({ success: false, error: 'Oracle service unavailable' });
    }

    const { symbol } = req.params;
    const price = await oracleService.getPrice(symbol);

    if (price == null) {
      return res.status(404).json({ success: false, error: `Price unavailable for ${symbol}` });
    }

    res.json({ success: true, symbol, price });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/oracle/publish', async (req, res) => {
  try {
    const oracleService = req.app.get('oracleService');
    if (!oracleService) {
      return res.status(503).json({ success: false, error: 'Oracle service unavailable' });
    }

    const { symbol, price, metadata } = req.body;
    if (!symbol || typeof price !== 'number') {
      return res.status(400).json({ success: false, error: 'symbol and numeric price are required' });
    }

    const result = await oracleService.publishPriceUpdate(symbol, price, metadata || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/storage/upload', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { filePath, metadata } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' });
    }

    const result = await web3IntegrationService.uploadToWeb3Storage(filePath, metadata || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/storage/pinata', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { filePath, metadata } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' });
    }

    const result = await web3IntegrationService.pinToPinata(filePath, metadata || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/thirdweb/deploy', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { contractType, params } = req.body;
    if (!contractType) {
      return res.status(400).json({ success: false, error: 'contractType is required' });
    }

    const result = await web3IntegrationService.buildThirdwebContractTemplate(contractType, params || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/integration/chainlink/:pair', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { pair } = req.params;
    const result = await web3IntegrationService.fetchChainlinkPrice(pair);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/gnosis/safe', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { signers, threshold } = req.body;
    if (!Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({ success: false, error: 'signers array is required' });
    }

    const result = await web3IntegrationService.generateGnosisSafeConfig(signers, threshold);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/molecule/ipnft', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { metadata } = req.body;
    const result = await web3IntegrationService.createMoleculeIPNFT(metadata || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/integration/humantech/proof', async (req, res) => {
  try {
    const web3IntegrationService = req.app.get('web3IntegrationService');
    if (!web3IntegrationService) {
      return res.status(503).json({ success: false, error: 'Web3 integration service unavailable' });
    }

    const { identityData } = req.body;
    const result = await web3IntegrationService.registerHumanTechProof(identityData || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/zk/quantum-echo/proof', async (req, res) => {
  try {
    const zkProofService = req.app.get('zkProofService');
    if (!zkProofService) {
      return res.status(503).json({ success: false, error: 'ZK proof service unavailable' });
    }

    const inputs = req.body;
    const proofArtifacts = await zkProofService.generateQuantumEchoProof(inputs);

    res.json({ success: true, proofArtifacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/zk/ponw/proof', async (req, res) => {
  try {
    const zkProofService = req.app.get('zkProofService');
    if (!zkProofService) {
      return res.status(503).json({ success: false, error: 'ZK proof service unavailable' });
    }

    const { challenge, modelOutput } = req.body;
    if (!challenge || !modelOutput) {
      return res.status(400).json({ success: false, error: 'challenge and modelOutput are required' });
    }

    const proofArtifacts = await zkProofService.generatePoNWProof(challenge, modelOutput);
    res.json({ success: true, proofArtifacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
