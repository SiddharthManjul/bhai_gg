import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { mintBadge, batchMintBadges, BadgeType, generateMetadataUri } from '@/lib/nft'
import { BadgeType as PrismaBadgeType } from '@/generated/prisma/client'

// Map numeric BadgeType to Prisma enum
const badgeTypeToEnum: Record<number, PrismaBadgeType> = {
  [BadgeType.STARTER]: 'STARTER',
  [BadgeType.ACTIVE]: 'ACTIVE',
  [BadgeType.VETERAN]: 'VETERAN',
  [BadgeType.ELITE]: 'ELITE',
  [BadgeType.EVENT_ATTENDANCE]: 'EVENT_ATTENDANCE',
  [BadgeType.MEETUP]: 'MEETUP',
}

// POST /api/nft/mint - Mint badges for event attendees (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { eventId, attendeeIds, addresses, badgeType = BadgeType.EVENT_ATTENDANCE, badgeImage } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      )
    }

    // Support either attendeeIds or manual addresses
    if (!attendeeIds && !addresses) {
      return NextResponse.json(
        { error: 'Either attendeeIds or addresses array is required' },
        { status: 400 }
      )
    }

    // Get event details with both attendances and RSVPs
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: {
          include: {
            user: true,
          },
        },
        rsvps: {
          where: { status: 'GOING' },
          include: {
            user: true,
          },
        },
        creator: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Authorization: User must be either an ADMIN or the event creator
    const isAdmin = user.role === 'ADMIN'
    const isEventCreator = event.createdById === user.id

    if (!isAdmin && !isEventCreator) {
      return NextResponse.json(
        { error: 'Only admins or event creators can mint badges' },
        { status: 403 }
      )
    }

    // Validate badge image
    if (!badgeImage) {
      return NextResponse.json(
        { error: 'Badge image is required' },
        { status: 400 }
      )
    }

    // Generate metadata URI with custom image (now async, stores in DB)
    const metadataUri = await generateMetadataUri(
      event.name,
      new Date(event.startTime),
      badgeType as BadgeType,
      badgeImage // Pass the custom badge image
    )

    console.log('📝 Generated metadata URI:', metadataUri)

    let mintParams: Array<{
      recipientAddress: string
      badgeType: BadgeType
      metadataUri: string
      eventId: string
    }> = []

    // Track users with their source (RSVP or attendance) and data
    let selectedUsers: Array<{
      userId: string
      userName: string
      walletAddress: string
      source: 'rsvp' | 'attendance'
      attendanceId?: string
    }> = []

    // Handle manual addresses
    if (addresses && Array.isArray(addresses)) {
      // Validate addresses
      const validAddresses = addresses.filter((addr: string) =>
        addr.match(/^0x[a-fA-F0-9]{40}$/)
      )

      if (validAddresses.length === 0) {
        return NextResponse.json(
          { error: 'No valid wallet addresses provided' },
          { status: 400 }
        )
      }

      mintParams = validAddresses.map((addr: string) => ({
        recipientAddress: addr,
        badgeType: badgeType as BadgeType,
        metadataUri,
        eventId: event.id,
      }))
    }
    // Handle attendee IDs (can be from RSVPs or attendances)
    else if (attendeeIds && Array.isArray(attendeeIds)) {
      console.log('🔍 Looking up user IDs:', attendeeIds)
      console.log('📊 Available RSVPs:', event.rsvps.length)
      console.log('📊 Available attendances:', event.attendances.length)

      // First, try to find users in RSVPs (most common case now)
      const rsvpUsers = event.rsvps
        .filter((rsvp) => attendeeIds.includes(rsvp.userId))
        .filter((rsvp) => rsvp.user.walletAddress)
        .map((rsvp) => ({
          userId: rsvp.userId,
          userName: rsvp.user.name || 'Unknown User',
          walletAddress: rsvp.user.walletAddress!,
          source: 'rsvp' as const,
        }))

      console.log('✅ Found RSVP users with wallets:', rsvpUsers.length)

      // Then, find users in attendances (for users who already checked in)
      const attendanceUsers = event.attendances
        .filter((attendance) => attendeeIds.includes(attendance.userId))
        .filter((attendance) => attendance.user.walletAddress)
        .filter((attendance) => !attendance.nftMinted) // Skip already minted for attendances
        .map((attendance) => ({
          userId: attendance.userId,
          userName: attendance.user.name || 'Unknown User',
          walletAddress: attendance.user.walletAddress!,
          source: 'attendance' as const,
          attendanceId: attendance.id,
        }))

      console.log('✅ Found attendance users with wallets:', attendanceUsers.length)

      // Combine both sources, preferring attendance if user exists in both
      const userMap = new Map<string, typeof selectedUsers[0]>()

      // Add RSVP users first
      rsvpUsers.forEach((user) => userMap.set(user.userId, user))

      // Override with attendance users if they exist (they have more complete data)
      attendanceUsers.forEach((user) => userMap.set(user.userId, user))

      selectedUsers = Array.from(userMap.values())

      console.log('📦 Total selected users:', selectedUsers.length)

      if (selectedUsers.length === 0) {
        return NextResponse.json(
          { error: 'None of the selected users have wallet addresses' },
          { status: 400 }
        )
      }

      // Prepare minting parameters
      mintParams = selectedUsers.map((user) => ({
        recipientAddress: user.walletAddress,
        badgeType: badgeType as BadgeType,
        metadataUri,
        eventId: event.id,
      }))
    }

    // Execute batch mint
    const { results, totalSuccess, totalFailed } = await batchMintBadges(mintParams)

    console.log('🎉 Minting results:', { totalSuccess, totalFailed })

    // Update database with minting results (only for attendee IDs, not manual addresses)
    if (attendeeIds && selectedUsers.length > 0) {
      const updatePromises = selectedUsers.map(async (user, index) => {
        const result = results[index]

        if (result.success) {
          console.log(`✅ Minting succeeded for ${user.userName}, updating database...`)

          // If user came from attendance, update the attendance record
          if (user.source === 'attendance' && user.attendanceId) {
            await db.eventAttendance.update({
              where: { id: user.attendanceId },
              data: {
                nftMinted: true,
                txHash: result.txHash,
                tokenId: result.tokenId?.toString(),
              },
            })
            console.log(`📝 Updated attendance record for ${user.userName}`)
          }

          // Always create badge record
          await db.badge.create({
            data: {
              userId: user.userId,
              type: badgeTypeToEnum[badgeType as number] || 'EVENT_ATTENDANCE',
              nftMinted: true,
              txHash: result.txHash,
              tokenId: result.tokenId?.toString(),
            },
          })
          console.log(`🏅 Created badge record for ${user.userName}`)
        } else {
          console.log(`❌ Minting failed for ${user.userName}:`, result.error)
        }
      })

      await Promise.all(updatePromises)
    }

    // Return results
    if (addresses) {
      // Manual addresses response
      return NextResponse.json({
        success: true,
        totalSuccess,
        totalFailed,
        results: results.map((r, i) => ({
          address: mintParams[i].recipientAddress,
          success: r.success,
          txHash: r.txHash,
          tokenId: r.tokenId?.toString(),
          error: r.error,
        })),
      })
    } else {
      // Attendee IDs response
      return NextResponse.json({
        success: true,
        totalSuccess,
        totalFailed,
        results: results.map((r, i) => ({
          userId: selectedUsers[i].userId,
          userName: selectedUsers[i].userName,
          source: selectedUsers[i].source,
          success: r.success,
          txHash: r.txHash,
          tokenId: r.tokenId?.toString(),
          error: r.error,
        })),
      })
    }
  } catch (error) {
    console.error('Error minting badges:', error)
    return NextResponse.json(
      { error: 'Failed to mint badges' },
      { status: 500 }
    )
  }
}
