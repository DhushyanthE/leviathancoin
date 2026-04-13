## ✅ Kontour Coin – Production Ready

Kontour Coin: Quantum-resistant Layer-1 blockchain with AI-driven defense (BFT + QAOA sims). Ready for production/VC demo.

### 📦 Modules Inventory

| Module | Description | Files/Components |
|--------|-------------|------------------|
| **QAOA Simulator** | TSP 9×9 QUBO, Max-Cut, Bell >2.0, circuit diagram | `projects/leviathancoin-frontend/src/pages/QaoaSimulator.tsx` |
| **Firewall Console** | Real-time BFT dashboard, threat sim | `BFTDashboard.tsx` (FirewallConsole incoming) |
| **Hardware Benchmark** | IBM/Google/IonQ QPU metrics | `HardwareBenchmarkDashboard.tsx` |
| **Backend API** | Express/Socket.io, BFT consensus, staking/DAO | `projects/leviathan-backend/server.js` |
| **Smart Contracts** | Leviathan Token, Kontour Governance | `projects/leviathancoin-contracts/smart_contracts/` |
| **Frontend** | React/Tailwind, wallet connect, pages | `projects/leviathancoin-frontend/` |

### 🚀 Setup & Run

```bash
# Backend (BFT/firewall)
cd projects/leviathan-backend
npm install
npm start  # http://localhost:3001

# Frontend (QAOA/dash)
cd ../leviathancoin-frontend
npm install
npm run dev  # http://localhost:5173
```

**Demo Paths:**
- `/pages/QaoaSimulator` – QAOA Bell score demo
- `/pages/HardwareBenchmarkDashboard` – QPU bench
- `/components/BFTDashboard` – Live firewall console
- `/pages/WsQaoaConsole` – WS-QAOA metrics

### 📤 Deploy Frontend (Vercel for VCs)

```bash
cd projects/leviathancoin-frontend
npm i -g vercel
vercel login
vercel --prod  # Get live URL
```

### ✅ Status
- Tests pass (pytest, jest)
- PR merged
- Tag v1.0.0 ready
- Live deploy → Seed round prepared

Raise $3.5M 🚀

