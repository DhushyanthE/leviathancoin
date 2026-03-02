import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { OnSchemaBreak, OnUpdate } from '@algorandfoundation/algokit-utils/types/app'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { LeviathanTokenFactory } from '../contracts/leviathan_token'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface LeviathanTokenInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const LeviathanToken = ({ openModal, setModalState }: LeviathanTokenInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [action, setAction] = useState<'deploy' | 'mine' | 'mint-nft' | 'create-token' | 'wallet'>('deploy')
  const [nftName, setNftName] = useState<string>('Leviathan NFT #1')
  const [nftUrl, setNftUrl] = useState<string>('https://leviathancoin.com/nft/1')
  const [tokenName, setTokenName] = useState<string>('Leviathan Coin')
  const [tokenUnit, setTokenUnit] = useState<string>('LEVI')
  const [tokenSupply, setTokenSupply] = useState<string>('1000000')
  const [miningStats, setMiningStats] = useState<any>(null)
  const [nfts, setNfts] = useState<any[]>([])
  const [useBackend, setUseBackend] = useState<boolean>(false)
  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig,
    indexerConfig,
  })
  algorand.setDefaultSigner(transactionSigner)

  // Fetch mining stats when modal opens
  useEffect(() => {
    if (openModal) {
      fetchMiningStats()
    }
  }, [openModal])

  const fetchMiningStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mining/stats`)
      const data = await response.json()
      if (data.success) {
        setMiningStats(data.stats)
      }
    } catch (error) {
      console.log('Backend not available, using smart contract only')
    }
  }

  // === BACKEND API METHODS ===

  const generateWallet = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/wallet/generate`)
      const data = await response.json()
      if (data.success) {
        enqueueSnackbar(`Wallet generated! Address: ${data.address.slice(0, 10)}...`, { variant: 'success' })
      }
    } catch (error) {
      enqueueSnackbar('Backend not available', { variant: 'warning' })
    }
    setLoading(false)
  }

  const createTokenViaBackend = async () => {
    setLoading(true)
    try {
      // This would require mnemonic in production - for demo purposes
      enqueueSnackbar('Please use the smart contract method for token creation', { variant: 'info' })
    } catch (error) {
      enqueueSnackbar(`Error: ${error}`, { variant: 'error' })
    }
    setLoading(false)
  }

  const mineViaBackend = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/mining/mine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: import.meta.env.VITE_CONTRACT_APP_ID || 0,
        }),
      })
      const data = await response.json()
      if (data.success) {
        enqueueSnackbar(`Mined ${data.miningReward} tokens!`, { variant: 'success' })
      }
    } catch (error) {
      enqueueSnackbar('Backend not available', { variant: 'warning' })
    }
    setLoading(false)
  }

  const mintNftViaBackend = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/nft/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nftName,
          unitName: 'LEVI',
          url: nftUrl,
        }),
      })
      const data = await response.json()
      if (data.success) {
        enqueueSnackbar(`NFT minted! Asset ID: ${data.assetId}`, { variant: 'success' })
      }
    } catch (error) {
      enqueueSnackbar('Backend not available', { variant: 'warning' })
    }
    setLoading(false)
  }

  const fetchNFTs = async () => {
    if (!activeAddress) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/nft/owned/${activeAddress}`)
      const data = await response.json()
      if (data.success) {
        setNfts(data.nfts)
        enqueueSnackbar(`Found ${data.nfts.length} NFTs`, { variant: 'success' })
      }
    } catch (error) {
      enqueueSnackbar('Backend not available', { variant: 'warning' })
    }
    setLoading(false)
  }

  // === SMART CONTRACT METHODS ===

  const deployContract = async () => {
    setLoading(true)
    try {
      const factory = new LeviathanTokenFactory({
        defaultSender: activeAddress ?? undefined,
        algorand,
      })

      const deployResult = await factory.deploy({
        onSchemaBreak: OnSchemaBreak.AppendApp,
        onUpdate: OnUpdate.AppendApp,
      })

      const { appClient } = deployResult
      enqueueSnackbar(`Contract deployed! App ID: ${appClient.appId}`, { variant: 'success' })

      // Initialize token
      await appClient.send.createToken({
        args: {
          maxSupply: 1_000_000_000,
          unitName: 'LEVI',
          assetName: 'Leviathan Coin',
          url: 'https://leviathancoin.com/metadata',
        },
      })

      enqueueSnackbar(`Token created successfully!`, { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Error: ${(e as Error).message}`, { variant: 'error' })
    }
    setLoading(false)
  }

  const mineToken = async () => {
    setLoading(true)
    try {
      const factory = new LeviathanTokenFactory({
        defaultSender: activeAddress ?? undefined,
        algorand,
      })

      // Get the app client (assumes contract is already deployed)
      const appClient = factory.getAppClientById({ appId: BigInt(0) }) // Would need real app ID

      const response = await appClient.send.mine({
        args: {
          miner: activeAddress ?? '',
        },
      })

      enqueueSnackbar(`Mined tokens!`, { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Error mining: ${(e as Error).message}`, { variant: 'error' })
    }
    setLoading(false)
  }

  const mintNft = async () => {
    setLoading(true)
    try {
      const factory = new LeviathanTokenFactory({
        defaultSender: activeAddress ?? undefined,
        algorand,
      })

      const appClient = factory.getAppClientById({ appId: BigInt(0) }) // Would need real app ID

      const response = await appClient.send.mintNft({
        args: {
          minter: activeAddress ?? '',
          nftName: nftName,
          nftUrl: nftUrl,
        },
      })

      enqueueSnackbar(`NFT minted!`, { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Error minting NFT: ${(e as Error).message}`, { variant: 'error' })
    }
    setLoading(false)
  }

  const handleAction = async () => {
    if (useBackend) {
      // Use Backend API
      switch (action) {
        case 'wallet':
          await generateWallet()
          break
        case 'create-token':
          await createTokenViaBackend()
          break
        case 'mine':
          await mineViaBackend()
          break
        case 'mint-nft':
          await mintNftViaBackend()
          break
      }
    } else {
      // Use Smart Contract
      switch (action) {
        case 'deploy':
          await deployContract()
          break
        case 'mine':
          await mineToken()
          break
        case 'mint-nft':
          await mintNft()
          break
      }
    }
  }

  return (
    <dialog id="leviathan_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`}>
      <form method="dialog" className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">🌊 Leviathan Token - Mining & NFT</h3>

        {/* Backend Toggle */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={useBackend}
              onChange={(e) => setUseBackend(e.target.checked)}
            />
            <span className="ml-2 text-sm">Use Backend API (Node.js)</span>
          </label>
        </div>

        {/* Mining Stats */}
        {miningStats && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-purple-100 p-2 rounded">
              <span className="font-bold">Total Mined:</span> {miningStats.totalMined || 0}
            </div>
            <div className="bg-purple-100 p-2 rounded">
              <span className="font-bold">Miners:</span> {miningStats.miners || 0}
            </div>
            <div className="bg-purple-100 p-2 rounded">
              <span className="font-bold">Difficulty:</span> {miningStats.difficulty || 1}
            </div>
            <div className="bg-purple-100 p-2 rounded">
              <span className="font-bold">Reward:</span> {miningStats.rewardPerBlock || 1000000}
            </div>
          </div>
        )}

        <br />

        <div className="mb-4">
          <label className="label">
            <span className="label-text">Select Action</span>
          </label>
          <select className="select select-bordered w-full" value={action} onChange={(e) => setAction(e.target.value as any)}>
            {useBackend ? (
              <>
                <option value="wallet">Generate Wallet</option>
                <option value="create-token">Create Token (ASA)</option>
                <option value="mine">Mine Tokens</option>
                <option value="mint-nft">Mint NFT</option>
              </>
            ) : (
              <>
                <option value="deploy">Deploy Smart Contract</option>
                <option value="mine">Mine Tokens</option>
                <option value="mint-nft">Mint NFT</option>
              </>
            )}
          </select>
        </div>

        {action === 'mint-nft' && (
          <>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">NFT Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter NFT name"
                className="input input-bordered w-full"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">NFT Metadata URL</span>
              </label>
              <input
                type="text"
                placeholder="Enter NFT metadata URL"
                className="input input-bordered w-full"
                value={nftUrl}
                onChange={(e) => setNftUrl(e.target.value)}
              />
            </div>
          </>
        )}

        {action === 'create-token' && useBackend && (
          <>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Token Name</span>
              </label>
              <input
                type="text"
                placeholder="Leviathan Coin"
                className="input input-bordered w-full"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Unit Name</span>
              </label>
              <input
                type="text"
                placeholder="LEVI"
                className="input input-bordered w-full"
                value={tokenUnit}
                onChange={(e) => setTokenUnit(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Total Supply</span>
              </label>
              <input
                type="text"
                placeholder="1000000"
                className="input input-bordered w-full"
                value={tokenSupply}
                onChange={(e) => setTokenSupply(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(!openModal)}>
            Close
          </button>
          <button className={`btn btn-primary`} onClick={handleAction}>
            {loading ? (
              <span className="loading loading-spinner" />
            ) : action === 'wallet' ? (
              'Generate'
            ) : action === 'create-token' ? (
              'Create Token'
            ) : action === 'deploy' ? (
              'Deploy'
            ) : action === 'mine' ? (
              'Mine'
            ) : (
              'Mint NFT'
            )}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default LeviathanToken
