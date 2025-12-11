import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { mintBadge, BadgeType, generateMetadataUri } from '@/lib/nft'
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

// POST /api/badges/claim - User claims their own badge (must have checked in)
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

    // Check if user has wallet address
    if (!user.walletAddress) {
      return NextResponse.json(
        { error: 'Please add a wallet address to your profile first' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      )
    }

    // Get event with user's attendance
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        attendances: {
          where: { userId: user.id },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event has a badge image set by creator
    if (!event.badgeImage) {
      return NextResponse.json(
        { error: 'Badge not available yet. The event creator has not set up the NFT badge.' },
        { status: 400 }
      )
    }

    // Check if user has checked in (attendance required)
    const hasAttendance = event.attendances.length > 0

    if (!hasAttendance) {
      return NextResponse.json(
        { error: 'You must check in to this event to claim a badge' },
        { status: 403 }
      )
    }

    // Check if already claimed via attendance record
    if (event.attendances[0].nftMinted) {
      return NextResponse.json(
        { error: 'You have already claimed a badge for this event' },
        { status: 400 }
      )
    }

    // Also check Badge table for existing claim for this event
    const existingBadge = await db.badge.findFirst({
      where: {
        userId: user.id,
        eventId: eventId,
      },
    })

    if (existingBadge) {
      return NextResponse.json(
        { error: 'You have already claimed a badge for this event' },
        { status: 400 }
      )
    }

    // Generate metadata URI using the event's badge image
    const metadataUri = await generateMetadataUri(
      event.name,
      new Date(event.startTime),
      BadgeType.EVENT_ATTENDANCE,
      event.badgeImage // Use event creator's badge image
    )

    console.log('🎁 User claiming badge:', user.name, 'for event:', event.name)

    // Mint the badge
    const result = await mintBadge({
      recipientAddress: user.walletAddress,
      badgeType: BadgeType.EVENT_ATTENDANCE,
      metadataUri,
      eventId: event.id,
    })

    if (!result.success) {
      console.error('Minting failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to mint badge' },
        { status: 500 }
      )
    }

    console.log('✅ Badge minted successfully:', result.txHash)

    // Update attendance record
    await db.eventAttendance.update({
      where: { id: event.attendances[0].id },
      data: {
        nftMinted: true,
        txHash: result.txHash,
        tokenId: result.tokenId?.toString(),
      },
    })

    // Create badge record with eventId to prevent duplicate claims
    await db.badge.create({
      data: {
        userId: user.id,
        eventId: eventId,
        type: badgeTypeToEnum[BadgeType.EVENT_ATTENDANCE],
        nftMinted: true,
        txHash: result.txHash,
        tokenId: result.tokenId?.toString(),
      },
    })

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      tokenId: result.tokenId?.toString(),
      explorerUrl: `https://testnet.monadvision.com/tx/${result.txHash}`,
    })
  } catch (error) {
    console.error('Error claiming badge:', error)
    return NextResponse.json(
      { error: 'Failed to claim badge' },
      { status: 500 }
    )
  }
}
