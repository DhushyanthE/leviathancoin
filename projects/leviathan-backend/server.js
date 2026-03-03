require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const algosdk = require('algosdk');

// Import controllers
const tokenController = require('./controllers/tokenController');
const nftController = require('./controllers/nftController');
const miningController = require('./controllers/miningController');
const walletController = require('./controllers/walletController');
const bftController = require('./controllers/bftController');

// Import BFT Consensus Service
const BFTConsensusService = require('./services/bftConsensus');

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
  res.json({
    status: 'online',
    network: process.env.NETWORK || 'localnet',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/wallet', walletController);
app.use('/api/token', tokenController);
app.use('/api/nft', nftController);
app.use('/api/mining', miningController);
app.use('/api/bft', bftController);

// Initialize BFT Consensus Service
const bftService = new BFTConsensusService(io);
app.set('bftService', bftService);
console.log('🔐 BFT Consensus Service initialized');

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
