import { useCallback, useEffect, useState } from 'react'
import { bftService, type BFTHealth, type BFTStats, type BFTStatus, type Validator } from '../services/BFTService'

interface BFTDashboardProps {
  baseUrl?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function BFTDashboard({ baseUrl = 'http://localhost:3001', autoRefresh = true, refreshInterval = 5000 }: BFTDashboardProps) {
  const [status, setStatus] = useState<BFTStatus | null>(null)
  const [validators, setValidators] = useState<Validator[]>([])
  const [stats, setStats] = useState<BFTStats | null>(null)
  const [health, setHealth] = useState<BFTHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'validators' | 'stats'>('overview')

  const fetchData = useCallback(async () => {
    try {
      bftService.setBaseUrl(baseUrl)

      const [statusData, validatorsData, statsData, healthData] = await Promise.all([
        bftService.getStatus().catch(() => null),
        bftService.getValidators().catch(() => null),
        bftService.getStats().catch(() => null),
        bftService.getHealth().catch(() => null),
      ])

      setStatus(statusData)
      setValidators(validatorsData?.validators || [])
      setStats(statsData)
      setHealth(healthData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BFT data')
    } finally {
      setLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    fetchData()

    let interval: NodeJS.Timeout | undefined
    if (autoRefresh) {
      interval = setInterval(fetchData, refreshInterval)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [fetchData, autoRefresh, refreshInterval])

  const handleViewChange = async () => {
    try {
      await bftService.initiateViewChange()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate view change')
    }
  }

  const getHealthColor = () => {
    if (!health) return 'text-gray-500'
    switch (health.status) {
      case 'healthy':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      default:
        return 'text-red-500'
    }
  }

  const getValidatorStatusColor = (validator: Validator) => {
    if (!validator.isActive) return 'bg-red-100 text-red-800'
    if (validator.isLeader) return 'bg-purple-100 text-purple-800'
    return 'bg-green-100 text-green-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading BFT Consensus...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🔐 BFT Consensus Dashboard</h2>
        <div className="flex items-center gap-4">
          <button onClick={fetchData} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            Refresh
          </button>
          <button onClick={handleViewChange} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition">
            Initiate View Change
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {/* Health Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-600">Status: </span>
            <span className={`font-bold ${getHealthColor()}`}>{health?.status || 'Unknown'}</span>
          </div>
          <div className="text-sm text-gray-600">
            View: <span className="font-mono">{status?.currentView || 0}</span>| Sequence:{' '}
            <span className="font-mono">{status?.sequenceNumber || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'validators' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('validators')}
        >
          Validators ({validators.length})
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'stats' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Validators</div>
            <div className="text-2xl font-bold text-blue-600">{status?.validatorsCount || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{status?.activeValidators || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">Quorum Required</div>
            <div className="text-2xl font-bold text-purple-600">{status?.quorumSize || 0}</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600">View Changes</div>
            <div className="text-2xl font-bold text-orange-600">{stats?.viewChanges || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg col-span-2">
            <div className="text-sm text-gray-600">Leader</div>
            <div className="text-lg font-mono text-green-600 truncate">{status?.leaderId || 'None'}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg col-span-2">
            <div className="text-sm text-gray-600">Current Node</div>
            <div className="text-lg font-mono text-gray-600 truncate">{status?.isLeader ? '👑 LEADER' : status?.nodeId || 'Unknown'}</div>
          </div>
        </div>
      )}

      {/* Validators Tab */}
      {activeTab === 'validators' && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stake</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reputation</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Byzantine Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {validators.map((validator) => (
                <tr key={validator.id} className={validator.isLeader ? 'bg-purple-50' : ''}>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getValidatorStatusColor(validator)}`}>
                      {validator.isLeader ? '👑 Leader' : validator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-sm truncate max-w-xs">{validator.address}</td>
                  <td className="px-4 py-2">{validator.stake.toLocaleString()}</td>
                  <td className="px-4 py-2">{validator.reputation}</td>
                  <td className="px-4 py-2">
                    <span className={validator.byzantineScore > 5 ? 'text-red-600 font-bold' : ''}>{validator.byzantineScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Requests</div>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalRequests || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Successful</div>
            <div className="text-2xl font-bold text-green-600">{stats?.successfulRequests || 0}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats?.failedRequests || 0}</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-gray-600">View Changes</div>
            <div className="text-2xl font-bold text-yellow-600">{stats?.viewChanges || 0}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600">Byzantine Detections</div>
            <div className="text-2xl font-bold text-red-600">{stats?.byzantineDetections || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">Avg Consensus Time</div>
            <div className="text-2xl font-bold text-purple-600">{(stats?.averageConsensusTime || 0).toFixed(2)}ms</div>
          </div>
        </div>
      )}

      {/* Quantum Security Info */}
      {status?.quantumKeys && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2">🔒 Quantum-Resistant Security</h3>
          <div className="text-sm text-gray-600">
            <p>
              Algorithm: <span className="font-mono font-bold text-purple-600">{status.quantumKeys.algorithm}</span>
            </p>
            <p className="mt-1">
              Public Key: <span className="font-mono text-xs">{status.quantumKeys.publicKey.substring(0, 32)}...</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BFTDashboard
