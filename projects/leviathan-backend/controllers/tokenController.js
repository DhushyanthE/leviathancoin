const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');
const { v4: uuidv4 } = require('uuid');

/**
 * Get token info (ASA)
 * GET /api/token/info/:assetId
 */
router.get('/info/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const algodClient = req.app.get('algodClient');

    const assetInfo = await algodClient.getAssetByID(parseInt(assetId)).do();

    res.json({
      success: true,
      asset: {
        id: assetInfo.asset.id,
        name: assetInfo.asset.params.name,
        unitName: assetInfo.asset.params['unit-name'],
        total: assetInfo.asset.params.total,
        decimals: assetInfo.asset.params.decimals,
        creator: assetInfo.asset.params.creator,
        manager: assetInfo.asset.params.manager,
        reserve: assetInfo.asset.params.reserve,
        freeze: assetInfo.asset.params.freeze,
        clawback: assetInfo.asset.params.clawback,
        url: assetInfo.asset.params.url
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create a new ASA (Algorand Standard Asset)
 * POST /api/token/create
 */
router.post('/create', async (req, res) => {
  try {
    const { mnemonic, name, unitName, total, decimals = 6, url = '', manager } = req.body;

    if (!mnemonic || !name || !unitName || !total) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mnemonic, name, unitName, total'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Create the asset creation transaction
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
      sender,
      Buffer.from(''), // note
      parseInt(total),
      parseInt(decimals),
      false, // default frozen
      manager || sender,
      manager || sender,
      manager || sender,
      manager || sender,
      unitName,
      name,
      url,
      'https://leviathancoin.com',
      params
    );

    // Sign the transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the asset ID from the transaction
    const ptx = await algodClient.pendingTransactionInformation(txId).do();
    const assetId = ptx['asset-index'];

    res.json({
      success: true,
      txId: txId,
      assetId: assetId,
      message: 'Token created successfully!'
    });

    // Emit event to connected clients
    const io = req.app.get('io');
    io.emit('TOKEN_CREATED', { assetId, name, unitName });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Transfer tokens (ASA)
 * POST /api/token/transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { mnemonic, assetId, to, amount } = req.body;

    if (!mnemonic || !assetId || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mnemonic, assetId, to, amount'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Create asset transfer transaction
    const txn = algosdk.makeAssetTransferTxn(
      sender,
      to,
      Buffer.from(''), // note
      Buffer.from(''), // closeTo
      parseInt(amount),
      undefined, //RevocationTarget
      parseInt(assetId),
      params
    );

    // Sign the transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    res.json({
      success: true,
      txId: txId,
      message: 'Transfer completed successfully!'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Opt-in to an ASA
 * POST /api/token/optin
 */
router.post('/optin', async (req, res) => {
  try {
    const { mnemonic, assetId } = req.body;

    if (!mnemonic || !assetId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mnemonic, assetId'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Create asset transfer transaction (0 amount for opt-in)
    const txn = algosdk.makeAssetTransferTxn(
      sender,
      sender,
      Buffer.from(''), // note
      Buffer.from(''), // closeTo
      0,
      undefined, //RevocationTarget
      parseInt(assetId),
      params
    );

    // Sign the transaction
    const signedTxn = txn.signTxn(account.sk);

    // Submit the transaction
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    res.json({
      success: true,
      txId: txId,
      message: 'Opt-in completed successfully!'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
