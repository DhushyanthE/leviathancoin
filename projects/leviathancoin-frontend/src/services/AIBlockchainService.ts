import { ethers } from 'ethers'

/**
 * AI & Deep Learning Blockchain Integration
 * Frontend utility for interacting with AI models on blockchain
 */

enum ModelType {
  NEURAL_NETWORK = 'neural_network',
  DEEP_LEARNING = 'deep_learning',
  CONVOLUTIONAL_NN = 'cnn',
  RECURRENT_NN = 'rnn',
  TRANSFORMER = 'transformer',
  REINFORCEMENT_LEARNING = 'rl',
  GRADIENT_BOOSTING = 'gradient_boosting',
}

enum InferenceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified',
}

enum TrainingStatus {
  INITIALIZING = 'initializing',
  TRAINING = 'training',
  VALIDATING = 'validating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface NeuralNetworkConfig {
  inputSize: number
  hiddenLayers: number[]
  outputSize: number
  activation: string
  learningRate: number
  batchSize: number
  epochs: number
}
interface InferenceRequest {
  requestId: string
  modelHash: string
  inputData: number[]
  requester: string
  timestamp: number
  reward: number
  status: InferenceStatus
}

interface TrainingJob {
  jobId: string
  modelHash: string
  trainer: string
  datasetHash: string
  config: NeuralNetworkConfig
  timestamp: number
  reward: number
  status: TrainingStatus
  iterationsCompleted: number
}

interface ModelInfo {
  modelHash: string
  config: NeuralNetworkConfig
  totalParameters: number
  createdAt: number
}

interface InferenceResult {
  requestId: string
  prediction: number[]
  modelHash: string
  timestamp: number
  requester: string
}

/**
 * AI Blockchain Service - Frontend integration
 */
class AIBlockchainService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider
  private signer: ethers.Signer | null = null
  private contract: ethers.Contract | null = null
  private apiBaseUrl: string

  constructor(providerUrl: string = 'http://localhost:8545', apiBaseUrl: string = 'http://localhost:3001') {
    this.provider = new ethers.JsonRpcProvider(providerUrl)
    this.apiBaseUrl = apiBaseUrl
  }

  async initializeSigner(privateKey?: string): Promise<void> {
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider)
    } else {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      this.signer = await provider.getSigner()
    }
  }

  async registerModel(config: NeuralNetworkConfig): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/register-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Failed to register model')
      }

      const data = await response.json()
      return data.modelHash
    } catch (error) {
      console.error('Error registering model:', error)
      throw error
    }
  }

  async submitInferenceRequest(modelHash: string, inputData: number[], reward: number): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized')
      }

      const requester = await this.signer.getAddress()

      const response = await fetch(`${this.apiBaseUrl}/api/ai/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelHash,
          inputData,
          requester,
          reward,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit inference request')
      }

      const data = await response.json()
      return data.requestId
    } catch (error) {
      console.error('Error submitting inference request:', error)
      throw error
    }
  }

  async executeInference(requestId: string): Promise<InferenceResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/inference/${requestId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to execute inference')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error executing inference:', error)
      throw error
    }
  }

  async submitTrainingJob(modelHash: string, datasetHash: string, config: NeuralNetworkConfig, reward: number): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized')
      }

      const trainer = await this.signer.getAddress()

      const response = await fetch(`${this.apiBaseUrl}/api/ai/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelHash,
          datasetHash,
          config,
          trainer,
          reward,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit training job')
      }

      const data = await response.json()
      return data.jobId
    } catch (error) {
      console.error('Error submitting training job:', error)
      throw error
    }
  }

  async getTrainingJobStatus(jobId: string): Promise<{ [key: string]: any }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/training/${jobId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to get training status')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting training status:', error)
      throw error
    }
  }

  async getModelInfo(modelHash: string): Promise<ModelInfo> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/models/${modelHash}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to get model info')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting model info:', error)
      throw error
    }
  }

  async getInferenceHistory(limit: number = 100): Promise<InferenceResult[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/inference/history?limit=${limit}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to get inference history')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting inference history:', error)
      throw error
    }
  }

  async verifyInference(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ai/inference/${requestId}/verify`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to verify inference')
      }

      const data = await response.json()
      return data.verified
    } catch (error) {
      console.error('Error verifying inference:', error)
      throw error
    }
  }
}

/**
 * Reinforcement Learning Service for Blockchain
 */
class RLBlockchainService {
  private apiBaseUrl: string
  private signer: ethers.Signer | null = null

  constructor(apiBaseUrl: string = 'http://localhost:3001') {
    this.apiBaseUrl = apiBaseUrl
  }

  async initializeSigner(privateKey?: string): Promise<void> {
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey)
    } else {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      this.signer = await provider.getSigner()
    }
  }

  async submitAction(agentId: string, state: string, action: number, reward: number): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized')
      }

      const agent = await this.signer.getAddress()

      const response = await fetch(`${this.apiBaseUrl}/api/rl/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          agent,
          state,
          action,
          reward,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit action')
      }

      const data = await response.json()
      return data.transactionHash
    } catch (error) {
      console.error('Error submitting RL action:', error)
      throw error
    }
  }

  async getAgentPolicy(agentId: string): Promise<{ [key: string]: any }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/rl/agent/${agentId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to get agent policy')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting agent policy:', error)
      throw error
    }
  }

  async recordEpisode(agentId: string, episode: { [key: string]: any }): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/rl/episode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          ...episode,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record episode')
      }

      const data = await response.json()
      return data.episodeId
    } catch (error) {
      console.error('Error recording episode:', error)
      throw error
    }
  }
}

