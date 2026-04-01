/**
 * Staking Service for LeviathanCoin
 * Implements Proof of Stake consensus mechanism
 */

const crypto = require('crypto');

// In-memory storage (replace with database in production)
const stakes = new Map(); // userAddress -> stake data
const rewards = new Map(); // userAddress -> pending rewards
const validators = new Map(); // userAddress -> validator data
const stakingStats = {
  totalStaked: 0,
  totalRewardsDistributed: 0,
  validatorCount: 0,
  apy: 15, // Annual Percentage Yield
};

// Configuration
const STAKING_CONFIG = {
  MIN_STAKE_AMOUNT: 100, // Minimum tokens to stake
  UNSTAKE_LOCK_PERIOD: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REWARD_DISTRIBUTION_INTERVAL: 24 * 60 * 60 * 1000, // Daily rewards
  VALIDATOR_REQUIREMENT: 1000, // Minimum stake to become validator
  COMMISSION_RATE: 5, // Validator commission percentage
};

/**
 * Stake tokens
 */
async function stakeTokens(userAddress, amount, algosdk, algodClient) {
  if (amount < STAKING_CONFIG.MIN_STAKE_AMOUNT) {
    throw new Error(`Minimum stake amount is ${STAKING_CONFIG.MIN_STAKE_AMOUNT}`);
  }

  // Verify user has sufficient balance
  try {
    const accountInfo = await algodClient.accountInformation(userAddress).do();
    const balance = accountInfo.amount;

    if (balance < amount) {
      throw new Error('Insufficient balance for staking');
    }
  } catch (error) {
    throw new Error('Failed to verify account balance');
  }

  // Get or create stake record
  let stakeData = stakes.get(userAddress);
  if (!stakeData) {
    stakeData = {
      address: userAddress,
      stakedAmount: 0,
      pendingUnstake: null,
      startTime: Date.now(),
      rewardsClaimed: 0,
      lastClaimTime: Date.now(),
      history: [],
    };
    stakes.set(userAddress, stakeData);
  }

  // Add to staked amount
  stakeData.stakedAmount += amount;
  stakeData.lastStakeTime = Date.now();
  stakeData.history.push({
    type: 'stake',
    amount,
    timestamp: Date.now(),
    totalStaked: stakeData.stakedAmount,
  });

  // Update total staked
  stakingStats.totalStaked += amount;

  // Check if eligible to become validator
  if (stakeData.stakedAmount >= STAKING_CONFIG.VALIDATOR_REQUIREMENT && !validators.has(userAddress)) {
    await becomeValidator(userAddress, stakeData.stakedAmount);
  }

  return {
    success: true,
    stakedAmount: stakeData.stakedAmount,
    totalStaked: stakingStats.totalStaked,
  };
}

/**
 * Request unstaking
 */
async function requestUnstake(userAddress, amount) {
  const stakeData = stakes.get(userAddress);

  if (!stakeData || stakeData.stakedAmount < amount) {
    throw new Error('Insufficient staked amount');
  }

  // Create pending unstake request
  stakeData.pendingUnstake = {
    amount: amount,
    requestTime: Date.now(),
    unlockTime: Date.now() + STAKING_CONFIG.UNSTAKE_LOCK_PERIOD,
    completed: false,
  };

  // Reduce staked amount
  stakeData.stakedAmount -= amount;
  stakingStats.totalStaked -= amount;
  stakeData.history.push({
    type: 'unstake_requested',
    amount,
    timestamp: Date.now(),
    pendingUnlockTime: stakeData.pendingUnstake.unlockTime,
    totalStaked: stakeData.stakedAmount,
  });

  // Remove validator status if below requirement
  if (stakeData.stakedAmount < STAKING_CONFIG.VALIDATOR_REQUIREMENT) {
    validators.delete(userAddress);
    stakingStats.validatorCount--;
  }

  return {
    success: true,
    unlockTime: stakeData.pendingUnstake.unlockTime,
    message: 'Unstake request submitted. Tokens will be available after lock period.',
  };
}

/**
 * Complete unstake after lock period
 */
async function completeUnstake(userAddress) {
  const stakeData = stakes.get(userAddress);

  if (!stakeData || !stakeData.pendingUnstake) {
    throw new Error('No pending unstake request');
  }

  const pending = stakeData.pendingUnstake;

  if (Date.now() < pending.unlockTime) {
    throw new Error('Unstake lock period not yet complete');
  }

  if (pending.completed) {
    throw new Error('Unstake already completed');
  }

  // Mark as completed
  pending.completed = true;
  stakeData.pendingUnstake = null;

  // Calculate rewards to claim
  const pendingRewards = calculatePendingRewards(stakeData);
  stakeData.history.push({
    type: 'unstake_completed',
    amount: pending.amount,
    timestamp: Date.now(),
    totalStaked: stakeData.stakedAmount,
  });

  return {
    success: true,
    amount: pending.amount,
    rewards: pendingRewards,
    message: 'Unstake completed successfully',
  };
}

/**
 * Claim staking rewards
 */
