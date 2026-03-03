# Byzantine Fault Tolerant (BFT) Consensus Implementation

## Overview

This implementation provides a Practical Byzantine Fault Tolerance (PBFT) consensus mechanism for the LeviathanCoin blockchain, incorporating quantum-resistant security features as outlined in the Quantum-Firewall framework.

## Features

### Core BFT Protocol
- **3-Phase Commit Protocol**: Pre-prepare, Prepare, and Commit phases
- **View Changes**: Automatic leader failover when the primary node fails
- **Checkpointing**: Stable state checkpoints for garbage collection
- **Byzantine Fault Tolerance**: Tolerates up to f = (n-1)/3 faulty nodes

### Quantum-Resistant Security
- **ML-KEM-1024 Simulation**: Post-quantum key encapsulation
- **SHA3-512**: Quantum-resistant hashing
- **Multi-signature Verification**: Enhanced security through multiple cryptographic primitives

### Validator Management
- **Stake-based Voting**: Validator influence based on stake amount
- **Reputation System**: Track validator reliability over time
- **Byzantine Detection**: Automatic detection and isolation of malicious nodes
- **Leader Election**: Automatic leader selection based on stake and reputation

## API Endpoints

### GET /api/bft/status
Get current BFT consensus status including:
- Current view number
- Node state (NORMAL, VIEW_CHANGE, RECOVERING)
- Sequence number
- Validator count and active validators
- Quorum size
- Leader information
- Quantum security keys

### GET /api/bft/validators
List all validators with their:
- Address and ID
- Stake amount
- Leader status
- Active status
- Reputation score
- Byzantine score

### POST /api/bft/validators
Register a new validator:
```
json
{
  "address": "VALIDATOR_ADDRESS",
  "publicKey": "BASE64_PUBLIC_KEY",
  "stake": 1000
}
```

### DELETE /api/bft/validators/:validatorId
Remove a validator from the network.

### POST /api/bft/submit
Submit a transaction for BFT consensus:
```
json
{
  "operation": "TRANSFER",
  "params": {
    "to": "RECIPIENT_ADDRESS",
    "amount": 100
  },
  "clientId": "client_identifier"
}
```

### GET /api/bft/transaction/:requestId
Get transaction status and consensus proof.

### GET /api/bft/stats
Get consensus statistics:
- Total requests
- Successful/failed requests
- View changes count
- Byzantine detections
- Average consensus time

### POST /api/bft/view-change
Manually initiate a view change (leader election).

### GET /api/bft/health
Check BFT service health status.

### PUT /api/bft/config
Update BFT configuration:
```
json
{
  "f": 1,
  "requestTimeout": 30000,
  "viewChangeTimeout": 20000,
  "maxRetries": 3,
  "checkpointInterval": 100
}
```

## WebSocket Events

### Client → Server
- `register_validator`: Register as a validator node
- `submit_request`: Submit a transaction for consensus
- `bft_message`: Send BFT protocol messages
- `initiate_view_change`: Trigger view change
- `heartbeat`: Send heartbeat to maintain active status
- `request_status`: Request BFT status

### Server → Client
- `registration_confirmed`: Validator registration confirmed
- `validator_list`: Updated validator list
- `request_acknowledged`: Transaction acknowledged
- `REPLY`: Consensus result
- `request_timeout`: Transaction timeout
- `bft_status`: Status update
- `bft_message`: Protocol messages (PRE_PREPARE, PREPARE, COMMIT, etc.)

## Consensus Protocol Flow

```
1. Client submits request
   ↓
2. If leader: Create PRE_PREPARE message
   If not leader: Forward to leader
   ↓
3. Validators receive PRE_PREPARE
   ↓
4. Validators create and broadcast PREPARE messages
   ↓
5. Wait for quorum (2f+1) PREPARE messages
   ↓
6. Validators broadcast COMMIT messages
   ↓
7. Wait for quorum (2f+1) COMMIT messages
   ↓
8. Execute request and send REPLY to client
   ↓
9. Client waits for f+1 matching replies
```

## Running the BFT Consensus

1. Start the backend server:
```
bash
cd projects/leviathan-backend
npm start
```

2. Access the BFT Dashboard in the frontend:
   - Open the LeviathanCoin web app
   - Click "BFT Consensus Dashboard" button

3. Register validators through the API or dashboard

4. Submit transactions for consensus

## Configuration

Default BFT Configuration:
- **f** (fault tolerance): 1 (can tolerate 1 Byzantine node)
- **Request Timeout**: 30000ms
- **View Change Timeout**: 20000ms
- **Max Retries**: 3
- **Checkpoint Interval**: 100

The quorum size is automatically calculated as: `3f + 1`

## Security Guarantees

1. **Safety**: No two correct nodes will commit different values for the same sequence number
2. **Liveness**: If the network is eventually synchronous and less than f+1 nodes are faulty, requests will eventually be processed
3. **Byzantine Resistance**: The system can tolerate up to f Byzantine nodes without compromising safety

## Integration with Algorand

The BFT consensus can be used alongside Algorand's native consensus:
- BFT for high-value transactions requiring stronger guarantees
- Algorand's consensus for lower-value, high-throughput transactions
- Hybrid approach for maximum flexibility