/**
 * Distributed ML Training Service
 */
class DistributedMLService {
  private apiBaseUrl: string
  private signer: ethers.Signer | null = null

  constructor(apiBaseUrl: string = 'http://localhost:3001') {
    this.apiBaseUrl = apiBaseUrl
  }

  async initializeSigner(privateKey?: string): Promise<void> {
    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey)
    } else {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      this.signer = await provider.getSigner()
    }
  }

  async submitGradient(modelId: string, gradients: number[], datasetSize: number): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized')
      }

      const contributor = await this.signer.getAddress()
      const signature = await this.signer.signMessage(JSON.stringify(gradients))

      const response = await fetch(`${this.apiBaseUrl}/api/ml/gradient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          gradients,
          datasetSize,
          contributor,
          signature,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit gradient')
      }

      const data = await response.json()
      return data.transactionHash
    } catch (error) {
      console.error('Error submitting gradient:', error)
      throw error
    }
  }

  async aggregateGradients(modelId: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ml/aggregate/${modelId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to aggregate gradients')
      }

      const data = await response.json()
      return data.aggregatedGradients
    } catch (error) {
      console.error('Error aggregating gradients:', error)
      throw error
    }
  }

  async getModelState(modelId: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ml/model/${modelId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to get model state')
      }

      const data = await response.json()
      return data.weights
    } catch (error) {
      console.error('Error getting model state:', error)
      throw error
    }
  }

  async claimReward(modelId: string, contributionHash: string): Promise<string> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized')
      }

      const contributor = await this.signer.getAddress()

      const response = await fetch(`${this.apiBaseUrl}/api/ml/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          contributor,
          contributionHash,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to claim reward')
      }

      const data = await response.json()
      return data.transactionHash
    } catch (error) {
      console.error('Error claiming reward:', error)
      throw error
    }
  }
}

export {
  AIBlockchainService,
  DistributedMLService,
  InferenceRequest,
  InferenceResult,
  InferenceStatus,
  ModelInfo,
  ModelType,
  NeuralNetworkConfig,
  RLBlockchainService,
  TrainingJob,
  TrainingStatus,
}
