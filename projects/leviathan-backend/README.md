# Leviathan Backend API

Node.js/Express backend for the Leviathan Blockchain Network.

## Features

- **Wallet Management**: Generate new wallets, check balances, verify mnemonics
- **Token Operations**: Create ASA (Algorand Standard Assets), transfer tokens, opt-in
- **NFT Operations**: Create NFTs (ARC-72), transfer NFTs, view owned NFTs
- **Mining**: Interact with the mining smart contract
- **Real-time Events**: WebSocket support for blockchain events

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

## License

MIT
