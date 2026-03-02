const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');

/**
 * Mine tokens (interact with the Leviathan smart contract)
 * POST /api/mining/mine
 */
router.post('/mine', async (req, res) => {
  try {
    const { mnemonic, appId, contractAddress } = req.body;

    if (!mnemonic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: mnemonic'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();
    params.fee = algosdk.ALGORAND_MIN_TX_FEE;
    params.flatFee = true;

    // Prepare the mining call
    // This would call the smart contract's mine method
    const appArgs = [];
    appArgs.push(Buffer.from('mine')); // Method name

    // Create application call transaction
    const txn = algosdk.makeApplicationCallTxn(
      sender,
      Buffer.from(''), // note
      Buffer.from(''), // note
      Buffer.from(''), // closeTo
      Buffer.from(''), // closeRemainderTo
      parseInt(appId || 0),
      appArgs,
      [], // accounts
      [], // foreignApps
      [], // foreignAssets
      params
    );

    // Sign the transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get transaction result to see the mining reward
    const ptx = await algodClient.pendingTransactionInformation(txId).do();
    let miningReward = 0;

    if (ptx['global-state-delta']) {
      // Parse global state delta to get mining reward
      for (const delta of ptx['global-state-delta']) {
        if (delta.key === 'mined_amount') {
          miningReward = delta.value.uint;
        }
      }
    }

    res.json({
      success: true,
      txId: txId,
      miningReward: miningReward,
      message: 'Mining completed successfully!'
    });

    // Emit event to connected clients
    const io = req.app.get('io');
    io.emit('TOKEN_MINED', {
      address: sender,
      reward: miningReward,
      txId: txId
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get mining stats
 * GET /api/mining/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { appId } = req.query;
    const algodClient = req.app.get('algodClient');

    if (!appId) {
      // Return mock stats for demo purposes
      return res.json({
        success: true,
        stats: {
          totalMined: 0,
          miners: 0,
          difficulty: 1,
          rewardPerBlock: 1000000,
          lastBlockTime: Date.now()
        }
      });
    }

    // Get application state
    const appInfo = await algodClient.getApplicationByID(parseInt(appId)).do();

    const globalState = appInfo.params['global-state'];
    const stats = {};

    if (globalState) {
      for (const state of globalState) {
        const key = Buffer.from(state.key, 'base64').toString();
        if (state.value.type === 1) { // bytes
          stats[key] = Buffer.from(state.value.bytes, 'base64').toString();
        } else { // uint
          stats[key] = state.value.uint;
        }
      }
    }

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get mining leaderboard
 * GET /api/mining/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    // In a production environment, this would query an indexer or database
    // For demo purposes, return mock data
    res.json({
      success: true,
      leaderboard: [
        { rank: 1, address: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', totalMined: 1000000 },
        { rank: 2, address: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', totalMined: 800000 },
        { rank: 3, address: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', totalMined: 600000 }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get mining difficulty
 * GET /api/mining/difficulty
 */
router.get('/difficulty', async (req, res) => {
  try {
    res.json({
      success: true,
      difficulty: 1,
      target: '0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      maxNonce: 4294967295,
      lastAdjustment: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
