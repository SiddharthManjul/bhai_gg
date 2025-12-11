import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// GET /api/badges/my-badges - Get user's badges and claimable events (check-in required)
export async function GET(request: NextRequest) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's badges
    const badges = await db.badge.findMany({
      where: { userId: user.id },
      orderBy: { awardedAt: 'desc' },
    })

    // Get events the user has checked in to (attendance required)
    const userAttendances = await db.eventAttendance.findMany({
      where: { userId: user.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            location: true,
            startTime: true,
            badgeImage: true,
          },
        },
      },
    })

    // Get badges already claimed by user (by eventId)
    const claimedBadges = await db.badge.findMany({
      where: {
        userId: user.id,
        eventId: { not: null },
      },
      select: {
        eventId: true,
      },
    })
    const claimedEventIds = new Set(claimedBadges.map((b) => b.eventId))

    // Build claimable events list (only events user has checked in to AND approved for minting)
    const claimableEvents = userAttendances
      .filter((attendance) => {
        // Only show events where:
        // 1. Creator has set up a badge image
        // 2. User is approved for minting by event host/admin
        return !!attendance.event.badgeImage && attendance.approvedForMinting
      })
      .map((attendance) => {
        const alreadyClaimed = claimedEventIds.has(attendance.eventId) || attendance.nftMinted
        return {
          id: attendance.event.id,
          name: attendance.event.name,
          location: attendance.event.location,
          startTime: attendance.event.startTime,
          hasCheckedIn: true,
          alreadyClaimed,
          hasBadgeImage: true,
          approvedForMinting: attendance.approvedForMinting,
        }
      })

    return NextResponse.json({
      badges,
      claimableEvents,
      walletAddress: user.walletAddress,
    })
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    )
  }
}
