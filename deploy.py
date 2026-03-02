import os
from dotenv import load_dotenv
from algokit_utils import (
    AlgorandClient,
    AlgoAmount,
    get_indexer_client,
)

# Make sure your project has been built first so this client exists!
# Run `algokit project build` in terminal to generate it.
from smart_contracts.artifacts.leviathan_token.leviathan_token_client import LeviathanTokenClient

def deploy():
    print("🌊 Initializing Leviathan Ecosystem Deployment...")
    load_dotenv()

    # Connect to the network (defaults to LocalNet if .env points there, or Testnet/Mainnet)
    algorand = AlgorandClient.from_environment()
    indexer_client = get_indexer_client()

    # Load deployer account
    deployer = algorand.account.from_environment("DEPLOYER")
    print(f"✅ Deployer Account: {deployer.address}")

    # Initialize the Smart Contract Client
    client = LeviathanTokenClient(
        algorand.client,
        creator=deployer,
        indexer_client=indexer_client,
    )

    # 1. Deploy the Contract
    print("🚀 Deploying Smart Contract to Algorand...")
    response = client.deploy(
        on_update="append",
        on_schema_break="append",
    )

    app_id = response.app.app_id
    app_address = response.app.app_address
    print(f"✅ Deployment Successful! App ID: {app_id}")
    print(f"✅ Contract Address: {app_address}")

    # 2. Initialize Token with metadata
    print("🎨 Creating Leviathan Token...")
    create_token_response = client.send.create_token(
        args={
            "max_supply": 1_000_000_000,  # 1 billion max supply
            "unit_name": "LEVI",
            "asset_name": "Leviathan Coin",
            "url": "https://leviathancoin.com/metadata",
        }
    )
    print(f"✅ Token Created!")

    # 3. Fund the Contract for operations
    print("💰 Funding contract...")
    algorand.send.payment(
        sender=deployer.address,
        receiver=app_address,
        amount=AlgoAmount(algo=2),  # 2 ALGO to cover MBR
    )
    print("✅ Contract Funded!")
    print("\n🎉 LEVIATHAN ECOSYSTEM IS LIVE!")
    print(f"📱 App ID: {app_id}")
    print(f"🏠 Contract Address: {app_address}")

if __name__ == "__main__":
    deploy()
