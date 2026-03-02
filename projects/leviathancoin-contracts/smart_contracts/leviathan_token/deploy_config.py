import logging

import algokit_utils
from algopy import arc4

logger = logging.getLogger(__name__)


def deploy() -> None:
    """
    Deployment configuration for Leviathan Token with mining capabilities.
    """
    from smart_contracts.artifacts.leviathan_token.leviathan_token_client import (
        LeviathanTokenClient,
        CreateTokenParams,
        MineParams,
        MintNftParams,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    logger.info(f"🚀 Deploying Leviathan Token from account: {deployer.address}")

    # Create the app client
    client = LeviathanTokenClient(
        algorand.client,
        creator=deployer,
        indexer_client=algorand.indexer,
    )

    # Deploy the contract
    logger.info("📝 Creating Leviathan Token contract...")
    response = client.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    app_id = response.app.app_id
    app_address = response.app.app_address
    logger.info(f"✅ Contract deployed! App ID: {app_id}")
    logger.info(f"✅ Contract Address: {app_address}")

    # Initialize the token with metadata
    logger.info("🎨 Initializing token metadata...")
    create_token_response = client.send.create_token(
        args=CreateTokenParams(
            max_supply=arc4.UInt64(1_000_000_000),  # 1 billion max supply
            unit_name="LEVI",
            asset_name="Leviathan Coin",
            url="https://leviathancoin.com/metadata",
        )
    )
    logger.info(f"✅ Token created! Transaction ID: {create_token_response.tx_id}")

    # Fund the contract with some ALGO for operations
    logger.info("💳 Funding contract account...")
    algorand.send.payment(
        algokit_utils.PaymentParams(
            sender=deployer.address,
            receiver=app_address,
            amount=algokit_utils.AlgoAmount(algo=2),  # 2 ALGO for MBR and operations
        )
    )
    logger.info("✅ Contract funded!")

    # Example: Call mine function (for testing)
    # In production, users would call this themselves
    # mine_response = client.send.mine(
    #     args=MineParams(miner_address=arc4.Address(deployer.address))
    # )
    # logger.info(f"⛏️ Mining result: {mine_response.abi_return}")

    # Example: Mint an NFT (for testing)
    # nft_response = client.send.mint_nft(
    #     args=MintNftParams(
    #         minter=arc4.Address(deployer.address),
    #         nft_name="Leviathan NFT #1",
    #         nft_url="https://leviathancoin.com/nft/1",
    #     )
    # )
    # logger.info(f"🎨 NFT minted! ID: {nft_response.abi_return}")

    logger.info("🎉 Leviathan Token deployment complete!")
    logger.info(f"📱 App ID: {app_id}")
    logger.info(f"� Contract Address: {app_address}")
