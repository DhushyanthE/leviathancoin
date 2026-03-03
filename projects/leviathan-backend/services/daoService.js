/**
 * DAO (Decentralized Autonomous Organization) Service for LeviathanCoin
 * Implements on-chain governance with voting mechanisms
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// In-memory storage (replace with database in production)
const proposals = new Map(); // proposalId -> proposal data
const votes = new Map(); // proposalId -> { address -> vote }
const daoStats = {
  totalProposals: 0,
  activeProposals: 0,
  totalVotes: 0,
  proposalsExecuted: 0,
};

// DAO Configuration
const DAO_CONFIG = {
  PROPOSAL_THRESHOLD: 100, // Minimum tokens to create proposal
  VOTE_THRESHOLD: 1, // Minimum tokens to vote
  VOTING_PERIOD: 7 * 24 * 60 * 60 * 1000, // 7 days
  EXECUTION_DELAY: 2 * 24 * 60 * 60 * 1000, // 2 days after voting ends
  QUORUM_REQUIREMENT: 0.3, // 30% of staked tokens must vote
  PASS_THRESHOLD: 0.51, // 51% to pass
  MAX_PROPOSALS: 100,
};

/**
 * Create a new proposal
 */
async function createProposal(
  creatorAddress,
  title,
  description,
  proposalType,
  payload,
  stakingService
) {
  // Check if creator has sufficient stake
  const stakeInfo = stakingService.getStakeInfo(creatorAddress);

  if (stakeInfo.stakedAmount < DAO_CONFIG.PROPOSAL_THRESHOLD) {
    throw new Error(`Minimum ${DAO_CONFIG.PROPOSAL_THRESHOLD} tokens staked required to create proposal`);
  }

  // Check max proposals limit
  if (daoStats.totalProposals >= DAO_CONFIG.MAX_PROPOSALS) {
    throw new Error('Maximum number of proposals reached');
  }

  const proposalId = uuidv4();
  const proposal = {
    id: proposalId,
    creator: creatorAddress,
    title,
    description,
    type: proposalType, // 'parameter', 'upgrade', 'treasury', 'governance'
    payload: payload, // Actual changes to apply
    status: 'active', // active, passed, failed, executed, cancelled
    createdAt: Date.now(),
    votingStart: Date.now(),
    votingEnd: Date.now() + DAO_CONFIG.VOTING_PERIOD,
    executionDelay: Date.now() + DAO_CONFIG.VOTING_PERIOD + DAO_CONFIG.EXECUTION_DELAY,
    votesFor: 0,
    votesAgainst: 0,
    totalVotingPower: 0,
    voters: new Set(),
    executedAt: null,
    executionResult: null,
  };

  proposals.set(proposalId, proposal);
  daoStats.totalProposals++;
  daoStats.activeProposals++;

  return {
    success: true,
    proposalId,
    proposal,
    message: 'Proposal created successfully',
  };
}

/**
 * Cast a vote on a proposal
 */
async function voteOnProposal(
  voterAddress,
  proposalId,
  support,
  stakingService
) {
  const proposal = proposals.get(proposalId);

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  // Check if voting is still active
  if (Date.now() > proposal.votingEnd) {
    throw new Error('Voting period has ended');
  }

  if (proposal.status !== 'active') {
    throw new Error('Proposal is no longer accepting votes');
  }

  // Get voter's staked amount
  const stakeInfo = stakingService.getStakeInfo(voterAddress);

  if (stakeInfo.stakedAmount < DAO_CONFIG.VOTE_THRESHOLD) {
    throw new Error(`Minimum ${DAO_CONFIG.VOTE_THRESHOLD} tokens staked required to vote`);
  }

  const votingPower = stakeInfo.stakedAmount;

  // Get previous vote if exists
  const proposalVotes = votes.get(proposalId) || new Map();
  const previousVote = proposalVotes.get(voterAddress);

  // Update vote counts
  if (previousVote) {
    if (previousVote.support) {
      proposal.votesFor -= previousVote.votingPower;
    } else {
      proposal.votesAgainst -= previousVote.votingPower;
    }
    proposal.totalVotingPower -= previousVote.votingPower;
    proposal.voters.delete(voterAddress);
  }

  // Apply new vote
  if (support) {
    proposal.votesFor += votingPower;
  } else {
    proposal.votesAgainst += votingPower;
  }
  proposal.totalVotingPower += votingPower;
  proposal.voters.add(voterAddress);

  // Store vote
  proposalVotes.set(voterAddress, {
    support,
    votingPower,
    timestamp: Date.now(),
  });
  votes.set(proposalId, proposalVotes);

  daoStats.totalVotes++;

  // Check if proposal should be processed
  await checkProposalStatus(proposal);

  return {
    success: true,
    votesFor: proposal.votesFor,
    votesAgainst: proposal.votesAgainst,
    totalVotingPower: proposal.totalVotingPower,
    voterCount: proposal.voters.size,
  };
}

