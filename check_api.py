from algopy import itxn, Account, Asset, UInt64

# Check what fields are available for AssetTransfer
at = itxn.AssetTransfer()
print("=== AssetTransfer fields ===")
print([f for f in dir(at) if not f.startswith('_')])

# Check AssetConfig fields
ac = itxn.AssetConfig()
print("\n=== AssetConfig fields ===")
print([f for f in dir(ac) if not f.startswith('_')])

# Let's try creating one to see
print("\n=== Trying to create AssetTransfer ===")
try:
    itxn.AssetTransfer(xfer_asset=Asset(1), sender=Account("A"), receiver=Account("B"), amount=UInt64(100))
except Exception as e:
    print(f"Error: {e}")
