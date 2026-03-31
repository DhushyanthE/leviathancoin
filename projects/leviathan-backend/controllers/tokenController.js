const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');

const sendError = (res, status, message) => res.status(status).json({ success: false, error: message });

const getAlgodClient = req => {
  const algodClient = req.app.get('algodClient');
  if (!algodClient) {
    throw new Error('Algod client is not configured');
  }
  return algodClient;
};

const getAccountFromMnemonic = mnemonic => {
  if (typeof mnemonic !== 'string' || mnemonic.trim().length === 0) {
    throw new Error('Mnemonic is required');
  }

  try {
    return algosdk.mnemonicToSecretKey(mnemonic.trim());
  } catch (error) {
    throw new Error('Invalid mnemonic phrase');
  }
};

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

const parseNonNegativeInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
};

const buildAssetResponse = assetInfo => {
  const asset = assetInfo.asset ?? {};
  const params = asset.params ?? {};

  return {
    id: asset.index ?? asset.id ?? params.index ?? null,
    name: params.name ?? '',
    unitName: params['unit-name'] ?? '',
    total: params.total ?? 0,
    decimals: params.decimals ?? 0,
    creator: params.creator ?? '',
    manager: params.manager ?? '',
    reserve: params.reserve ?? '',
    freeze: params.freeze ?? '',
    clawback: params.clawback ?? '',
    url: params.url ?? '',
    metadataHash: params['metadata-hash'] ?? '',
  };
};

const submitSignedTransaction = async (algodClient, signedTxn) => {
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  return txId;
};

/**
 * Get token info (ASA)
 * GET /api/token/info/:assetId
 */
router.get('/info/:assetId', async (req, res) => {
  try {
    const assetId = parsePositiveInteger(req.params.assetId, 'assetId');
    const algodClient = getAlgodClient(req);
    const assetInfo = await algodClient.getAssetByID(assetId).do();

    res.json({
      success: true,
      asset: buildAssetResponse(assetInfo),
    });
  } catch (error) {
    const status = error.message.includes('Invalid') ? 400 : 500;
    sendError(res, status, error.message);
  }
});

/**
 * Create a new ASA (Algorand Standard Asset)
 * POST /api/token/create
 */
router.post('/create', async (req, res) => {
  try {
    const {
      mnemonic,
      name,
      unitName,
      total,
      decimals = 6,
      url = '',
      manager,
      reserve,
      freeze,
      clawback,
    } = req.body;

    if (!mnemonic || !name || !unitName || total === undefined) {
      return sendError(res, 400, 'Missing required fields: mnemonic, name, unitName, total');
    }

    const algodClient = getAlgodClient(req);
    const account = getAccountFromMnemonic(mnemonic);
    const sender = account.addr;
    const assetTotal = parsePositiveInteger(total, 'total');
    const assetDecimals = parseNonNegativeInteger(decimals, 'decimals');

    const params = await algodClient.getTransactionParams().do();

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
      sender,
      undefined,
      assetTotal,
      assetDecimals,
      false,
      manager || sender,
      reserve || manager || sender,
      freeze || manager || sender,
      clawback || manager || sender,
      unitName,
      name,
      url,
      '',
      params
    );

    const signedTxn = txn.signTxn(account.sk);
    const txId = await submitSignedTransaction(algodClient, signedTxn);

    const ptx = await algodClient.pendingTransactionInformation(txId).do();
    const assetId = ptx['asset-index'];

    res.json({
      success: true,
      txId,
      assetId,
      message: 'Token created successfully!'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('TOKEN_CREATED', { assetId, name, unitName });
    }
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('Missing') ? 400 : 500;
    sendError(res, status, error.message);
  }
});

/**
 * Transfer tokens (ASA)
 * POST /api/token/transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { mnemonic, assetId, to, amount } = req.body;

    if (!mnemonic || !assetId || !to || amount === undefined) {
      return sendError(res, 400, 'Missing required fields: mnemonic, assetId, to, amount');
    }

    if (!algosdk.isValidAddress(to)) {
      return sendError(res, 400, 'Invalid recipient address');
    }

    const algodClient = getAlgodClient(req);
    const account = getAccountFromMnemonic(mnemonic);
    const sender = account.addr;
    const parsedAssetId = parsePositiveInteger(assetId, 'assetId');
    const parsedAmount = parseNonNegativeInteger(amount, 'amount');

    const params = await algodClient.getTransactionParams().do();
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      sender,
      to,
      undefined,
      undefined,
      parsedAmount,
      parsedAssetId,
      params
    );

    const signedTxn = txn.signTxn(account.sk);
    const txId = await submitSignedTransaction(algodClient, signedTxn);

    res.json({

      success: true,
      txId,
      message: 'Transfer completed successfully!'
    });
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('Missing') ? 400 : 500;
    sendError(res, status, error.message);
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
      return sendError(res, 400, 'Missing required fields: mnemonic, assetId');
    }

    const algodClient = getAlgodClient(req);
    const account = getAccountFromMnemonic(mnemonic);
    const sender = account.addr;
    const parsedAssetId = parsePositiveInteger(assetId, 'assetId');

    const params = await algodClient.getTransactionParams().do();
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
      sender,
      sender,
      undefined,
      undefined,
      0,
      parsedAssetId,
      params
    );

    const signedTxn = txn.signTxn(account.sk);
    const txId = await submitSignedTransaction(algodClient, signedTxn);

    res.json({
      success: true,
      txId,
      message: 'Opt-in completed successfully!'
    });
  } catch (error) {
    const status = error.message.includes('Invalid') || error.message.includes('Missing') ? 400 : 500;
    sendError(res, status, error.message);
  }
});

module.exports = router;
