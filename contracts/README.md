# Bhai Badge NFT Contracts

Smart contracts for the Bhai.gg NFT badge system.

## Overview

This directory contains the Foundry-based smart contract setup for Bhai.gg badges and POAPs.

### BhaiBadge Contract

An ERC-721 NFT contract that supports:
- Event attendance badges
- Contribution badges (STARTER, ACTIVE, VETERAN, ELITE)
- Meetup POAPs
- Batch minting for mass drops
- Optional soulbound functionality (non-transferable)

## Setup

1. Install Foundry (if not already installed):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
forge install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Add your private key to `.env`:
```
PRIVATE_KEY=0x...
```

## Testing

Run the test suite:
```bash
forge test
```

Run tests with gas reporting:
```bash
forge test --gas-report
```

Run tests with verbosity:
```bash
forge test -vvv
```

## Deployment

### Deploy to Monad Testnet

1. Make sure you have test MONAD tokens in your wallet
2. Set your private key in `.env`
3. Run the deployment script:

```bash
forge script contracts/script/Deploy.s.sol:DeployBhaiBadge --rpc-url monad_testnet --broadcast --verify
```

Or using the full RPC URL:
```bash
forge script contracts/script/Deploy.s.sol:DeployBhaiBadge \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Deploy to Monad Mainnet

Update your `.env` with mainnet RPC URL and run:
```bash
forge script contracts/script/Deploy.s.sol:DeployBhaiBadge \
  --rpc-url https://rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Contract Functions

### Minting

#### Single Mint
```solidity
function mint(
    address to,
    BadgeType badgeType,
    string memory tokenURI,
    string memory eventId
) public onlyOwner returns (uint256)
```

#### Batch Mint
```solidity
function batchMint(
    address[] calldata recipients,
    BadgeType[] calldata badgeTypes,
    string[] calldata tokenURIs,
    string[] calldata eventIds
) external onlyOwner
```

### Badge Types

```solidity
enum BadgeType {
    STARTER,
    ACTIVE,
    VETERAN,
    ELITE,
    EVENT_ATTENDANCE,
    MEETUP
}
```

### Query Functions

- `getBadgeType(uint256 tokenId)`: Get the badge type for a token
- `getEventId(uint256 tokenId)`: Get the event/meetup ID for a token
- `totalSupply()`: Get total number of badges minted

## Integration with Backend

After deployment, add the contract address and ABI to your backend:

1. Copy the deployed contract address
2. Update `.env` in the root project:
```
NFT_CONTRACT_ADDRESS=0x...
ADMIN_WALLET_PRIVATE_KEY=0x...
RPC_URL=https://testnet-rpc.monad.xyz
```

3. Copy the ABI from `contracts/out/BhaiBadge.sol/BhaiBadge.json`
4. Create `lib/nft-abi.ts` in your Next.js project with the ABI

## Soulbound Tokens (Optional)

To make badges non-transferable (soulbound), uncomment the `_update` function in `BhaiBadge.sol`. This will prevent users from transferring their badges while still allowing minting.

## Security

- Only the contract owner can mint badges
- Keep your private key secure and never commit it to version control
- The `.env` file is gitignored by default
- For production, use a hardware wallet or multi-sig for the owner account

## Useful Commands

```bash
# Compile contracts
forge build

# Run tests
forge test

# Check test coverage
forge coverage

# Format code
forge fmt

# Get contract size
forge build --sizes

# Clean artifacts
forge clean
```

## Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Monad Documentation](https://docs.monad.xyz/)
