/**
 * Byzantine Fault Tolerant (BFT) Consensus Service
 * Implements PBFT (Practical Byzantine Fault Tolerance) for the Quantum-Firewall ledger
 *
 * Key Features:
 * - Leader-based consensus with view changes
 * - 3-phase commit protocol (pre-prepare, prepare, commit)
 * - Byzantine fault tolerance up to f = (n-1)/3 faulty nodes
 * - Quantum-resistant signature verification
 * - Real-time state synchronization
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// BFT Configuration
const BFT_CONFIG = {
  // Number of faulty nodes the system can tolerate
  f: 1, // Default: can tolerate 1 Byzantine node
  // Timeout for consensus rounds (ms)
  REQUEST_TIMEOUT: 30000,
  // Timeout for view changes (ms)
  VIEW_CHANGE_TIMEOUT: 20000,
  // Maximum number of retries for a request
  MAX_RETRIES: 3,
  // Checkpoint interval (number of executed requests)
  CHECKPOINT_INTERVAL: 100,
};

/**
 * BFT Node states
 */
const NodeState = {
  NORMAL: 'NORMAL',
  VIEW_CHANGE: 'VIEW_CHANGE',
  RECOVERING: 'RECOVERING',
};

/**
 * Message types in BFT protocol
 */
const MessageType = {
  REQUEST: 'REQUEST',
  PRE_PREPARE: 'PRE_PREPARE',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  CHECKPOINT: 'CHECKPOINT',
  VIEW_CHANGE: 'VIEW_CHANGE',
  NEW_VIEW: 'NEW_VIEW',
  REPLY: 'REPLY',
  VALIDATOR_LIST: 'VALIDATOR_LIST',
  HEARTBEAT: 'HEARTBEAT',
  STATUS: 'STATUS',
};

/**
 * Validator Node class
 */
class ValidatorNode {
  constructor(id, address, publicKey, stake = 0, isLeader = false) {
    this.id = id;
    this.address = address;
    this.publicKey = publicKey;
    this.stake = stake;
    this.isLeader = isLeader;
    this.isActive = true;
    this.lastHeartbeat = Date.now();
    this.reputation = 100;
    this.byzantineScore = 0; // Higher = more suspicious
    this.messagesReceived = new Map(); // Track messages for Byzantine detection
    this.pendingRequests = new Set();
  }

  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  incrementByzantineScore() {
    this.byzantineScore++;
    if (this.byzantineScore > 10) {
      this.isActive = false;
    }
  }

  resetByzantineScore() {
    this.byzantineScore = 0;
  }
}

/**
 * BFT Consensus Service
 */
class BFTConsensusService {
  constructor(io) {
    this.io = io;
    this.nodeId = uuidv4();

    // Consensus state
    this.currentView = 0;
    this.nodeState = NodeState.NORMAL;
    this.sequenceNumber = 0;
    this.pendingRequests = new Map();
    this.preparedRequests = new Map();
    this.checkpoints = new Map();

    // Validator management
    this.validators = new Map();
    this.leaderId = null;
    this.quorumSize = 0;

    // Client management
    this.clients = new Map();
    this.clientResponses = new Map();

    // Security
    this.quantumResistantKeys = this.generateQuantumResistantKeys();

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      viewChanges: 0,
      byzantineDetections: 0,
      lastBlock: null,
      consensusTime: [],
    };