/**
 * Check and update proposal status
 */
async function checkProposalStatus(proposal) {
  // Only check active proposals
  if (proposal.status !== 'active') {
    return;
  }

  // Check if voting period has ended
  if (Date.now() > proposal.votingEnd) {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;

    // Check quorum requirement
    const hasQuorum = totalVotes > 0; // Simplified - would need total staked

    // Check pass threshold
    const passRatio = proposal.votesFor / totalVotes;

    if (hasQuorum && passRatio >= DAO_CONFIG.PASS_THRESHOLD) {
      proposal.status = 'passed';
      daoStats.activeProposals--;
    } else {
      proposal.status = 'failed';
      daoStats.activeProposals--;
    }
  }
}

/**
 * Execute a passed proposal
 */
async function executeProposal(proposalId) {
  const proposal = proposals.get(proposalId);

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.status !== 'passed') {
    throw new Error('Proposal must be in passed status to execute');
  }

  if (Date.now() < proposal.executionDelay) {
    throw new Error('Execution delay period not yet complete');
  }

  // Execute the proposal based on type
  let result = null;

  try {
    switch (proposal.type) {
      case 'parameter':
        result = await executeParameterChange(proposal.payload);
        break;
      case 'upgrade':
        result = await executeUpgrade(proposal.payload);
        break;
      case 'treasury':
        result = await executeTreasury(proposal.payload);
        break;
      case 'governance':
        result = await executeGovernanceChange(proposal.payload);
        break;
      default:
        throw new Error('Unknown proposal type');
    }

    proposal.status = 'executed';
    proposal.executedAt = Date.now();
    proposal.executionResult = result;
    daoStats.proposalsExecuted++;

    return {
      success: true,
      result,
      message: 'Proposal executed successfully',
    };
  } catch (error) {
    proposal.status = 'failed';
    throw new Error(`Execution failed: ${error.message}`);
  }
}

/**
 * Execute parameter change proposal
 */
async function executeParameterChange(payload) {
  const { parameter, value } = payload;

  // Apply parameter changes
  const changes = {};
  changes[parameter] = value;

  return {
    type: 'parameter_change',
    changes,
    executedAt: Date.now(),
  };
}

/**
 * Execute upgrade proposal
 */
async function executeUpgrade(payload) {
  const { version, contractAddress, upgradeData } = payload;

  return {
    type: 'upgrade',
    newVersion: version,
    upgradeData,
    executedAt: Date.now(),
  };
}

/**
 * Execute treasury proposal
 */
async function executeTreasury(payload) {
  const { recipient, amount, token } = payload;

  return {
    type: 'treasury',
    recipient,
    amount,
    token,
    executedAt: Date.now(),
  };
}

/**
 * Execute governance change proposal
 */
async function executeGovernanceChange(payload) {
  const { votingPeriod, quorum, threshold } = payload;

  // Update DAO configuration
  if (votingPeriod) DAO_CONFIG.VOTING_PERIOD = votingPeriod;
  if (quorum) DAO_CONFIG.QUORUM_REQUIREMENT = quorum;
  if (threshold) DAO_CONFIG.PASS_THRESHOLD = threshold;

  return {
    type: 'governance_change',
    changes: { votingPeriod, quorum, threshold },
    executedAt: Date.now(),
  };
}

