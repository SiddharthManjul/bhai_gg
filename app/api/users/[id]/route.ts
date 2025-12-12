import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// GET /api/users/[id] - Get public user profile
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

    // Fetch the user profile (only public fields)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        profileImage: true,
        country: true,
        state: true,
        city: true,
        xHandle: true,
        linkedIn: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            badges: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
