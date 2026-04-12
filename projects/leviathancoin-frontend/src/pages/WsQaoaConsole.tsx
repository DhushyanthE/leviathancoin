import React from 'react';
import BFTDashboard from '../components/BFTDashboard'; // Reuse BFT dashboard
import { useBFT } from '../../services/BFTService'; // Assume service

const WsQaoaConsole: React.FC = () => {
  const { kFactor, trotterError, barrenPlateauVariance } = useBFT(); // Mock data

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">WS-QAOA Deployment Console</h1>
      <p className="mb-6">Live monitoring of k-factor scaling, Trotter Error, Barren Plateau tripwire.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-primary text-primary-content">
          <div className="stat-title">k-Factor Efficiency</div>
          <div className="stat-value">{kFactor || '1.2'}</div>
        </div>
        <div className="stat bg-secondary text-secondary-content">
          <div className="stat-title">Trotter Error (Layer Depth)</div>
          <div className="stat-value">{trotterError || '0.01%'}</div>
        </div>
        <div className="stat bg-accent text-accent-content">
          <div className="stat-title">Barren Plateau Variance</div>
          <div className="stat-value text-warning">{barrenPlateauVariance || '0.05'}</div>
          <div className="stat-desc">Tripwire: Classical fallback if < 0.01</div>
        </div>
      </div>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <BFTDashboard />
        </div>
      </div>
    </div>
  );
};

export default WsQaoaConsole;
