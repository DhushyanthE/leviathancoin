require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const algosdk = require('algosdk');

// Import controllers
const tokenController = require('./controllers/tokenController');
const nftController = require('./controllers/nftController');
const miningController = require('./controllers/miningController');
const walletController = require('./controllers/walletController');
const bftController = require('./controllers/bftController');
const stakingController = require('./controllers/stakingController');
const daoController = require('./controllers/daoController');
const infrastructureController = require('./controllers/infrastructureController');

// Import BFT Consensus Service
const BFTConsensusService = require('./services/bftConsensus');
const { P2PService, DecentralizedOracleService, ZKProofService, Web3IntegrationService } = require('./services');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Algorand Client Configuration
const getAlgodClient = () => {
  const token = {
    'X-Algo-API-Token': process.env.ALGO_API_TOKEN || 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  };

  if (process.env.NETWORK === 'testnet') {
    return new algosdk.Algodv2(token, 'https://testnet-api.algorand.network', '');
  } else if (process.env.NETWORK === 'mainnet') {
    return new algosdk.Algodv2(token, 'https://mainnet-api.algorand.network', '');
  } else {
    // Localnet default
    return new algosdk.Algodv2(token, 'http://localhost', 4001);
  }
};

// Make algod client available to controllers
app.set('algodClient', getAlgodClient());

// Health check
app.get('/api/health', (req, res) => {
  const p2pService = req.app.get('p2pService');
  const oracleService = req.app.get('oracleService');
  const zkProofService = req.app.get('zkProofService');

  res.json({
    status: 'online',
    network: process.env.NETWORK || 'localnet',
    timestamp: new Date().toISOString(),
    services: {
      p2p: !!p2pService,
      oracle: !!oracleService,
      zkProof: !!zkProofService,
      bft: !!req.app.get('bftService'),
    },
  });
});

// API Routes
app.use('/api/wallet', walletController);
app.use('/api/token', tokenController);
app.use('/api/nft', nftController);
app.use('/api/mining', miningController);
app.use('/api/bft', bftController);
app.use('/api/infrastructure', infrastructureController);

// Initialize BFT Consensus Service
const bftService = new BFTConsensusService(io);
app.set('bftService', bftService);
console.log('🔐 BFT Consensus Service initialized');

// Initialize decentralized backend services
const p2pService = new P2PService({ topicPrefix: '/kont' });
const oracleService = new DecentralizedOracleService({ topicPrefix: '/kont/price' });
const zkProofService = new ZKProofService({
  circuitsDir: path.join(__dirname, 'zk-circuits'),
  artifactsDir: path.join(__dirname, 'zk-artifacts'),
});
const web3IntegrationService = new Web3IntegrationService({
  baseDir: path.join(__dirname, 'web3-integration'),
});
zkProofService.ensureDirectories();

app.set('p2pService', p2pService);
app.set('oracleService', oracleService);
app.set('zkProofService', zkProofService);
app.set('web3IntegrationService', web3IntegrationService);

console.log('🌐 Decentralized backend services initialized');

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (data) => {
    console.log('Client subscribed to:', data);
    socket.join(data.channel);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to controllers
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🌊 Leviathan Backend Server running on port ${PORT}`);
  console.log(`📡 Network: ${process.env.NETWORK || 'localnet'}`);
});

module.exports = { app, server, io };
