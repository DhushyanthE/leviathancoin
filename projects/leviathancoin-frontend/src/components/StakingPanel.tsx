import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

type StakeInfo = {
  stakedAmount: number
  pendingRewards: number
  pendingUnstake: { amount: number; requestTime: number; unlockTime: number; completed: boolean } | null
  rewardsClaimed: number
  isValidator: boolean
  lastClaimTime: number
  history: Array<Record<string, unknown>>
}

interface StakingPanelProps {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const StakingPanel = ({ openModal, setModalState }: StakingPanelProps) => {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null)
  const [stakingStats, setStakingStats] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (openModal && activeAddress) {
      refreshStakingData()
    }
  }, [openModal, activeAddress])

  const refreshStakingData = async () => {
    await Promise.all([fetchStakeInfo(), fetchStakingStats(), fetchLeaderboard(), fetchHistory()])
  }

  const fetchStakeInfo = async () => {
    if (!activeAddress) return

    try {
      const res = await fetch(`${API_BASE_URL}/staking/info/${activeAddress}`)
      const data = await res.json()
      if (data.success) {
        setStakeInfo(data.stakeInfo)
      }
    } catch (error) {
      enqueueSnackbar('Unable to load stake info from backend', { variant: 'error' })
    }
  }

  const fetchStakingStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/staking/stats`)
      const data = await res.json()
      if (data.success) {
        setStakingStats(data.stats)
      }
    } catch (error) {
      enqueueSnackbar('Unable to load staking stats', { variant: 'warning' })
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/staking/leaderboard`)
      const data = await res.json()
      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      enqueueSnackbar('Unable to load leaderboard', { variant: 'warning' })
    }
  }

  const fetchHistory = async () => {
    if (!activeAddress) return

    try {
      const res = await fetch(`${API_BASE_URL}/staking/history/${activeAddress}`)
      const data = await res.json()
      if (data.success) {
        setHistory(data.history)
      }
    } catch (error) {
      enqueueSnackbar('Unable to load stake history', { variant: 'warning' })
    }
  }

  const handleStake = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Connect your wallet first', { variant: 'warning' })
      return
    }

    if (!stakeAmount || Number(stakeAmount) <= 0) {
      enqueueSnackbar('Enter a valid stake amount', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/staking/stake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: activeAddress, amount: parseInt(stakeAmount, 10) }),
      })
      const data = await res.json()
      if (data.success) {
        enqueueSnackbar(`Staked ${stakeAmount} tokens`, { variant: 'success' })
        setStakeAmount('')
        refreshStakingData()
      } else {
        throw new Error(data.error || 'Stake failed')
      }
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: 'error' })
    }
    setLoading(false)
  }

  const handleRequestUnstake = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Connect your wallet first', { variant: 'warning' })
      return
    }

    if (!unstakeAmount || Number(unstakeAmount) <= 0) {
      enqueueSnackbar('Enter an unstake amount', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/staking/unstake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: activeAddress, amount: parseInt(unstakeAmount, 10) }),
      })
      const data = await res.json()
      if (data.success) {
        enqueueSnackbar('Unstake request submitted', { variant: 'success' })
        setUnstakeAmount('')
        refreshStakingData()
      } else {
        throw new Error(data.error || 'Unstake request failed')
      }
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: 'error' })
    }
    setLoading(false)
  }

  const handleCompleteUnstake = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Connect your wallet first', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/staking/unstake/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: activeAddress }),
      })
      const data = await res.json()
      if (data.success) {
        enqueueSnackbar('Unstake completed', { variant: 'success' })
        refreshStakingData()
      } else {
        throw new Error(data.error || 'Unstake complete failed')
      }
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: 'error' })
    }
    setLoading(false)
  }

  const handleClaimRewards = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Connect your wallet first', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/staking/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: activeAddress }),
      })
      const data = await res.json()
      if (data.success) {
        enqueueSnackbar(`Claimed ${data.amount} rewards`, { variant: 'success' })
        refreshStakingData()
      } else {
        throw new Error(data.error || 'Claim failed')
      }
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: 'error' })
    }
    setLoading(false)
  }

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-4xl">
        <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setModalState(false)}>
          ✕
        </button>

        <h3 className="font-bold text-xl">Stake & Validator Panel</h3>
        <p className="text-sm text-gray-600">
          Use the backend staking API to stake, request unstake, claim rewards, and inspect validator leaderboard history.
        </p>

        {!activeAddress && (
          <div className="alert alert-warning mt-4">
            <div>
              <span>Connect your Algorand wallet to load staking data.</span>
            </div>
          </div>
        )}

        {activeAddress && (
          <div className="grid gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm uppercase text-slate-500">Address</p>
                <p className="break-all">{activeAddress}</p>
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm uppercase text-slate-500">Connected</p>
                <p className="text-green-600 font-semibold">Yes</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-indigo-50">
                <p className="text-xs uppercase text-indigo-600">Total Staked</p>
                <p className="text-2xl font-bold">{stakeInfo?.stakedAmount ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50">
                <p className="text-xs uppercase text-amber-600">Pending Rewards</p>
                <p className="text-2xl font-bold">{stakeInfo?.pendingRewards ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50">
                <p className="text-xs uppercase text-emerald-600">Rewards Claimed</p>
                <p className="text-2xl font-bold">{stakeInfo?.rewardsClaimed ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs uppercase text-slate-500">Validator</p>
                <p className={`text-xl font-semibold ${stakeInfo?.isValidator ? 'text-green-700' : 'text-slate-700'}`}>
                  {stakeInfo?.isValidator ? 'Active' : 'Pending'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs uppercase text-slate-500">APY</p>
                <p className="text-xl font-semibold">{stakingStats?.apy ?? '--'}%</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs uppercase text-slate-500">Validators</p>
                <p className="text-xl font-semibold">{stakingStats?.validatorCount ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <label className="label">
                  <span className="label-text">Stake Amount</span>
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Amount"
                  className="input input-bordered w-full"
                />
                <button className="btn btn-primary mt-3 w-full" onClick={handleStake} disabled={loading}>
                  {loading ? 'Processing...' : 'Stake'}
                </button>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <label className="label">
                  <span className="label-text">Unstake Amount</span>
                </label>
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="Amount"
                  className="input input-bordered w-full"
                />
                <button className="btn btn-warning mt-3 w-full" onClick={handleRequestUnstake} disabled={loading}>
                  {loading ? 'Processing...' : 'Request Unstake'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button className="btn btn-outline btn-success" onClick={handleCompleteUnstake} disabled={loading}>
                Complete Unstake
              </button>
              <button className="btn btn-outline btn-secondary" onClick={handleClaimRewards} disabled={loading}>
                Claim Rewards
              </button>
              <button className="btn btn-outline" onClick={refreshStakingData}>
                Refresh Data
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-slate-100 rounded-lg">
                <h4 className="font-semibold">Leaderboard</h4>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-slate-500">No leaderboard data</p>
                ) : (
                  <ol className="list-decimal list-inside text-sm mt-2">
                    {leaderboard.slice(0, 5).map((entry, index) => (
                      <li key={index} className="py-1">
                        <span className="font-semibold">{entry.address.slice(0, 8)}...</span> — {entry.stakedAmount}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="p-4 bg-slate-100 rounded-lg">
                <h4 className="font-semibold">History</h4>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500">No history yet</p>
                ) : (
                  <ul className="text-sm mt-2 space-y-2">
                    {history
                      .slice(-6)
                      .reverse()
                      .map((entry, index) => (
                        <li key={index} className="border-b border-slate-200 pb-2">
                          <span className="font-semibold">{entry.type}</span>
                          <div>{entry.amount ? `Amount: ${entry.amount}` : null}</div>
                          <div className="text-slate-500 text-xs">{new Date(entry.timestamp as number).toLocaleString()}</div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={() => setModalState(false)}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default StakingPanel
