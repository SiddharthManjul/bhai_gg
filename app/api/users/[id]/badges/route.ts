import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// GET /api/users/[id]/badges - Get user's badges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the requesting user
    const requestingUser = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch the user's badges
    const badges = await db.badge.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { awardedAt: 'desc' },
    })

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user badges' },
      { status: 500 }
    )
  }
}
