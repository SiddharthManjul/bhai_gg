import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

/**
 * GET /api/events/[id]/check-in-status
 * Check if user can check in to an event
 *
 * No GPS required - QR code scan is sufficient
 *
 * Returns:
 * {
 *   canCheckIn: boolean,
 *   reason?: string,
 *   eventStarted: boolean,
 *   alreadyCheckedIn: boolean
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Get user
    const user = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!user) {
      return NextResponse.json({
        canCheckIn: false,
        reason: 'Please complete your profile registration first',
        isRegistered: false,
      })
    }

    // Get event
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

    const now = new Date()
    const eventStart = new Date(event.startTime)
    const eventEnd = new Date(event.endTime)

    // Check conditions
    const eventStarted = now >= eventStart && now <= eventEnd
    const alreadyCheckedIn = event.attendances.length > 0
    const eventApproved = event.approvalStatus === 'APPROVED'

    // Determine if can check in (no GPS required)
    const canCheckIn =
      eventApproved &&
      eventStarted &&
      !alreadyCheckedIn

    let reason = ''
    if (!eventApproved) {
      reason = 'Event is not approved yet'
    } else if (now < eventStart) {
      reason = `Event starts at ${eventStart.toLocaleString()}`
    } else if (now > eventEnd) {
      reason = 'Event has ended'
    } else if (alreadyCheckedIn) {
      reason = 'Already checked in'
    }

    return NextResponse.json({
      canCheckIn,
      reason: canCheckIn ? undefined : reason,
      eventStarted,
      eventEnded: now > eventEnd,
      alreadyCheckedIn,
      eventApproved,
      isRegistered: true,
      eventDetails: {
        name: event.name,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
      },
    })
  } catch (error) {
    console.error('Error checking check-in status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
