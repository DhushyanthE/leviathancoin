import { AlertCircle, Play, Shield } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useBFT } from '../services/BFTService'
import BFTDashboard from './BFTDashboard'

interface DefenseMetrics {
  blocked: number
  captured: number
  avgLatency: number
  auditHash: string
}

const FirewallConsole: React.FC = () => {
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [history, setHistory] = useState<any[]>([])
  const [metrics, setMetrics] = useState<DefenseMetrics>({ blocked: 0, captured: 0, avgLatency: 0, auditHash: '' })
  const wsRef = useRef<WebSocket | null>(null)
  const { bftHealth } = useBFT()

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')
    ws.onopen = () => setWsStatus('connected')
    ws.onclose = () => setWsStatus('disconnected')
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setHistory((prev) => [...prev.slice(-19), data]) // Last 20 cycles
      setMetrics({
        blocked: history.filter((h) => h.decision?.includes('BLOCKED')).length + 1,
        captured: history.filter((h) => h.decision?.includes('CAPTURED')).length + 1,
        avgLatency: data.metrics?.cycle_time_ms || 450,
        auditHash: data.audit_hash || '0xabc...',
      })
    }
    wsRef.current = ws
    return () => ws.close()
  }, [])

  const simulateThreat = useCallback((type: 'malicious' | 'benign') => {
    const features =
      type === 'malicious' ? { payload: 'malware_pattern', source: '10.0.0.1' } : { payload: 'benign_tx', source: '192.168.1.1' }
    wsRef.current?.send(JSON.stringify({ type: 'threat', features }))
  }, [])

  return (
    <div className="container mx-auto p-8 min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold flex items-center justify-center gap-4 mb-4">
          <Shield className="w-16 h-16 text-blue-400" />
          Quantum Firewall Console
        </h1>
        <p className="text-xl text-gray-400">Real-time 450ms defense cycles: Echo → QNN → Honeypot → Audit</p>
        <div className={`badge badge-lg mt-4 ${wsStatus === 'connected' ? 'badge-success' : 'badge-error'}`}>
          WS: {wsStatus.toUpperCase()}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 p-6 bg-gray-800/50 rounded-2xl">
        <div className="stat text-primary">
          <div className="stat-title">Threats Blocked</div>
          <div className="stat-value">{metrics.blocked}</div>
        </div>
        <div className="stat text-secondary">
          <div className="stat-title">Captured (Honeypot)</div>
          <div className="stat-value">{metrics.captured}</div>
        </div>
        <div className="stat text-accent">
          <div className="stat-title">Cycle Latency</div>
          <div className="stat-value">{metrics.avgLatency.toFixed(0)}ms</div>
        </div>
      </div>

      {/* Threat Simulator */}
      <div className="card bg-base-100 shadow-2xl mb-8">
        <div className="card-body">
          <h3 className="card-title">Simulate Attack</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => simulateThreat('malicious')} className="btn btn-error gap-2">
              <AlertCircle className="w-5 h-5" />
              Malware Attack
            </button>
            <button onClick={() => simulateThreat('benign')} className="btn btn-success gap-2">
              <Play className="w-5 h-5" />
              Benign Traffic
            </button>
          </div>
        </div>
      </div>

      {/* BFT Defense Integration */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <BFTDashboard />
        </div>
      </div>

      {/* Audit Log (last 20 cycles) */}
      {history.length > 0 && (
        <div className="card bg-gray-900/50 mt-8">
          <div className="card-body">
            <h3 className="card-title">Recent Audit Log</h3>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Decision</th>
                    <th>Hash</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td>{new Date().toLocaleTimeString()}</td>
                      <td>{h.decision || 'Analyzing'}</td>
                      <td className="font-mono text-xs">{h.audit_hash?.slice(0, 10)}...</td>
                      <td>{h.metrics?.cycle_time_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FirewallConsole
