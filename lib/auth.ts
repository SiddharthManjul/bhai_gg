import { NextRequest } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

/**
 * Get the authenticated Privy user ID from the request
 * Verifies the Privy auth token and returns the user ID
 */
export async function getPrivyUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the token with Privy
    const verifiedClaims = await privy.verifyAuthToken(token)

    return verifiedClaims.userId
  } catch (error) {
    console.error('Error verifying Privy token:', error)
    return null
  }
}

/**
 * Get the authenticated user from database
 * Returns null if not authenticated or user not found
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const privyUserId = await getPrivyUserId(request)

  if (!privyUserId) {
    return null
  }

  const { db } = await import('@/lib/db')

  const user = await db.user.findUnique({
    where: { privyId: privyUserId },
  })

  return user
}
