import { createPublicClient, createWalletClient, http, parseEther, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { BhaiBadgeABI } from './nft-abi'
import { db } from './db'

// Monad Testnet configuration
const MONAD_TESTNET_CHAIN = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MONAD',
  },
  rpcUrls: {
    public: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] },
    default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] },
  },
} as const

const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS as `0x${string}`
const ADMIN_PRIVATE_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY as `0x${string}`

if (!CONTRACT_ADDRESS) {
  throw new Error('NFT_CONTRACT_ADDRESS not set in environment variables')
}

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ADMIN_WALLET_PRIVATE_KEY not set in environment variables')
}

// Create clients
const account = privateKeyToAccount(ADMIN_PRIVATE_KEY)

const publicClient = createPublicClient({
  chain: MONAD_TESTNET_CHAIN,
  transport: http(),
})

const walletClient = createWalletClient({
  account,
  chain: MONAD_TESTNET_CHAIN,
  transport: http(),
})

export enum BadgeType {
  STARTER = 0,
  ACTIVE = 1,
  VETERAN = 2,
  ELITE = 3,
  EVENT_ATTENDANCE = 4,
  MEETUP = 5,
}

export interface MintBadgeParams {
  recipientAddress: string
  badgeType: BadgeType
  metadataUri: string
  eventId: string
}

export interface MintResult {
  success: boolean
  txHash?: string
  tokenId?: bigint
  error?: string
}

/**
 * Mint a single badge NFT
 */
export async function mintBadge({
  recipientAddress,
  badgeType,
  metadataUri,
  eventId,
}: MintBadgeParams): Promise<MintResult> {
  try {
    // Validate recipient address
    if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return {
        success: false,
        error: 'Invalid recipient address format',
      }
    }

    console.log('🔗 Minting NFT to:', recipientAddress)
    console.log('📝 Metadata URI length:', metadataUri.length)

    // Simulate the transaction first to catch errors
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: BhaiBadgeABI,
      functionName: 'mint',
      args: [recipientAddress as `0x${string}`, badgeType, metadataUri, eventId],
      account,
    })

    // Execute the transaction
    const hash = await walletClient.writeContract(request)

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    })

    if (receipt.status === 'success') {
      // Parse logs to get tokenId
      const logs = receipt.logs
      let tokenId: bigint | undefined

      // Find the BadgeMinted event log
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: BhaiBadgeABI,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === 'BadgeMinted') {
            tokenId = (decoded.args as any).tokenId
            break
          }
        } catch {
          continue
        }
      }

      return {
        success: true,
        txHash: hash,
        tokenId,
      }
    }

    return {
      success: false,
      error: 'Transaction failed',
    }
  } catch (error: any) {
    console.error('Error minting badge:', error)
    return {
      success: false,
      error: error.message || 'Failed to mint badge',
    }
  }
}

/**
 * Batch mint badges to multiple recipients
 */
export async function batchMintBadges(
  badges: MintBadgeParams[]
): Promise<{ results: MintResult[]; totalSuccess: number; totalFailed: number }> {
  const results: MintResult[] = []
  let totalSuccess = 0
  let totalFailed = 0

  try {
    // Prepare batch mint parameters
    const recipients = badges.map((b) => b.recipientAddress as `0x${string}`)
    const badgeTypes = badges.map((b) => b.badgeType)
    const metadataUris = badges.map((b) => b.metadataUri)
    const eventIds = badges.map((b) => b.eventId)

    console.log('📦 Batch minting to', badges.length, 'recipients')
    console.log('📝 Metadata URI lengths:', metadataUris.map(u => u.length))

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: BhaiBadgeABI,
      functionName: 'batchMint',
      args: [recipients, badgeTypes, metadataUris, eventIds],
      account,
    })

    // Execute the batch mint
    const hash = await walletClient.writeContract(request)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    })

    if (receipt.status === 'success') {
      // All mints succeeded
      badges.forEach(() => {
        results.push({
          success: true,
          txHash: hash,
        })
        totalSuccess++
      })
    } else {
      // All mints failed
      badges.forEach(() => {
        results.push({
          success: false,
          error: 'Batch transaction failed',
        })
        totalFailed++
      })
    }
  } catch (error: any) {
    console.error('Error in batch mint:', error)
    // If batch fails, try individual mints
    console.log('Batch mint failed, attempting individual mints...')

    for (const badge of badges) {
      const result = await mintBadge(badge)
      results.push(result)
      if (result.success) {
        totalSuccess++
      } else {
        totalFailed++
      }
    }
  }

  return {
    results,
    totalSuccess,
    totalFailed,
  }
}

const badgeTypeNames = {
  [BadgeType.STARTER]: 'Starter',
  [BadgeType.ACTIVE]: 'Active',
  [BadgeType.VETERAN]: 'Veteran',
  [BadgeType.ELITE]: 'Elite',
  [BadgeType.EVENT_ATTENDANCE]: 'Event Attendance',
  [BadgeType.MEETUP]: 'Meetup',
}

/**
 * Generate metadata URI for a badge
 * Stores metadata in database and returns a short URI
 */
export async function generateMetadataUri(
  eventName: string,
  eventDate: Date,
  badgeType: BadgeType,
  imageData?: string // Can be base64 data URI or URL
): Promise<string> {
  const name = `${eventName} - ${badgeTypeNames[badgeType]}`
  const description = `Badge for attending ${eventName} on ${eventDate.toLocaleDateString()}`
  const image = imageData || `https://bhai.gg/badges/${badgeType}.png`
  const attributes = [
    { trait_type: 'Event', value: eventName },
    { trait_type: 'Date', value: eventDate.toISOString() },
    { trait_type: 'Badge Type', value: badgeTypeNames[badgeType] },
    { trait_type: 'Platform', value: 'Bhai.gg' },
  ]

  // Store metadata in database
  const metadata = await db.nftMetadata.create({
    data: {
      name,
      description,
      image,
      attributes,
    },
  })

  console.log('📝 Stored metadata with ID:', metadata.id)

  // Return short URI with database ID
  return `https://bhai.gg/api/nft/metadata/${metadata.id}`
}

/**
 * Get total supply of badges
 */
export async function getTotalSupply(): Promise<bigint> {
  try {
    const supply = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: BhaiBadgeABI,
      functionName: 'totalSupply',
    })

    return supply as bigint
  } catch (error) {
    console.error('Error getting total supply:', error)
    return BigInt(0)
  }
}

/**
 * Check if an address owns a specific token
 */
export async function getTokenOwner(tokenId: bigint): Promise<string | null> {
  try {
    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: BhaiBadgeABI,
      functionName: 'ownerOf',
      args: [tokenId],
    })

    return owner as string
  } catch (error) {
    console.error('Error getting token owner:', error)
    return null
  }
}
