// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AppCalls from './components/AppCalls'
import ConnectWallet from './components/ConnectWallet'
import LeviathanToken from './components/LeviathanToken'
import Transact from './components/Transact'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [leviathanTokenModal, setLeviathanTokenModal] = useState<boolean>(false)
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

  return (
    <div className="hero min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">
            Welcome to <div className="font-bold text-purple-600">Leviathan Coin</div>
          </h1>
          <p className="py-6">Your own blockchain network with mining and NFT capabilities on Algorand.</p>

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
              </>
            )}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
          <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
          <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
          <LeviathanToken openModal={leviathanTokenModal} setModalState={setLeviathanTokenModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
