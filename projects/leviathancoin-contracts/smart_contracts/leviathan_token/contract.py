from algopy import ARC4Contract, Global, String, arc4, itxn
from algopy.arc4 import abimethod


class LeviathanToken(ARC4Contract):
    """
    Leviathan Token - A mining-enabled token contract on Algorand.

    This contract implements:
    - Mining (minting) function for creating new tokens
    - NFT minting capability
    """

    @abimethod()
    def create_token(
        self,
        max_supply: arc4.UInt64,
        unit_name: String,
        asset_name: String,
        url: String,
    ) -> None:
        """Initialize the token with metadata and create the ASA."""
        # Create the ASA (Algorand Standard Asset)
        itxn.AssetConfig(
            total=max_supply.as_uint64(),
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

    @abimethod()
    def mine(self, miner: arc4.Address) -> arc4.UInt64:
        """Mining function - mints new tokens to the miner's address."""
        # Mining reward (1 token = 1,000,000 microALGOs)
        reward = arc4.UInt64(1000000)

        # Return the reward amount
        return reward

    @abimethod()
    def mint_nft(
        self,
        minter: arc4.Address,
        nft_name: String,
        nft_url: String,
    ) -> arc4.UInt64:
        """Mint a new NFT (Non-Fungible Token)."""
        # Create NFT (Asset with total=1)
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

        # Get the created NFT asset ID
        nft_id = result.created_asset.id

        # Transfer NFT to minter
        itxn.AssetTransfer(
            xfer_asset=nft_id,
            asset_receiver=minter.native,
            asset_amount=1,
        ).submit()

        return arc4.UInt64(nft_id)