/**
 * Cancel a proposal (creator only)
 */
async function cancelProposal(proposalId, cancellerAddress) {
  const proposal = proposals.get(proposalId);

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.creator !== cancellerAddress) {
    throw new Error('Only proposal creator can cancel');
  }

  if (proposal.status !== 'active') {
    throw new Error('Can only cancel active proposals');
  }

  proposal.status = 'cancelled';
  daoStats.activeProposals--;

  return {
    success: true,
    message: 'Proposal cancelled successfully',
  };
}

/**
 * Get proposal by ID
 */
function getProposal(proposalId) {
  const proposal = proposals.get(proposalId);

  if (!proposal) {
    return null;
  }

  return {
    ...proposal,
    voters: Array.from(proposal.voters),
    voterCount: proposal.voters.size,
  };
}

/**
 * Get all proposals with filters
 */
function getProposals(filters = {}) {
  let allProposals = Array.from(proposals.values());

  // Apply filters
  if (filters.status) {
    allProposals = allProposals.filter(p => p.status === filters.status);
  }

  if (filters.type) {
    allProposals = allProposals.filter(p => p.type === filters.type);
  }

  if (filters.creator) {
    allProposals = allProposals.filter(p => p.creator === filters.creator);
  }

  // Sort by creation date (newest first)
  allProposals.sort((a, b) => b.createdAt - a.createdAt);

  return allProposals.map(p => ({
    ...p,
    voters: Array.from(p.voters),
    voterCount: p.voters.size,
  }));
}

/**
 * Get voter's vote on a proposal
 */
function getVote(proposalId, voterAddress) {
  const proposalVotes = votes.get(proposalId);

  if (!proposalVotes) {
    return null;
  }

  return proposalVotes.get(voterAddress) || null;
}

/**
 * Get DAO statistics
 */
function getDAOStats() {
  return {
    ...daoStats,
    config: {
      proposalThreshold: DAO_CONFIG.PROPOSAL_THRESHOLD,
      voteThreshold: DAO_CONFIG.VOTE_THRESHOLD,
      votingPeriod: DAO_CONFIG.VOTING_PERIOD,
      executionDelay: DAO_CONFIG.EXECUTION_DELAY,
      quorumRequirement: DAO_CONFIG.QUORUM_REQUIREMENT,
      passThreshold: DAO_CONFIG.PASS_THRESHOLD,
    },
  };
}

/**
 * Get active proposals
 */
function getActiveProposals() {
  return getProposals({ status: 'active' });
}

/**
 * Get proposal results
 */
function getProposalResults(proposalId) {
  const proposal = proposals.get(proposalId);

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const passRatio = totalVotes > 0 ? proposal.votesFor / totalVotes : 0;

  return {
    proposalId,
    status: proposal.status,
    votesFor: proposal.votesFor,
    votesAgainst: proposal.votesAgainst,
    totalVotes,
    voterCount: proposal.voters.size,
    passRatio,
    passed: passRatio >= DAO_CONFIG.PASS_THRESHOLD,
    votingEnd: proposal.votingEnd,
    executionDelay: proposal.executionDelay,
  };
}

/**
 * Delegate voting power
 */
function delegateVote(fromAddress, toAddress) {
  // Store delegation (simplified - would need more complex implementation)
  const delegations = new Map();
  delegations.set(fromAddress, toAddress);

  return {
    success: true,
    from: fromAddress,
    to: toAddress,
    message: 'Vote delegation recorded',
  };
}

module.exports = {
  createProposal,
  voteOnProposal,
  executeProposal,
  cancelProposal,
  getProposal,
  getProposals,
  getVote,
  getDAOStats,
  getActiveProposals,
  getProposalResults,
  delegateVote,
  DAO_CONFIG,
};
