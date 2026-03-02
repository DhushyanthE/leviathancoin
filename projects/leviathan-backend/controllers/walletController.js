const express = require('express');
const router = express.Router();
const algosdk = require('algosdk');

/**
 * Generate a new wallet (account)
 * GET /api/wallet/generate
 */
router.get('/generate', (req, res) => {
  try {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

    res.json({
      success: true,
      address: account.addr,
      mnemonic: mnemonic,
      message: 'Keep your mnemonic safe! This is the only way to recover your account.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get account balance
 * GET /api/wallet/balance/:address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const algodClient = req.app.get('algodClient');

    // Get account info
    const accountInfo = await algodClient.accountInformation(address).do();

    // Get ALGO balance
    const algoBalance = accountInfo.amount;

    // Get ASA holdings (tokens)
    const assets = accountInfo.assets || [];

    res.json({
      success: true,
      address: address,
      algoBalance: algoBalance,
      assets: assets,
      formattedBalance: (algoBalance / 1e6).toFixed(6) + ' ALGO'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Verify mnemonic phrase
 * POST /api/wallet/verify
 */
router.post('/verify', (req, res) => {
  try {
    const { mnemonic } = req.body;

    if (!mnemonic) {
      return res.status(400).json({ success: false, error: 'Mnemonic is required' });
    }

    const account = algosdk.mnemonicToSecretKey(mnemonic);

    res.json({
      success: true,
      address: account.addr,
      verified: true
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid mnemonic phrase' });
  }
});

/**
 * Get account transactions
 * GET /api/wallet/transactions/:address
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 20 } = req.query;
    const indexerClient = req.app.get('indexerClient') || createIndexerClient();

    const transactions = await indexerClient
      .lookupAccountTransactions(address)
      .limit(parseInt(limit))
      .do();

    res.json({
      success: true,
      transactions: transactions.transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function createIndexerClient() {
  const token = {
    'X-Algo-API-Token': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  };

  if (process.env.NETWORK === 'testnet') {
    return new algosdk.Indexer(token, 'https://testnet-indexer.algorand.network', '');
  } else if (process.env.NETWORK === 'mainnet') {
    return new algosdk.Indexer(token, 'https://mainnet-indexer.algorand.network', '');
  } else {
    return new algosdk.Indexer(token, 'http://localhost', 4001);
  }
}

module.exports = router;
