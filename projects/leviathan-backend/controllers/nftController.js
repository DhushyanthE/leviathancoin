const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');

/**
 * Create a new NFT (Algorand Standard Asset with total=1)
 * POST /api/nft/create
 */
router.post('/create', async (req, res) => {
  try {
    const { mnemonic, name, unitName = 'LEVI', url, metadataHash = '' } = req.body;

    if (!mnemonic || !name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mnemonic, name, url'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // NFT - total = 1, decimals = 0
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
      sender,
      Buffer.from(''), // note
      1, // total supply = 1 (NFT)
      0, // decimals = 0 (non-divisible)
      false, // default frozen
      sender, // manager
      sender, // reserve
      sender, // freeze
      sender, // clawback
      unitName,
      name,
      url,
      metadataHash,
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
      message: 'NFT created successfully!'
    });

    // Emit event to connected clients
    const io = req.app.get('io');
    io.emit('NFT_CREATED', { assetId, name });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Transfer NFT
 * POST /api/nft/transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { mnemonic, assetId, to } = req.body;

    if (!mnemonic || !assetId || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mnemonic, assetId, to'
      });
    }

    const algodClient = req.app.get('algodClient');
    const account = algosdk.mnemonicToSecretKey(mnemonic);
    const sender = account.addr;

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do();

    // Create asset transfer transaction (1 NFT)
    const txn = algosdk.makeAssetTransferTxn(
      sender,
      to,
      Buffer.from(''), // note
      Buffer.from(''), // closeTo
      1, // amount = 1 (NFT)
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
      message: 'NFT transferred successfully!'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get NFT info
 * GET /api/nft/info/:assetId
 */
router.get('/info/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const algodClient = req.app.get('algodClient');

    const assetInfo = await algodClient.getAssetByID(parseInt(assetId)).do();

    const isNFT = assetInfo.asset.params.total === 1 && assetInfo.asset.params.decimals === 0;

    res.json({
      success: true,
      nft: {
        id: assetInfo.asset.id,
        name: assetInfo.asset.params.name,
        unitName: assetInfo.asset.params['unit-name'],
        url: assetInfo.asset.params.url,
        creator: assetInfo.asset.params.creator,
        isNFT: isNFT,
        total: assetInfo.asset.params.total,
        decimals: assetInfo.asset.params.decimals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get NFTs owned by an address
 * GET /api/nft/owned/:address
 */
router.get('/owned/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const algodClient = req.app.get('algodClient');

    const accountInfo = await algodClient.accountInformation(address).do();
    const assets = accountInfo.assets || [];

    // Filter for NFTs (assets with amount = 1)
    const nfts = [];
    for (const asset of assets) {
      if (BigInt(asset.amount) === 1n) {
        try {
          const assetInfo = await algodClient.getAssetByID(asset['asset-id']).do();
          nfts.push({
            assetId: asset['asset-id'],
            amount: asset.amount,
            name: assetInfo.asset.params.name,
            unitName: assetInfo.asset.params['unit-name'],
            url: assetInfo.asset.params.url
          });
        } catch (e) {
          // Asset might have been deleted
        }
      }
    }

    res.json({
      success: true,
      nfts: nfts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Opt-in to an NFT
 * POST /api/nft/optin
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
      undefined,
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
      message: 'NFT opt-in completed successfully!'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
