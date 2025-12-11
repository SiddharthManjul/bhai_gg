import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { mintBadge, batchMintBadges, BadgeType, generateMetadataUri } from '@/lib/nft'

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

    // Get event details
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: {
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

    // Generate metadata URI with custom image
    const metadataUri = generateMetadataUri(
      event.name,
      new Date(event.startTime),
      badgeType as BadgeType,
      badgeImage // Pass the custom badge image
    )

    let mintParams: Array<{
      recipientAddress: string
      badgeType: BadgeType
      metadataUri: string
      eventId: string
    }> = []

    let attendeesWithWallets: typeof event.attendances = []

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
    // Handle attendee IDs
    else if (attendeeIds && Array.isArray(attendeeIds)) {
      // Get attendees with wallet addresses
      const attendees = event.attendances.filter((attendance) =>
        attendeeIds.includes(attendance.userId)
      )

      if (attendees.length === 0) {
        return NextResponse.json(
          { error: 'No attendees found with the provided IDs' },
          { status: 400 }
        )
      }

      // Filter attendees who have wallet addresses
      attendeesWithWallets = attendees.filter(
        (attendance) => attendance.user.walletAddress
      )

      if (attendeesWithWallets.length === 0) {
        return NextResponse.json(
          { error: 'None of the selected attendees have wallet addresses' },
          { status: 400 }
        )
      }

      // Check if badges already minted (skip for manual addresses)
      const alreadyMinted = attendeesWithWallets.filter(
        (attendance) => attendance.nftMinted
      )

      if (alreadyMinted.length > 0) {
        return NextResponse.json(
          {
            error: `${alreadyMinted.length} attendee(s) already have badges minted`,
            alreadyMinted: alreadyMinted.map((a) => a.userId),
          },
          { status: 400 }
        )
      }

      // Prepare minting parameters
      mintParams = attendeesWithWallets.map((attendance) => ({
        recipientAddress: attendance.user.walletAddress!,
        badgeType: badgeType as BadgeType,
        metadataUri,
        eventId: event.id,
      }))
    }

    // Execute batch mint
    const { results, totalSuccess, totalFailed } = await batchMintBadges(mintParams)

    // Update database with minting results (only for attendee IDs, not manual addresses)
    if (attendeeIds && attendeesWithWallets.length > 0) {
      const updatePromises = attendeesWithWallets.map(async (attendance, index) => {
        const result = results[index]

        if (result.success) {
          // Update attendance record
          await db.eventAttendance.update({
            where: { id: attendance.id },
            data: {
              nftMinted: true,
              txHash: result.txHash,
              tokenId: result.tokenId?.toString(),
            },
          })

          // Create badge record
          await db.badge.create({
            data: {
              userId: attendance.userId,
              type: badgeType,
              nftMinted: true,
              txHash: result.txHash,
              tokenId: result.tokenId?.toString(),
            },
          })
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
          userId: attendeesWithWallets[i].userId,
          userName: attendeesWithWallets[i].user.name,
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