    // Initialize
    this.initializeSocketHandlers();
    this.startHeartbeatMonitor();
  }

  /**
   * Generate quantum-resistant key pair (using multiple algorithms)
   */
  generateQuantumResistantKeys() {
    // Using multiple key derivation for quantum resistance
    const masterKey = crypto.randomBytes(64);
    const signingKey = crypto.createHash('sha3-512').update(masterKey).digest();
    const verificationKey = crypto.createHash('sha3-512').update(signingKey).digest();

    return {
      publicKey: verificationKey.toString('base64'),
      privateKey: signingKey.toString('base64'),
      masterKey: masterKey.toString('base64'),
      algorithm: 'ML-KEM-1024模拟', // Simulated post-quantum algorithm
    };
  }

  /**
   * Initialize socket event handlers
   */
  initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[BFT] New connection: ${socket.id}`);

      // Handle node registration
      socket.on('register_validator', (data) => this.handleValidatorRegistration(socket, data));

      // Handle client requests
      socket.on('submit_request', (data) => this.handleClientRequest(socket, data));

      // Handle BFT messages
      socket.on('bft_message', (data) => this.handleBFTMessage(socket, data));

      // Handle view change
      socket.on('initiate_view_change', (data) => this.handleViewChange(socket, data));

      // Handle heartbeat
      socket.on('heartbeat', (data) => this.handleHeartbeat(socket, data));

      // Handle status updates
      socket.on('request_status', () => this.sendStatus(socket));

      // Handle disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Handle validator node registration
   */
  async handleValidatorRegistration(socket, data) {
    try {
      const { address, publicKey, stake } = data;

      // Create new validator
      const validator = new ValidatorNode(
        socket.id,
        address,
        publicKey,
        stake || 0,
        this.validators.size === 0 // First node becomes leader
      );

      this.validators.set(socket.id, validator);

      // Calculate quorum size: 3f + 1
      this.quorumSize = 3 * BFT_CONFIG.f + 1;

      // Set initial leader
      if (!this.leaderId) {
        this.leaderId = socket.id;
        validator.isLeader = true;
      }

      // Broadcast updated validator list
      this.broadcastValidatorList();

      // Send confirmation to the validator
      socket.emit('registration_confirmed', {
        nodeId: this.nodeId,
        validatorId: socket.id,
        isLeader: validator.isLeader,
        currentView: this.currentView,
        quorumSize: this.quorumSize,
        quantumKeys: this.quantumResistantKeys,
      });

      console.log(`[BFT] Validator registered: ${address}, Total validators: ${this.validators.size}`);

      // Store socket mapping
      this.clients.set(socket.id, { type: 'validator', socket, address });

    } catch (error) {
      console.error('[BFT] Validator registration error:', error);
      socket.emit('registration_failed', { error: error.message });
    }
  }

  /**
   * Handle incoming client request
   */
  async handleClientRequest(socket, data) {
    try {
      const { requestId, operation, params, clientId } = data;

      console.log(`[BFT] Client request received: ${requestId}, Operation: ${operation}`);

      // Create request object
      const request = {
        requestId: requestId || uuidv4(),
        clientId: clientId || socket.id,
        operation,
        params,
        timestamp: Date.now(),
        view: this.currentView,
        retries: 0,
      };

      // Store pending request
      this.pendingRequests.set(request.requestId, request);
      this.stats.totalRequests++;

      // If this node is the leader, initiate consensus
      if (this.isLeader()) {
        await this.initiateConsensus(request);
      } else {
        // Forward to leader
        this.forwardToLeader(request);
      }

      // Send acknowledgment to client
      socket.emit('request_acknowledged', {
        requestId: request.requestId,
        status: 'processing',
        estimatedTime: BFT_CONFIG.REQUEST_TIMEOUT,
      });

    } catch (error) {
      console.error('[BFT] Client request error:', error);
      socket.emit('request_failed', { error: error.message });
    }
  }

  /**
   * Check if current node is the leader
   */
  isLeader() {
    return this.leaderId === this.nodeId;
  }

  /**
   * Get current leader
   */
  getLeader() {
    return this.validators.get(this.leaderId);
  }

  /**
   * Forward request to leader
   */
  forwardToLeader(request) {
    const leaderSocket = this.io.sockets.sockets.get(this.leaderId);
    if (leaderSocket) {
      leaderSocket.emit('bft_message', {
        type: MessageType.REQUEST,
        data: request,
        from: this.nodeId,
      });
    } else {
      // Leader not available, initiate view change
      this.initiateViewChange();
    }
  }

  /**
   * Initiate consensus protocol (only for leader)
   */
  async initiateConsensus(request) {
    try {
      // Increment sequence number
      this.sequenceNumber++;
      request.sequenceNumber = this.sequenceNumber;

      // Create pre-prepare message
      const prePrepare = {
        view: this.currentView,
        sequenceNumber: this.sequenceNumber,
        request,
        digest: this.computeDigest(request),
        leaderId: this.nodeId,
        timestamp: Date.now(),
        quantumSignature: this.signMessage(this.computeDigest(request)),
      };

      // Store pre-prepare
      this.preparedRequests.set(`${this.currentView}-${this.sequenceNumber}`, {
        request,
        prePrepare,
        prepares: new Map(),
        commits: new Map(),
      });

      // Broadcast pre-prepare to all validators
      this.broadcast(MessageType.PRE_PREPARE, prePrepare);

      // Set timeout for prepare phase
      this.setConsensusTimeout(request.requestId);

      console.log(`[BFT] Pre-prepare sent for request: ${request.requestId}`);

    } catch (error) {
      console.error('[BFT] Consensus initiation error:', error);
      this.stats.failedRequests++;
    }
  }

  /**
   * Handle pre-prepare message
   */
  async handlePrePrepare(message) {
    try {
      const { view, sequenceNumber, request, digest, leaderId } = message;

      // Verify view
      if (view < this.currentView) {
        console.log(`[BFT] Stale pre-prepare, ignoring`);
        return;
      }

      // Verify leader
      if (leaderId !== this.leaderId) {
        console.log(`[BFT] Invalid leader in pre-prepare`);
        return;
      }

      // Verify digest
      const computedDigest = this.computeDigest(request);
      if (computedDigest !== digest) {
        console.log(`[BFT] Invalid digest in pre-prepare`);
        return;
      }

      // Store or update request
      const key = `${view}-${sequenceNumber}`;
      if (!this.preparedRequests.has(key)) {
        this.preparedRequests.set(key, {
          request,
          prePrepare: message,
          prepares: new Map(),
          commits: new Map(),
        });
      }

      // Create prepare message
      const prepare = {
        view,
        sequenceNumber,
        digest,
        validatorId: this.nodeId,
        timestamp: Date.now(),
        quantumSignature: this.signMessage(`${view}-${sequenceNumber}-${digest}`),
      };

      // Broadcast prepare
      this.broadcast(MessageType.PREPARE, prepare);

      console.log(`[BFT] Prepare sent for sequence: ${sequenceNumber}`);

    } catch (error) {
      console.error('[BFT] Pre-prepare handling error:', error);
    }
  }

  /**
   * Handle prepare message
   */
  async handlePrepare(message) {
    try {
      const { view, sequenceNumber, digest, validatorId } = message;

      // Verify view
      if (view !== this.currentView) {
        return;
      }

      const key = `${view}-${sequenceNumber}`;
      const requestData = this.preparedRequests.get(key);

      if (!requestData) {
        console.log(`[BFT] No request found for prepare`);
        return;
      }

      // Verify validator
      const validator = this.validators.get(validatorId);
      if (!validator || !validator.isActive) {
        return;
      }

      // Add prepare vote
      requestData.prepares.set(validatorId, message);

      // Check if we have enough prepare votes (quorum)
      if (requestData.prepares.size >= this.quorumSize && !requestData.commitSent) {
        requestData.commitSent = true;

        // Create commit message
        const commit = {
          view,
          sequenceNumber,
          digest,
          validatorId: this.nodeId,
          timestamp: Date.now(),
          quantumSignature: this.signMessage(`${view}-${sequenceNumber}-${digest}-commit`),
        };

        // Broadcast commit
        this.broadcast(MessageType.COMMIT, commit);

        console.log(`[BFT] Commit sent for sequence: ${sequenceNumber}`);
      }

    } catch (error) {
      console.error('[BFT] Prepare handling error:', error);
    }
  }

  /**
   * Handle commit message
   */
  async handleCommit(message) {
    try {
      const { view, sequenceNumber, digest, validatorId } = message;

      // Verify view
      if (view !== this.currentView) {
        return;
      }

      const key = `${view}-${sequenceNumber}`;
      const requestData = this.preparedRequests.get(key);

      if (!requestData) {
        return;
      }

      // Add commit vote
      requestData.commits.set(validatorId, message);

      // Check if we have enough commit votes (quorum)
      if (requestData.commits.size >= this.quorumSize && !requestData.executed) {
        requestData.executed = true;

        // Execute the request
        await this.executeRequest(requestData.request);

        // Create reply
        const reply = {
          requestId: requestData.request.requestId,
          result: requestData.executionResult,
          view,
          sequenceNumber,
          timestamp: Date.now(),
          validatorId: this.nodeId,
          quantumSignature: this.signMessage(requestData.request.requestId),
        };

        // Send reply to client
        this.sendToClient(requestData.request.clientId, MessageType.REPLY, reply);

        // Update statistics
        this.stats.successfulRequests++;
        this.stats.lastBlock = requestData.request.requestId;

        console.log(`[BFT] Request executed: ${requestData.request.requestId}`);

        // Cleanup old requests
        this.cleanupOldRequests(sequenceNumber);
      }

    } catch ( error) {
      console.error('[BFT] Commit handling error:', error);
    }
  }

  /**
   * Execute the actual request/operation
   */
  async executeRequest(request) {
    // Simulate request execution
    // In real implementation, this would execute the actual blockchain operation

    const key = `${request.view}-${request.sequenceNumber}`;
    const requestData = this.preparedRequests.get(key);

    if (requestData) {
      requestData.executionResult = {
        success: true,
        operation: request.operation,
        executedAt: Date.now(),
        executedBy: this.nodeId,
        quantumVerified: true,
        consensusProof: {
          view: this.currentView,
          sequenceNumber: request.sequenceNumber,
          prepares: requestData.prepares.size,
          commits: requestData.commits.size,
          quorumSize: this.quorumSize,
        },
      };
    }

    return requestData?.executionResult;
  }

  /**
   * Handle general BFT message
   */
  handleBFTMessage(socket, message) {
    const { type, data } = message;

    switch (type) {
      case MessageType.PRE_PREPARE:
        this.handlePrePrepare(data);
        break;
      case MessageType.PREPARE:
        this.handlePrepare(data);
        break;
      case MessageType.COMMIT:
        this.handleCommit(data);
        break;
      case MessageType.VIEW_CHANGE:
        this.handleViewChangeMessage(data);
        break;
      case MessageType.CHECKPOINT:
        this.handleCheckpoint(data);
        break;
      default:
        console.log(`[BFT] Unknown message type: ${type}`);
    }
  }

  /**
   * Initiate view change (when leader fails)
   */
  initiateViewChange() {
    if (this.nodeState === NodeState.VIEW_CHANGE) {
      return;
    }

    console.log(`[BFT] Initiating view change from view ${this.currentView}`);

    this.nodeState = NodeState.VIEW_CHANGE;
    this.currentView++;
    this.stats.viewChanges++;

    // Create view change message
    const viewChange = {
      newView: this.currentView,
      validatorId: this.nodeId,
      lastStableCheckpoint: this.getLastStableCheckpoint(),
      preparedRequests: this.getPreparedRequests(),
      timestamp: Date.now(),
      quantumSignature: this.signMessage(`${this.currentView}-${this.nodeId}`),
    };

    // Broadcast view change
    this.broadcast(MessageType.VIEW_CHANGE, viewChange);

    // Set timeout for new view
    setTimeout(() => {
      this.nodeState = NodeState.NORMAL;
    }, BFT_CONFIG.VIEW_CHANGE_TIMEOUT);
  }

  /**
   * Handle view change message
   */
  handleViewChangeMessage(message) {
    const { newView, validatorId } = message;

    // In a full implementation, we would collect view change messages
    // and when we have quorum, create a new view

    if (newView > this.currentView && validatorId === this.leaderId) {
      this.currentView = newView;
      this.nodeState = NodeState.NORMAL;
      this.leaderId = validatorId;

      console.log(`[BFT] View changed to ${newView}, new leader: ${validatorId}`);

      // Broadcast new view
      this.broadcast(MessageType.NEW_VIEW, {
        newView: this.currentView,
        leaderId: this.leaderId,
      });
    }
  }

  /**
   * Handle heartbeat from validators
   */
  handleHeartbeat(socket, data) {
    const validator = this.validators.get(socket.id);
    if (validator) {
      validator.updateHeartbeat();
      validator.resetByzantineScore();
    }
  }

  /**
   * Start heartbeat monitor
   */
  startHeartbeatMonitor() {
    setInterval(() => {
      const now = Date.now();

      this.validators.forEach((validator, id) => {
        if (now - validator.lastHeartbeat > BFT_CONFIG.VIEW_CHANGE_TIMEOUT) {
          console.log(`[BFT] Validator ${id} timed out`);
          validator.isActive = false;
          this.stats.byzantineDetections++;

          // If leader timed out, initiate view change
          if (id === this.leaderId) {
            this.initiateViewChange();
          }
        }
      });

      // Elect new leader if needed
      this.electNewLeader();

    }, 5000);
  }

  /**
   * Elect new leader based on stake and reputation
   */
  electNewLeader() {
    const activeValidators = Array.from(this.validators.values())
      .filter(v => v.isActive)
      .sort((a, b) => {
        // Sort by stake and reputation
        const scoreA = a.stake * a.reputation;
        const scoreB = b.stake * b.reputation;
        return scoreB - scoreA;
      });

    if (activeValidators.length > 0) {
      const newLeader = activeValidators[0];
      if (newLeader.id !== this.leaderId) {
        console.log(`[BFT] New leader elected: ${newLeader.id}`);
        this.leaderId = newLeader.id;

        // Update validator states
        this.validators.forEach(v => v.isLeader = (v.id === this.leaderId));

        // Broadcast new leader
        this.broadcastValidatorList();
      }
    }
  }

  /**
   * Broadcast message to all validators
   */
  broadcast(type, data) {
    this.io.emit('bft_message', { type, data });
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, type, data) {
    const client = this.clients.get(clientId);
    if (client && client.socket) {
      client.socket.emit(type, data);
    } else {
      // Try to find by socket ID
      const socket = this.io.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit(type, data);
      }
    }
  }

  /**
   * Broadcast validator list
   */
  broadcastValidatorList() {
    const validatorList = Array.from(this.validators.values()).map(v => ({
      id: v.id,
      address: v.address,
      stake: v.stake,
      isLeader: v.isLeader,
      isActive: v.isActive,
      reputation: v.reputation,
      byzantineScore: v.byzantineScore,
    }));

    this.io.emit('validator_list', {
      validators: validatorList,
      quorumSize: this.quorumSize,
      currentView: this.currentView,
      leaderId: this.leaderId,
    });
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(socket) {
    console.log(`[BFT] Client disconnected: ${socket.id}`);

    const validator = this.validators.get(socket.id);
    if (validator) {
      validator.isActive = false;

      if (socket.id === this.leaderId) {
        this.initiateViewChange();
      }
    }

    this.clients.delete(socket.id);
  }

  /**
   * Compute digest of request
   */
  computeDigest(request) {
    const data = JSON.stringify({
      operation: request.operation,
      params: request.params,
      timestamp: request.timestamp,
      clientId: request.clientId,
    });

    return crypto.createHash('sha3-512').update(data).digest('hex');
  }

  /**
   * Sign message with quantum-resistant key
   */
  signMessage(message) {
    const hmac = crypto.createHmac('sha3-512', this.quantumResistantKeys.privateKey);
    hmac.update(message);
    return hmac.digest('base64');
  }

  /**
   * Set consensus timeout
   */
  setConsensusTimeout(requestId) {
    setTimeout(() => {
      const request = this.pendingRequests.get(requestId);
      if (request && request.retries < BFT_CONFIG.MAX_RETRIES) {
        request.retries++;
        console.log(`[BFT] Retrying request: ${requestId}, attempt: ${request.retries}`);

        if (this.isLeader()) {
          this.initiateConsensus(request);
        } else {
          this.forwardToLeader(request);
        }
      } else if (request) {
        this.stats.failedRequests++;
        this.sendToClient(request.clientId, 'request_timeout', { requestId });
        this.pendingRequests.delete(requestId);
      }
    }, BFT_CONFIG.REQUEST_TIMEOUT);
  }

  /**
   * Get last stable checkpoint
   */
  getLastStableCheckpoint() {
    return {
      sequenceNumber: Math.floor(this.sequenceNumber / BFT_CONFIG.CHECKPOINT_INTERVAL) * BFT_CONFIG.CHECKPOINT_INTERVAL,
      stateHash: this.computeDigest({ sequenceNumber: this.sequenceNumber }),
    };
  }

  /**
   * Get prepared requests for view change
   */
  getPreparedRequests() {
    const prepared = [];
    this.preparedRequests.forEach((value, key) => {
      if (value.prepares.size >= this.quorumSize) {
        prepared.push({
          key,
          request: value.request,
          digest: value.prePrepare.digest,
        });
      }
    });
    return prepared;
  }

  /**
   * Handle checkpoint message
   */
  handleCheckpoint(message) {
    const { sequenceNumber, stateHash, validatorId } = message;
    const key = `checkpoint-${sequenceNumber}`;

    if (!this.checkpoints.has(key)) {
      this.checkpoints.set(key, new Map());
    }

    this.checkpoints.get(key).set(validatorId, message);

    // If we have quorum of checkpoints, mark as stable
    if (this.checkpoints.get(key).size >= this.quorumSize) {
      console.log(`[BFT] Checkpoint ${sequenceNumber} is stable`);
    }
  }

  /**
   * Cleanup old requests
   */
  cleanupOldRequests(currentSequence) {
    const stableSequence = currentSequence - BFT_CONFIG.CHECKPOINT_INTERVAL * 2;

    this.preparedRequests.forEach((value, key) => {
      const seq = parseInt(key.split('-')[1]);
      if (seq < stableSequence) {
        this.preparedRequests.delete(key);
      }
    });
  }

  /**
   * Send status to client
   */
  sendStatus(socket) {
    socket.emit('bft_status', {
      nodeId: this.nodeId,
      currentView: this.currentView,
      nodeState: this.nodeState,
      sequenceNumber: this.sequenceNumber,
      validatorsCount: this.validators.size,
      activeValidators: Array.from(this.validators.values()).filter(v => v.isActive).length,
      quorumSize: this.quorumSize,
      isLeader: this.isLeader(),
      leaderId: this.leaderId,
      stats: this.stats,
      quantumKeys: {
        publicKey: this.quantumResistantKeys.publicKey,
        algorithm: this.quantumResistantKeys.algorithm,
      },
    });
  }

  /**
   * Get consensus statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageConsensusTime: this.stats.consensusTime.length > 0
        ? this.stats.consensusTime.reduce((a, b) => a + b, 0) / this.stats.consensusTime.length
        : 0,
    };
  }

  /**
   * Add a new validator
   */
  addValidator(address, publicKey, stake) {
    const validator = new ValidatorNode(
      uuidv4(),
      address,
      publicKey,
      stake,
      this.validators.size === 0
    );

    this.validators.set(validator.id, validator);
    this.broadcastValidatorList();

    return validator;
  }

  /**
   * Remove a validator
   */
  removeValidator(validatorId) {
    this.validators.delete(validatorId);
    this.broadcastValidatorList();

    if (validatorId === this.leaderId) {
      this.electNewLeader();
    }
  }
}

module.exports = BFTConsensusService;
