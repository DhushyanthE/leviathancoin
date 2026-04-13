from algopy import Global, String, Txn, UInt64, arc4, itxn, op


class KontourGovernance(arc4.ARC4Contract):
    current_model_hash: String
    best_bell_score: UInt64  # Scaled by 1000 (e.g., 2828 = 2.828)
    current_author: arc4.Account

    @arc4.abimethod(create="require")
    def create_application(self, genesis_hash: String) -> None:
        """Initialize the network with the Genesis weights."""
        self.current_model_hash = genesis_hash
        self.best_bell_score = UInt64(2000)  # Baseline classical limit (2.000)
        self.current_author = Txn.sender

    @arc4.abimethod
    def propose_model(self, new_hash: String, benchmark_score: UInt64) -> String:
        """Data Scientists call this to propose superior AI weights."""

        # 1. The Mathematical Filter
        assert (
            benchmark_score > self.best_bell_score
        ), "Proposal rejected: Insufficient quantum advantage."

        # 2. State Update (In production, this triggers a validator vote first)
        self.current_model_hash = new_hash
        self.best_bell_score = benchmark_score
        self.current_author = Txn.sender

        return "Model Upgrade Accepted. Royalties re-routed."

    @arc4.abimethod
    def distribute_epoch_royalty(self, reward_amount: UInt64) -> None:
        """Called by the protocol every epoch to pay the reigning Data Scientist."""

        # Ensure the contract actually has the funds to pay
        assert (
            op.balance(Global.current_application_address) >= reward_amount
        ), "Insufficient treasury."

        # Issue an inner transaction to pay the royalty
        itxn.Payment(
            receiver=self.current_author,
            amount=reward_amount,
            fee=0,  # Protocol covers the fee
        ).submit()
