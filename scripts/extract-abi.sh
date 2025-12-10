#!/bin/bash

# Extract ABI from compiled contract and save to lib directory

CONTRACT_PATH="contracts/out/BhaiBadge.sol/BhaiBadge.json"
ABI_OUTPUT="lib/nft-abi.ts"

if [ ! -f "$CONTRACT_PATH" ]; then
    echo "Error: Contract not compiled. Run 'forge build' first."
    exit 1
fi

# Extract ABI from the JSON file
ABI=$(jq '.abi' "$CONTRACT_PATH")

# Create the TypeScript file
cat > "$ABI_OUTPUT" << EOF
// Auto-generated ABI for BhaiBadge contract
// Do not edit manually - run 'npm run extract-abi' to regenerate

export const BhaiBadgeABI = $ABI as const;

export default BhaiBadgeABI;
EOF

echo "✅ ABI extracted successfully to $ABI_OUTPUT"
