/**
 * BFT Consensus Service for Frontend
 * Provides interface to the BFT consensus system via REST API
 */

export interface Validator {
  id: string
  address: string
  stake: number
  isLeader: boolean
  isActive: boolean
  reputation: number
  byzantineScore: number
  lastHeartbeat: number
}

export interface BFTStatus {
  nodeId: string
  currentView: number
  nodeState: string
  sequenceNumber: number
  validatorsCount: number
  activeValidators: number
  quorumSize: number
  isLeader: boolean
  leaderId: string
  stats: BFTStats
  quantumKeys: {
    publicKey: string
    algorithm: string
  }
}

export interface BFTStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  viewChanges: number
  byzantineDetections: number
  lastBlock: string | null
  consensusTime: number[]
  averageConsensusTime: number
}

export interface ConsensusResult {
  requestId: string
  result: unknown
  view: number
  sequenceNumber: number
  timestamp: number
  validatorId: string
  quantumSignature: string
}

export interface TransactionRequest {
  operation: string
  params?: Record<string, unknown>
  clientId?: string
}

export interface BFTHealth {
  success: boolean
  status: string
  details: {
    activeValidators: number
    requiredValidators: number
    currentView: number
    lastRequestTime: string | null
  }
}

class BFTService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  /**
   * Set base URL for API calls
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  /**
   * Get BFT status
   */
  async getStatus(): Promise<BFTStatus> {
    const response = await fetch(`${this.baseUrl}/api/bft/status`)
    if (!response.ok) {
      throw new Error(`Failed to get BFT status: ${response.statusText}`)
    }
    const data = await response.json()
    return data.status
  }

  /**
   * Get validator list
   */
  async getValidators(): Promise<{
    validators: Validator[]
    quorumSize: number
    currentView: number
    leaderId: string
  }> {
    const response = await fetch(`${this.baseUrl}/api/bft/validators`)
    if (!response.ok) {
      throw new Error(`Failed to get validators: ${response.statusText}`)
    }
    const data = await response.json()
    return data
  }

  /**
   * Register a new validator
   */
  async addValidator(address: string, publicKey: string, stake: number = 0): Promise<{ success: boolean; validator: Validator }> {
    const response = await fetch(`${this.baseUrl}/api/bft/validators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, publicKey, stake }),
    })
    if (!response.ok) {
      throw new Error(`Failed to add validator: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Remove a validator
   */
  async removeValidator(validatorId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/bft/validators/${validatorId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to remove validator: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Get BFT statistics
   */
  async getStats(): Promise<BFTStats> {
    const response = await fetch(`${this.baseUrl}/api/bft/stats`)
    if (!response.ok) {
      throw new Error(`Failed to get BFT stats: ${response.statusText}`)
    }
    const data = await response.json()
    return data.stats
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(requestId: string): Promise<{
    success: boolean
    transaction: {
      requestId: string
      operation: string
      status: string
      view: number
      sequenceNumber: number
      retries: number
    }
  }> {
    const response = await fetch(`${this.baseUrl}/api/bft/transaction/${requestId}`)
    if (!response.ok) {
      throw new Error(`Failed to get transaction status: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Submit transaction via BFT consensus
   */
  async submitTransaction(transaction: TransactionRequest): Promise<{
    success: boolean
    requestId: string
    status: string
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/api/bft/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
    })
    if (!response.ok) {
      throw new Error(`Failed to submit transaction: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Initiate view change
   */
  async initiateViewChange(): Promise<{
    success: boolean
    message: string
    newView: number
  }> {
    const response = await fetch(`${this.baseUrl}/api/bft/view-change`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Failed to initiate view change: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Update BFT configuration
   */
  async updateConfig(config: {
    f?: number
    requestTimeout?: number
    viewChangeTimeout?: number
    maxRetries?: number
    checkpointInterval?: number
  }): Promise<{
    success: boolean
    message: string
    config: Record<string, number>
  }> {
    const response = await fetch(`${this.baseUrl}/api/bft/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Get BFT health status
   */
  async getHealth(): Promise<BFTHealth> {
    const response = await fetch(`${this.baseUrl}/api/bft/health`)
    if (!response.ok) {
      throw new Error(`Failed to get health: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * Get consensus summary
   */
  async getConsensusSummary(): Promise<{
    status: BFTStatus
    validators: {
      validators: Validator[]
      quorumSize: number
      currentView: number
      leaderId: string
    }
    stats: BFTStats
    health: BFTHealth
  }> {
    const [status, validators, stats, health] = await Promise.all([
      this.getStatus(),
      this.getValidators(),
      this.getStats(),
      this.getHealth(),
    ])

    return {
      status,
      validators,
      stats,
      health,
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(requestId: string, maxAttempts: number = 30, interval: number = 2000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.getTransactionStatus(requestId)
        if (result.success && result.transaction.status === 'executed') {
          return true
        }
      } catch {
        // Continue waiting
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
    return false
  }

  /**
   * Check if consensus is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getHealth()
      return health.success && health.status === 'healthy'
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const bftService = new BFTService()

// Export class for custom instances
export default BFTService
