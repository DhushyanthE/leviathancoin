import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Home from './Home'
import NavigationMenu from './components/NavigationMenu'
import HardwareBenchmarkDashboard from './pages/HardwareBenchmarkDashboard'
import WsQaoaConsole from './pages/WsQaoaConsole'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [{ id: WalletId.DEFLY }, { id: WalletId.PERA }, { id: WalletId.EXODUS }]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Router>
          <NavigationMenu />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hardware-benchmark" element={<HardwareBenchmarkDashboard />} />
            <Route path="/console/ws-qaoa" element={<WsQaoaConsole />} />
            <Route path="/qaoa-simulator" element={<QaoaSimulator />} />
          </Routes>
        </Router>
      </WalletProvider>
    </SnackbarProvider>
  )
}
