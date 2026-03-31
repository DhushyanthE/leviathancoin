
# Leviathan Backend API

Node.js/Express backend for the Leviathan Blockchain Network.

## Features

- **Wallet Management**: Generate new wallets, check balances, verify mnemonics
- **Token Operations**: Create ASA (Algorand Standard Assets), transfer tokens, opt-in
- **NFT Operations**: Create NFTs (ARC-72), transfer NFTs, view owned NFTs
- **Mining**: Interact with the mining smart contract
- **Real-time Events**: WebSocket support for blockchain events
- **Decentralization Roadmap**: Architectural guidance for implementing libp2p, zk-proofs, and trustless real-time services in the backend

## Installation

```
bash
cd projects/leviathan-backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```
bash
cp .env.example .env
```

Edit `.env`:
- `NETWORK`: localnet, testnet, or mainnet
- `PORT`: Server port (default: 3001)
- `DEPLOYER_MNEMONIC`: Your wallet mnemonic for contract deployments

## Running the Server

```
bash
# Development
npm run dev

# Production
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Wallet
- `GET /api/wallet/generate` - Generate new wallet
- `GET /api/wallet/balance/:address` - Get account balance
- `POST /api/wallet/verify` - Verify mnemonic phrase
- `GET /api/wallet/transactions/:address` - Get account transactions

### Token (ASA)
- `POST /api/token/create` - Create new ASA
- `POST /api/token/transfer` - Transfer tokens
- `POST /api/token/optin` - Opt-in to ASA
- `GET /api/token/info/:assetId` - Get token info

### NFT
- `POST /api/nft/create` - Create NFT
- `POST /api/nft/transfer` - Transfer NFT
- `GET /api/nft/info/:assetId` - Get NFT info
- `GET /api/nft/owned/:address` - Get NFTs owned by address
- `POST /api/nft/optin` - Opt-in to NFT

### Mining
- `POST /api/mining/mine` - Mine tokens
- `GET /api/mining/stats` - Get mining statistics
- `GET /api/mining/leaderboard` - Get mining leaderboard
- `GET /api/mining/difficulty` - Get mining difficulty

### Infrastructure
- `GET /api/infrastructure/status` - Get status of P2P, oracle, ZK proof, and BFT services
- `GET /api/infrastructure/p2p/topic/:name` - Get a libp2p topic namespace for the given name
- `POST /api/infrastructure/p2p/subscribe` - Subscribe to a P2P topic and begin forwarding messages via WebSocket
- `GET /api/infrastructure/oracle/:symbol` - Fetch the current decentralized price for a symbol
- `POST /api/infrastructure/oracle/publish` - Publish a signed price update (oracle staging)
- `POST /api/infrastructure/zk/quantum-echo/proof` - Generate scaffold artifacts for a quantum echo ZK proof
- `POST /api/infrastructure/zk/ponw/proof` - Generate scaffold artifacts for a PoNW ZK proof
- `POST /api/infrastructure/integration/storage/upload` - Simulate uploading to web3.storage
- `POST /api/infrastructure/integration/storage/pinata` - Simulate pinning via Pinata
- `POST /api/infrastructure/integration/thirdweb/deploy` - Generate a thirdweb contract deployment template
- `GET /api/infrastructure/integration/chainlink/:pair` - Simulate reading a Chainlink price feed
- `POST /api/infrastructure/integration/gnosis/safe` - Generate a Gnosis Safe config template
- `POST /api/infrastructure/integration/molecule/ipnft` - Simulate minting an IP-NFT metadata payload
- `POST /api/infrastructure/integration/humantech/proof` - Simulate a human.tech proof of personhood

## Example Infrastructure Client

To run the example client against the backend:

```bash
cd projects/leviathan-backend
node examples/infrastructureClient.js status
```

Example commands:

```bash
node examples/infrastructureClient.js status
node examples/infrastructureClient.js oracle KONT
node examples/infrastructureClient.js topic metrics
node examples/infrastructureClient.js subscribe /kont/metrics/1.0.0
```

The `subscribe` command sends a subscription request to the backend. If a WebSocket client is connected to the server, it will receive forwarded P2P messages on the `P2P_MESSAGE` event.

## WebSocket Events

Connect to `http://localhost:3001` and listen for:

- `TOKEN_CREATED` - New token created
- `NFT_CREATED` - New NFT minted
- `TOKEN_MINED` - Tokens mined
- `SECURITY_ALERT` - Security events

## Example Usage

### Create a Token

```
bash
curl -X POST http://localhost:3001/api/token/create \
  -H "Content-Type: application/json" \
  -d '{
    "mnemonic": "your 25-word mnemonic",
    "name": "Leviathan Coin",
    "unitName": "LEVI",
    "total": 1000000,
    "decimals": 6
  }'
```

### Mint NFT

```
bash
curl -X POST http://localhost:3001/api/nft/create \
  -H "Content-Type: application/json" \
  -d '{
    "mnemonic": "your 25-word mnemonic",
    "name": "Leviathan NFT #1",
    "url": "https://leviathancoin.com/nft/1"
  }'
```

### Check Balance

```
bash
curl http://localhost:3001/api/wallet/balance/YOUR_ADDRESS
```

## Network Configuration

### LocalNet
```
env
NETWORK=localnet
RPC_URL=http://localhost:4001
```

### TestNet
```
env
NETWORK=testnet
RPC_URL=https://testnet-api.algorand.network
```

### MainNet
```
env
NETWORK=mainnet
RPC_URL=https://mainnet-api.algorand.network
```

## Security Notes

- Never commit your `.env` file or mnemonic phrases
- In production, use environment variables for sensitive data
- Implement proper authentication and rate limiting
- Use HTTPS in production

## Real-Time Decentralization

For the platform's next evolution toward decentralized real-time feeds, trustless verification, and distributed mining/security, see [REALTIME_DECENTRALIZATION.md](REALTIME_DECENTRALIZATION.md).

## Web3 Infrastructure Integration

To accelerate decentralization by using existing, battle-tested Web3 protocols, see [WEB3_INFRASTRUCTURE_INTEGRATION.md](WEB3_INFRASTRUCTURE_INTEGRATION.md).

## License

MIT
