from algopy import (
    Account,
    ARC4Contract,
    BoxMap,
    Bytes,
    Global,
    GlobalState,
    String,
    Txn,
    UInt64,
    arc4,
    itxn,
    op,
)
from algopy.arc4 import abimethod


# Structs for advanced Smart Contract features
class TimeLockEscrow(arc4.Struct):
    amount: arc4.UInt64
    unlock_time: arc4.UInt64
    receiver: arc4.Address
    sender: arc4.Address


class LeviathanToken(ARC4Contract):
    """
    Leviathan Token - Advanced DeFi Token Contract on Algorand.

    Features:
    - Mining (minting) function for creating new tokens
    - NFT minting capability
    - Decentralized governance (DAO)
    - Immutability for Supply Chain / Healthcare Data
    - Staking & Validation consensus
    - Automated Time-Locked Escrows
    - Quantum-resistant security
    """

    def __init__(self) -> None:
        # Base Token State
        self.total_supply = UInt64(10_000_000_000_000_000)
        self.balances = BoxMap(Account, UInt64)

        # [1. Decentralization] - Decentralized multisig/DAO approach
        self.is_decentralized = GlobalState(UInt64(0))
        self.admin = GlobalState(Account)
        self.dao_proposals = BoxMap(UInt64, UInt64)
        self.proposal_count = GlobalState(UInt64(0))

        # [2. Immutability] - Supply Chain / Healthcare Data Registry
        self.immutable_records = BoxMap(Bytes, String)

        # [3. Consensus Mechanisms] - Staking & Validation
        self.staked_balances = BoxMap(Account, UInt64)
        self.total_staked = GlobalState(UInt64(0))
        self.staking_rewards = BoxMap(Account, UInt64)

        # [4. Smart Contracts] - Automated Time-Locked Escrows
        self.escrows = BoxMap(UInt64, TimeLockEscrow)
        self.escrow_nonce = GlobalState(UInt64(0))

        # NFT Management
        self.nft_owners = BoxMap(UInt64, Account)
        self.nft_minted = BoxMap(UInt64, UInt64)

    @abimethod(create="require")
    def create_token(
        self,
        max_supply: arc4.UInt64,
        unit_name: String,
        asset_name: String,
        url: String,
    ) -> None:
        """Initialize the Leviathan Ecosystem with token and metadata."""
        self.admin.value = Txn.sender
        self.total_supply = max_supply.as_uint64()
        self.balances[Txn.sender] = self.total_supply

        itxn.AssetConfig(
            total=self.total_supply,
            decimals=6,
            unit_name=unit_name,
            asset_name=asset_name,
            url=url,
            default_frozen=False,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()

    # [1] DECENTRALIZATION - DAO Governance
    @abimethod()
    def renounce_central_authority(self) -> None:
        """Permanently disables central admin control."""
        assert Txn.sender == self.admin.value, "Only admin can renounce authority"
        self.is_decentralized.value = UInt64(1)
        self.admin.value = Global.zero_address
        op.log(Bytes(b"LEVIATHAN_IS_NOW_FULLY_DECENTRALIZED"))

    @abimethod()
    def create_proposal(self, description: String) -> UInt64:
        """Create a new DAO proposal for network upgrades."""
        proposal_id = self.proposal_count.value
        self.dao_proposals[proposal_id] = UInt64(0)
        self.proposal_count.value = proposal_id + 1
        return proposal_id

    @abimethod()
    def vote_on_proposal(self, proposal_id: UInt64) -> None:
        """Validators use their staked weight to vote on network upgrades."""
        voter_weight = self.staked_balances.get(Txn.sender, default=UInt64(0))
        assert voter_weight > 0, "Must be a staked validator to vote"

        current_votes = self.dao_proposals.get(proposal_id, default=UInt64(0))
        self.dao_proposals[proposal_id] = current_votes + voter_weight

    # [2] IMMUTABILITY & TRANSPARENCY
    @abimethod()
    def record_immutable_data(self, document_hash: Bytes, data_uri: String) -> None:
        """Records supply chain or healthcare data immutably."""
        assert document_hash not in self.immutable_records, "Record already exists"
        self.immutable_records[document_hash] = data_uri
        op.log(Bytes(b"IMMUTABLE_RECORD_CREATED"))

    @abimethod()
    def get_immutable_record(self, document_hash: Bytes) -> String:
        """Retrieve immutable data by its hash."""
        assert document_hash in self.immutable_records, "Record not found"
        return self.immutable_records[document_hash]

    # [3] CONSENSUS MECHANISMS - Staking
    @abimethod()
    def stake_tokens(self, amount: arc4.UInt64) -> None:
        """Users lock tokens to participate in network consensus."""
        current_bal = self.balances.get(Txn.sender, default=UInt64(0))
        assert current_bal.as_uint64() >= amount.as_uint64(), "Insufficient balance"

        self.balances[Txn.sender] = current_bal.as_uint64() - amount.as_uint64()
        current_stake = self.staked_balances.get(Txn.sender, default=UInt64(0))
        self.staked_balances[Txn.sender] = current_stake + amount.as_uint64()

        self.total_staked.value = self.total_staked.value + amount.as_uint64()

    @abimethod()
    def unstake_tokens(self, amount: arc4.UInt64) -> None:
        """Users can unlock their staked tokens."""
        current_stake = self.staked_balances.get(Txn.sender, default=UInt64(0))
        assert current_stake >= amount.as_uint64(), "Cannot unstake more than staked"

        self.staked_balances[Txn.sender] = current_stake - amount.as_uint64()
        current_bal = self.balances.get(Txn.sender, default=UInt64(0))
        self.balances[Txn.sender] = current_bal + amount.as_uint64()

        self.total_staked.value = self.total_staked.value - amount.as_uint64()

    @abimethod()
    def claim_staking_rewards(self) -> None:
        """Claim accumulated staking rewards."""
        rewards = self.staking_rewards.get(Txn.sender, default=UInt64(0))
        assert rewards > 0, "No rewards to claim"

        current_bal = self.balances.get(Txn.sender, default=UInt64(0))
        self.balances[Txn.sender] = current_bal + rewards
        self.staking_rewards[Txn.sender] = UInt64(0)

    # [4] SMART CONTRACTS - Time-Locked Escrows
    @abimethod()
    def create_automated_escrow(
        self, receiver: arc4.Address, amount: arc4.UInt64, lock_duration: arc4.UInt64
    ) -> UInt64:
        """Creates a trustless, self-executing escrow agreement."""
        sender_bal = self.balances.get(Txn.sender, default=UInt64(0))
        assert sender_bal.as_uint64() >= amount.as_uint64(), "Insufficient balance"

        self.balances[Txn.sender] = sender_bal.as_uint64() - amount.as_uint64()

        unlock_time = Global.latest_timestamp + lock_duration.as_uint64()

        escrow_id = self.escrow_nonce.value
        self.escrows[escrow_id] = TimeLockEscrow(
            amount, arc4.UInt64(unlock_time), receiver, arc4.Address(Txn.sender)
        )

        self.escrow_nonce.value = escrow_id + 1
        return UInt64(escrow_id)

    @abimethod()
    def execute_automated_settlement(self, escrow_id: UInt64) -> None:
        """Settle the escrow once the time lock expires."""
        assert escrow_id in self.escrows, "Escrow not found"
        escrow = self.escrows[escrow_id]

        assert (
            Global.latest_timestamp >= escrow.unlock_time.as_uint64()
        ), "Time lock not expired"

        receiver_account = escrow.receiver.native
        current_bal = self.balances.get(receiver_account, default=UInt64(0))
        self.balances[receiver_account] = current_bal + escrow.amount.as_uint64()

        del self.escrows[escrow_id]

    @abimethod()
    def cancel_escrow(self, escrow_id: UInt64) -> None:
        """Cancel an escrow and return funds to sender."""
        assert escrow_id in self.escrows, "Escrow not found"
        escrow = self.escrows[escrow_id]

        assert escrow.sender.native == Txn.sender, "Only sender can cancel"
        assert (
            Global.latest_timestamp < escrow.unlock_time.as_uint64()
        ), "Cannot cancel after unlock"

        sender_account = escrow.sender.native
        current_bal = self.balances.get(sender_account, default=UInt64(0))
        self.balances[sender_account] = current_bal + escrow.amount.as_uint64()

        del self.escrows[escrow_id]

    # [6] SECURITY - Quantum-Resistant Verification
    @abimethod()
    def verify_secure_payload(self, raw_data: Bytes, expected_hash: Bytes) -> arc4.Bool:
        """Uses SHA-256 to verify data integrity."""
        calculated_hash = op.sha256(raw_data)
        is_secure = calculated_hash == expected_hash
        return arc4.Bool(is_secure)

    # BASE TOKEN FUNCTIONS
    @abimethod()
    def transfer(self, receiver: arc4.Address, amount: arc4.UInt64) -> None:
        """Standard peer-to-peer transfer."""
        sender_bal = self.balances.get(Txn.sender, default=UInt64(0))
        assert sender_bal.as_uint64() >= amount.as_uint64(), "Insufficient balance"

        self.balances[Txn.sender] = sender_bal.as_uint64() - amount.as_uint64()
        receiver_bal = self.balances.get(receiver.native, default=UInt64(0))
        self.balances[receiver.native] = receiver_bal.as_uint64() + amount.as_uint64()

    @abimethod()
    def get_balance(self, account: arc4.Address) -> arc4.UInt64:
        """Get account balance."""
        balance = self.balances.get(account.native, default=UInt64(0))
        return arc4.UInt64(balance)

    @abimethod()
    def get_staked_balance(self, account: arc4.Address) -> arc4.UInt64:
        """Get staked balance."""
        staked = self.staked_balances.get(account.native, default=UInt64(0))
        return arc4.UInt64(staked)

    @abimethod()
    def get_total_staked(self) -> arc4.UInt64:
        """Get total staked."""
        return arc4.UInt64(self.total_staked.value)

    # MINING & NFT
    @abimethod()
    def mine(self, miner: arc4.Address) -> arc4.UInt64:
        """Mining function - mints new tokens."""
        reward = arc4.UInt64(1000000)
        current_bal = self.balances.get(miner.native, default=UInt64(0))
        self.balances[miner.native] = current_bal.as_uint64() + reward.as_uint64()
        return reward

    @abimethod()
    def mint_nft(
        self,
        minter: arc4.Address,
        nft_name: String,
        nft_url: String,
    ) -> arc4.UInt64:
        """Mint a new NFT."""
        result = itxn.AssetConfig(
            total=1,
            decimals=0,
            unit_name="LEVI",
            asset_name=nft_name,
            url=nft_url,
            default_frozen=False,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()

        nft_id = result.created_asset.id

        self.nft_owners[UInt64(nft_id)] = minter.native
        self.nft_minted[UInt64(nft_id)] = UInt64(1)

        itxn.AssetTransfer(
            xfer_asset=nft_id,
            asset_receiver=minter.native,
            asset_amount=1,
        ).submit()

        return arc4.UInt64(nft_id)

    @abimethod()
    def transfer_nft(self, receiver: arc4.Address, nft_id: arc4.UInt64) -> None:
        """Transfer an NFT to another account."""
        owner = self.nft_owners.get(nft_id.as_uint64(), default=Global.zero_address)
        assert owner == Txn.sender, "You do not own this NFT"

        self.nft_owners[nft_id.as_uint64()] = receiver.native

        itxn.AssetTransfer(
            xfer_asset=nft_id.as_uint64(),
            asset_receiver=receiver.native,
            asset_amount=1,
        ).submit()

    # EMERGENCY
    @abimethod()
    def emergency_withdraw(self) -> None:
        """Emergency function - only works when not decentralized."""
        assert self.is_decentralized.value == UInt64(0), "Contract is decentralized"
        assert Txn.sender == self.admin.value, "Only admin can emergency withdraw"

        admin_balance = self.balances.get(self.admin.value, default=UInt64(0))
        itxn.Payment(
            receiver=self.admin.value,
            amount=admin_balance,
            fee=1000,
        ).submit()
