// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AppCalls from './components/AppCalls'
import BFTDashboard from './components/BFTDashboard'
import ConnectWallet from './components/ConnectWallet'
import LeviathanToken from './components/LeviathanToken'
import StakingPanel from './components/StakingPanel'
import Transact from './components/Transact'
import Web3StorageUpload from './components/Web3StorageUpload'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [leviathanTokenModal, setLeviathanTokenModal] = useState<boolean>(false)
  const [web3StorageModal, setWeb3StorageModal] = useState<boolean>(false)
  const [bftDashboardModal, setBftDashboardModal] = useState<boolean>(false)
  const [stakingModal, setStakingModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  const toggleAppCallsModal = () => {
    setAppCallsDemoModal(!appCallsDemoModal)
  }

  const toggleLeviathanTokenModal = () => {
    setLeviathanTokenModal(!leviathanTokenModal)
  }

  const toggleWeb3StorageModal = () => {
    setWeb3StorageModal(!web3StorageModal)
  }

  const toggleBFTDashboardModal = () => {
    setBftDashboardModal(!bftDashboardModal)
  }

  return (
    <div className="hero min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">
            Welcome to <div className="font-bold text-purple-600">Leviathan Coin</div>
          </h1>
          <p className="py-6">Your own blockchain network with mining, NFT, and BFT consensus capabilities on Algorand.</p>

          <div className="grid">
            <a
              data-test-id="getting-started"
              className="btn btn-primary m-2"
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/algorandfoundation/algokit-cli"
            >
              Getting started
            </a>

            <div className="divider" />
            <button data-test-id="connect-wallet" className="btn m-2" onClick={toggleWalletModal}>
              Wallet Connection
            </button>

            {activeAddress && (
              <button data-test-id="transactions-demo" className="btn m-2" onClick={toggleDemoModal}>
                Transactions Demo
              </button>
            )}

            {activeAddress && (
              <>
                <button data-test-id="appcalls-demo" className="btn m-2" onClick={toggleAppCallsModal}>
                  Contract Interactions Demo
                </button>
                <button data-test-id="leviathan-token-demo" className="btn btn-secondary m-2" onClick={toggleLeviathanTokenModal}>
                  Leviathan Mining & NFT
                </button>
                <button data-test-id="staking-panel" className="btn btn-success m-2" onClick={() => setStakingModal(true)}>
                  Stake & Validator Panel
                </button>
                <button data-test-id="web3storage-demo" className="btn btn-outline m-2" onClick={toggleWeb3StorageModal}>
                  Web3.Storage Upload Demo
                </button>
              </>
            )}

            <button data-test-id="bft-dashboard" className="btn btn-accent m-2" onClick={toggleBFTDashboardModal}>
              🔐 BFT Consensus Dashboard
            </button>
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
          <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
          <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
          <LeviathanToken openModal={leviathanTokenModal} setModalState={setLeviathanTokenModal} />
          <StakingPanel openModal={stakingModal} setModalState={setStakingModal} />

          {web3StorageModal && (
            <dialog className="modal modal-open">
              <div className="modal-box max-w-4xl">
                <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={toggleWeb3StorageModal}>
                  ✕
                </button>
                <Web3StorageUpload closeModal={toggleWeb3StorageModal} />
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={toggleWeb3StorageModal}>close</button>
              </form>
            </dialog>
          )}

          {bftDashboardModal && (
            <dialog className="modal modal-open">
              <div className="modal-box max-w-4xl">
                <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={toggleBFTDashboardModal}>
                  ✕
                </button>
                <BFTDashboard />
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={toggleBFTDashboardModal}>close</button>
              </form>
            </dialog>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
