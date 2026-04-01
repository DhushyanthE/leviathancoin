from algopy import (
    ARC4Contract,
    UInt64,
    Account,
    Global,
    Txn,
    GlobalState,
    BoxMap,
    arc4,
    subroutine,
    itxn,
    String,
    Bytes,
    op
)

# Struct for Automated Time-Locked Escrows
class TimeLockEscrow(arc4.Struct):
    amount: arc4.UInt64
    unlock_time: arc4.UInt64
    receiver: arc4.Address

class LeviathanToken(ARC4Contract):
    def __init__(self) -> None:
        # Base Token State (10 Quadrillion base units = 10 Billion tokens with 6 decimals)
        self.total_supply = UInt64(10_000_000_000_000_000)
        self.max_tax = UInt64(5)
        
        self.admin = GlobalState(Account)
        self.tax_wallet = GlobalState(Account)
        self.is_decentralized = GlobalState(UInt64(0)) 
        
        self.transfer_tax_rate = GlobalState(UInt64(0))
        self.max_transaction_amount = GlobalState(UInt64(0))
        self.max_wallet_amount = GlobalState(UInt64(0))
        
        self.trading_enabled = GlobalState(UInt64(0))
        self.cooldown_enabled = GlobalState(UInt64(1))
        self.trade_cooldown = GlobalState(UInt64(5))
        
        # DAO State
        self.proposal_count = GlobalState(UInt64(0))
        self.total_staked = GlobalState(UInt64(0))
        self.escrow_nonce = GlobalState(UInt64(0))
        
        # Limitless Box Storage
        self.balances = BoxMap(Account, UInt64)
        self.blacklisted = BoxMap(Account, UInt64)
        self.amm_pools = BoxMap(Account, UInt64)
        self.last_trade = BoxMap(Account, UInt64)
        
        # Utility Box Storage
        self.immutable_records = BoxMap(Bytes, String)
        self.staked_balances = BoxMap(Account, UInt64)
        self.escrows = BoxMap(UInt64, TimeLockEscrow)
        
        # DAO Box Storage
        self.proposal_desc = BoxMap(UInt64, String)
        self.proposal_yes = BoxMap(UInt64, UInt64)
        self.proposal_no = BoxMap(UInt64, UInt64)

    @arc4.abimethod(create="require")
    def create(self) -> None:
        """Initialize the Leviathan Ecosystem"""
        self.admin.value = Txn.sender
        self.tax_wallet.value = Txn.sender
        self.max_transaction_amount.value = (self.total_supply * UInt64(2)) // UInt64(100)
        self.max_wallet_amount.value = (self.total_supply * UInt64(3)) // UInt64(100)
        
        # Mint all tokens to creator initially
        self.balances[Txn.sender] = self.total_supply

    # ==========================================
    # [1] DECENTRALIZATION
    # ==========================================
    @arc4.abimethod
    def renounce_central_authority(self) -> None:
        """Permanently disables central admin control."""
        assert Txn.sender == self.admin.value, "Only admin"
        self.is_decentralized.value = UInt64(1)
        self.admin.value = Global.zero_address

    # ==========================================
    # [2] IMMUTABILITY & [6] SECURITY
    # ==========================================
    @arc4.abimethod
    def record_immutable_data(self, document_hash: Bytes, data_uri: String) -> None:
        """Records supply chain or healthcare data immutably."""
        assert document_hash not in self.immutable_records, "Record already exists"
        self.immutable_records[document_hash] = data_uri

    @arc4.abimethod
    def verify_secure_payload(self, raw_data: Bytes, expected_hash: Bytes) -> bool:
        """Uses SHA-256 on-chain to verify data integrity."""
        return op.sha256(raw_data) == expected_hash

    # ==========================================
    # [3] CONSENSUS & DAO GOVERNANCE
    # ==========================================
    @arc4.abimethod
    def stake_tokens(self, amount: UInt64) -> None:
        current_bal = self.balances.get(Txn.sender, default=UInt64(0))
        assert current_bal >= amount, "Insufficient balance"
        
        self.balances[Txn.sender] = current_bal - amount
        current_stake = self.staked_balances.get(Txn.sender, default=UInt64(0))
        self.staked_balances[Txn.sender] = current_stake + amount
        self.total_staked.value += amount

    @arc4.abimethod
    def create_proposal(self, description: String) -> UInt64:
        assert Txn.sender == self.admin.value, "Only admin"
        current_id = self.proposal_count.value
        self.proposal_desc[current_id] = description
        self.proposal_yes[current_id] = UInt64(0)
        self.proposal_no[current_id] = UInt64(0)
        self.proposal_count.value = current_id + 1
        return current_id

    @arc4.abimethod
    def vote_on_proposal(self, proposal_id: UInt64, vote_yes: bool) -> None:
        assert proposal_id < self.proposal_count.value, "Invalid proposal"
        voting_weight = self.staked_balances.get(Txn.sender, default=UInt64(0))
        assert voting_weight > 0, "Must be staked to vote"
        
        if vote_yes:
            current = self.proposal_yes.get(proposal_id, default=UInt64(0))
            self.proposal_yes[proposal_id] = current + voting_weight
        else:
            current = self.proposal_no.get(proposal_id, default=UInt64(0))
            self.proposal_no[proposal_id] = current + voting_weight

    # ==========================================
    # [4] SMART CONTRACTS & [7] FASTER SETTLEMENTS
    # ==========================================
    @arc4.abimethod
    def create_automated_escrow(self, receiver: Account, amount: UInt64, lock_duration: UInt64) -> UInt64:
        sender_bal = self.balances.get(Txn.sender, default=UInt64(0))
        assert sender_bal >= amount, "Insufficient balance"
        
        self.balances[Txn.sender] = sender_bal - amount
        unlock_time = Global.latest_timestamp + lock_duration
        
        escrow_id = self.escrow_nonce.value
        self.escrows[escrow_id] = TimeLockEscrow(
            arc4.UInt64(amount), 
            arc4.UInt64(unlock_time), 
            arc4.Address(receiver)
        )
        self.escrow_nonce.value = escrow_id + 1
        return escrow_id

    @arc4.abimethod
    def execute_automated_settlement(self, escrow_id: UInt64) -> None:
        assert escrow_id in self.escrows, "Escrow not found"
        escrow = self.escrows[escrow_id].copy()
        assert Global.latest_timestamp >= escrow.unlock_time.native, "Time lock active"
        
        receiver_account = escrow.receiver.native
        current_bal = self.balances.get(receiver_account, default=UInt64(0))
        self.balances[receiver_account] = current_bal + escrow.amount.native
        
        del self.escrows[escrow_id] # Clean up state

    # ==========================================
    # NATIVE NFT ENGINE
    # ==========================================
    @arc4.abimethod
    def mint_vip_nft(self, asset_name: String, unit_name: String, url: String) -> UInt64:
        assert Txn.sender == self.admin.value, "Only admin"
        nft_txn = itxn.AssetConfig(
            total=1, decimals=0, default_frozen=False,
            asset_name=asset_name, unit_name=unit_name, url=url,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=0
        ).submit()
        return nft_txn.created_asset.id

    # ==========================================
    # CORE TOKEN LOGIC
    # ==========================================
    @arc4.abimethod
    def transfer(self, receiver: Account, amount: UInt64) -> None:
        self._transfer(Txn.sender, receiver, amount)

    @subroutine
    def _transfer(self, sender: Account, receiver: Account, amount: UInt64) -> None:
        assert sender != Global.zero_address and receiver != Global.zero_address, "Invalid address"
        from_balance = self.balances.get(sender, default=UInt64(0))
        assert from_balance >= amount, "Insufficient balance"
        
        assert self.blacklisted.get(sender, default=UInt64(0)) == 0, "Sender blacklisted"
        assert self.blacklisted.get(receiver, default=UInt64(0)) == 0, "Receiver blacklisted"
        
        is_receiver_amm = self.amm_pools.get(receiver, default=UInt64(0)) == 1
        is_sender_amm = self.amm_pools.get(sender, default=UInt64(0)) == 1
        
        if sender != self.admin.value and receiver != self.admin.value:
            assert self.trading_enabled.value == 1, "Trading not enabled"
            
        if not is_receiver_amm and receiver != self.admin.value and sender != self.admin.value:
            assert amount <= self.max_transaction_amount.value, "Exceeds max tx limit"
            
        if not is_receiver_amm and receiver != self.admin.value:
            to_balance = self.balances.get(receiver, default=UInt64(0))
            assert to_balance + amount <= self.max_wallet_amount.value, "Exceeds max wallet limit"
            
        if self.cooldown_enabled.value == 1 and is_sender_amm and receiver != self.admin.value:
            last_trade_time = self.last_trade.get(receiver, default=UInt64(0))
            assert last_trade_time + self.trade_cooldown.value <= Global.latest_timestamp, "Cooldown active"
            self.last_trade[receiver] = Global.latest_timestamp
            
        tax_amount = UInt64(0)
        if self.transfer_tax_rate.value > 0 and self.tax_wallet.value != Global.zero_address:
            if sender != self.admin.value and receiver != self.admin.value:
                if is_sender_amm or is_receiver_amm:
                    tax_amount = (amount * self.transfer_tax_rate.value) // UInt64(100)
                    
        self.balances[sender] = from_balance - amount
        if tax_amount > 0:
            tax_wallet_bal = self.balances.get(self.tax_wallet.value, default=UInt64(0))
            self.balances[self.tax_wallet.value] = tax_wallet_bal + tax_amount
            receive_amount = amount - tax_amount
            to_bal = self.balances.get(receiver, default=UInt64(0))
            self.balances[receiver] = to_bal + receive_amount
        else:
            to_bal = self.balances.get(receiver, default=UInt64(0))
            self.balances[receiver] = to_bal + amount

    @arc4.abimethod
    def enable_trading(self) -> None:
        assert Txn.sender == self.admin.value, "Only admin"
        self.trading_enabled.value = UInt64(1)

    @arc4.abimethod(readonly=True)
    def balance_of(self, account: Account) -> UInt64:
        return self.balances.get(account, default=UInt64(0))
