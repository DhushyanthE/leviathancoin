import pytest
from algopy_testing import AlgopyTestContext
from algokit_utils import Account, AlgorandClient
from smart_contracts.artifacts.kontour_governance.kontour_governance_client import KontourGovernanceClient

@pytest.fixture
def context():
    with AlgopyTestContext() as ctx:
        yield ctx

@pytest.fixture
def creator():
    return Account(\"AO3OV76L62BILXYM4RT3HUJMLPWTLR3SHFD2UXXZNF4R2NT2NQ63TQP3AQ\")

def test_initial_state(context, creator):
    client = KontourGovernanceClient(context.algod, creator)
    result = client.send.create_application(args=(\"genesis_v1\",))
    state = client.get_global_state()
    assert state[\"current_model_hash\"] == \"genesis_v1\"
    assert state[\"best_bell_score\"] == 2000
    assert state[\"current_author\"] == creator.address

def test_reject_classical_score(context, creator):
    client = KontourGovernanceClient(context.algod, creator)
    client.send.create_application(args=(\"genesis_v1\",))
    with pytest.raises(Exception, match=\"Proposal rejected\"):
        client.send.propose_model(args=(\"bad_model\", 1999))

def test_accept_quantum_advantage(context, creator):
    client = KontourGovernanceClient(context.algod, creator)
    client.send.create_application(args=(\"genesis_v1\",))
    result = client.send.propose_model(args=(\"good_model\", 2500))
    assert \"Accepted\" in result.return_value
    state = client.get_global_state()
    assert state[\"best_bell_score\"] == 2500

def test_distribute_royalty(context, creator):
    client = KontourGovernanceClient(context.algod, creator)
    client.send.create_application(args=(\"genesis_v1\",))
    client.send.propose_model(args=(\"model\", 2500))
    # Simulate royalty (fund contract first in real, mock here)
    # client.send.distribute_epoch_royalty(args=(500,))

