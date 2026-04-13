import React from 'react'
import { useBFT } from '../../services/BFTService'
import FirewallConsole from '../components/FirewallConsole'

const WsQaoaConsole: React.FC = () => {
  const { kFactor, trotterError, barrenPlateauVariance } = useBFT()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">WS-QAOA + Firewall Console</h1>
      <p className="mb-6">Quantum optimization + real-time BFT defense.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-primary text-primary-content">
          <div className="stat-title">k-Factor</div>
          <div className="stat-value">{kFactor || '1.2'}</div>
        </div>
        <div className="stat bg-secondary">
          <div className="stat-title">Trotter Error</div>
          <div className="stat-value">{trotterError || '0.01%'}</div>
        </div>
        <div className="stat bg-accent text-accent-content">
          <div className="stat-title">Barren Plateau</div>
          <div className="stat-value">{barrenPlateauVariance || '0.05'}</div>
        </div>
      </div>
      <FirewallConsole />
    </div>
  )
}

export default WsQaoaConsole