async function claimRewards(userAddress) {
  const stakeData = stakes.get(userAddress);

  if (!stakeData || stakeData.stakedAmount === 0) {
    throw new Error('No staked amount found');
  }

  const pendingRewards = calculatePendingRewards(stakeData);

  if (pendingRewards === 0) {
    throw new Error('No pending rewards to claim');
  }

  // Update stake data
  stakeData.rewardsClaimed += pendingRewards;
  stakeData.lastClaimTime = Date.now();
  stakeData.history.push({
    type: 'claim_rewards',
    amount: pendingRewards,
    timestamp: Date.now(),
    totalRewardsClaimed: stakeData.rewardsClaimed,
  });

  // Update stats
  stakingStats.totalRewardsDistributed += pendingRewards;

  // Get or create rewards record
  let rewardData = rewards.get(userAddress);
  if (!rewardData) {
    rewardData = { pending: 0, claimed: 0 };
    rewards.set(userAddress, rewardData);
  }
  rewardData.claimed += pendingRewards;
  rewardData.pending = 0;

  return {
    success: true,
    amount: pendingRewards,
    totalClaimed: stakeData.rewardsClaimed,
  };
}

/**
 * Calculate pending rewards
 */
function calculatePendingRewards(stakeData) {
  if (!stakeData || stakeData.stakedAmount === 0) {
    return 0;
  }

  const timeStaked = Date.now() - stakeData.lastClaimTime;
  const daysStaked = timeStaked / (24 * 60 * 60 * 1000);

  // Calculate daily reward: (stakedAmount * APY / 100) / 365
  const dailyReward = (stakeData.stakedAmount * STAKING_CONFIG.apy / 100) / 365;
  const pendingReward = dailyReward * daysStaked;

  return Math.floor(pendingReward);
}

/**
 * Become a validator
 */
async function becomeValidator(userAddress, stakeAmount) {
  const validatorData = {
    address: userAddress,
    stakeAmount: stakeAmount,
    commissionRate: STAKING_CONFIG.COMMISSION_RATE,
    totalBlocksProduced: 0,
    totalRewardsEarned: 0,
    uptime: 100,
    status: 'active',
    joinedAt: Date.now(),
  };

  validators.set(userAddress, validatorData);
  stakingStats.validatorCount++;

  const stakeData = stakes.get(userAddress);
  if (stakeData) {
    stakeData.history.push({
      type: 'validator_promoted',
      stakeAmount,
      timestamp: Date.now(),
      status: 'active',
    });
  }

  return {
    success: true,
    message: 'You are now a validator',
    validatorData,
  };
}

/**
 * Get stake info for user
 */
function getStakeInfo(userAddress) {
  const stakeData = stakes.get(userAddress);

  if (!stakeData) {
    return {
      stakedAmount: 0,
      pendingRewards: 0,
      pendingUnstake: null,
      isValidator: false,
    };
  }

  const isValidator = validators.has(userAddress);
  const pendingRewards = calculatePendingRewards(stakeData);

  return {
    stakedAmount: stakeData.stakedAmount,
    pendingRewards: pendingRewards,
    pendingUnstake: stakeData.pendingUnstake,
    rewardsClaimed: stakeData.rewardsClaimed,
    isValidator: isValidator,
    lastClaimTime: stakeData.lastClaimTime,
    history: stakeData.history || [],
  };
}

function getStakeHistory(userAddress) {
  const stakeData = stakes.get(userAddress);
  return stakeData ? stakeData.history || [] : [];
}

/**
 * Get all validators
 */
function getValidators() {
  return Array.from(validators.values());
}

/**
 * Get staking statistics
 */
function getStakingStats() {
  return {
    ...stakingStats,
    apy: STAKING_CONFIG.apy,
    minStake: STAKING_CONFIG.MIN_STAKE_AMOUNT,
    validatorRequirement: STAKING_CONFIG.VALIDATOR_REQUIREMENT,
    unstakeLockPeriod: STAKING_CONFIG.UNSTAKE_LOCK_PERIOD,
  };
}

/**
 * Get staking leaderboard
 */
function getStakingLeaderboard(limit = 10) {
  const allStakes = Array.from(stakes.values())
    .filter(s => s.stakedAmount > 0)
    .sort((a, b) => b.stakedAmount - a.stakedAmount)
    .slice(0, limit);

  return allStakes.map((stake, index) => ({
    rank: index + 1,
    address: stake.address,
    stakedAmount: stake.stakedAmount,
    rewardsClaimed: stake.rewardsClaimed,
    isValidator: validators.has(stake.address),
  }));
}

/**
 * Update APY (admin only)
 */
function updateAPY(newAPY) {
  if (newAPY < 1 || newAPY > 100) {
    throw new Error('APY must be between 1 and 100');
  }
  STAKING_CONFIG.apy = newAPY;
  return { success: true, apy: newAPY };
}

/**
 * Process daily rewards distribution
 */
async function processRewardsDistribution() {
  const distribution = [];

  for (const [address, stakeData] of stakes) {
    if (stakeData.stakedAmount > 0) {
      const rewards = calculatePendingRewards(stakeData);

      if (rewards > 0) {
        stakeData.rewardsClaimed += rewards;
        stakeData.lastClaimTime = Date.now();

        // Update rewards record
        let rewardData = rewards.get(address);
        if (!rewardData) {
          rewardData = { pending: 0, claimed: 0 };
          rewards.set(address, rewardData);
        }
        rewardData.pending += rewards;

        distribution.push({
          address,
          amount: rewards,
        });

        stakingStats.totalRewardsDistributed += rewards;
      }
    }
  }

  return distribution;
}

module.exports = {
  stakeTokens,
  requestUnstake,
  completeUnstake,
  claimRewards,
  getStakeInfo,
  getStakeHistory,
  getValidators,
  getStakingStats,
  getStakingLeaderboard,
  updateAPY,
  processRewardsDistribution,
  STAKING_CONFIG,
};
