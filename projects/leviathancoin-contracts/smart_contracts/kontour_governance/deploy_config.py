import logging
import algokit_utils
from smart_contracts.artifacts.kontour_governance.kontour_governance_client import KontourGovernanceClient

logger = logging.getLogger(__name__)

def deploy() -> None:
    \"\"\"
    Deployment configuration for Kontour Governance.
    \"\"\"
    algorand_client = algokit_utils.get_algod_client(algokit_utils.get_default_localnet_config())
    deployer = algokit_utils.get_localnet_default_account(algorand_client)
    
    logger.info(f\"🚀 Deploying Kontour Governance from {deployer.address}\")

    client = KontourGovernanceClient(
        algorand_client=algorand_client,
        creator=deployer,
        indexer_client=None,
    )
    
    sp = algokit_utils.ApplicationSpecification.from_artifacts_file('kontour_governance')
    
    response = client.deploy(
        app_spec=sp,
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    
    app_id = response.app.app_id
    logger.info(f\"✅ Kontour Governance deployed! App ID: {app_id}\")
    
    # Initialize
    genesis = \"genesis_ipfs_QmKontourV1\"
    client.create_application(genesis_hash=genesis)
    logger.info(f\"✅ Initialized with genesis {genesis}\")

