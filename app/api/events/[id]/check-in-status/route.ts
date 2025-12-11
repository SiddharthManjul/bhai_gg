import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { calculateDistance } from '@/lib/gps'

/**
 * GET /api/events/[id]/check-in-status
 * Check if user can check in to an event
 *
 * Query params: ?latitude=X&longitude=Y
 *
 * Returns:
 * {
 *   canCheckIn: boolean,
 *   reason?: string,
 *   eventStarted: boolean,
 *   withinRadius: boolean,
 *   isAuthorized: boolean,
 *   alreadyCheckedIn: boolean,
 *   distance?: number
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
    const searchParams = request.nextUrl.searchParams
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')

    // Get user
    const user = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        rsvps: {
          where: { userId: user.id },
        },
        attendances: {
          where: { userId: user.id },
        },
        guests: {
          where: {
            OR: [
              { userId: user.id },
              { email: user.email },
            ],
          },
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

    let withinRadius = false
    let distance = 0

    if (latitude && longitude) {
      distance = calculateDistance(
        latitude,
        longitude,
        event.latitude,
        event.longitude
      )
      withinRadius = distance <= event.radius
    }

    // Check authorization: User must have RSVP'd OR be approved guest
    const hasRsvp = event.rsvps.length > 0 && event.rsvps[0].status === 'GOING'
    const isApprovedGuest = event.guests.length > 0 &&
                            event.guests[0].approvalStatus === 'APPROVED' &&
                            event.guests[0].registrationStatus === 'REGISTERED'
    const isAuthorized = hasRsvp || isApprovedGuest

    // Determine if can check in
    const canCheckIn =
      eventApproved &&
      eventStarted &&
      !alreadyCheckedIn &&
      withinRadius &&
      isAuthorized

    let reason = ''
    if (!eventApproved) {
      reason = 'Event is not approved yet'
    } else if (now < eventStart) {
      reason = `Event starts at ${eventStart.toLocaleString()}`
    } else if (now > eventEnd) {
      reason = 'Event has ended'
    } else if (alreadyCheckedIn) {
      reason = 'Already checked in'
    } else if (!withinRadius && latitude && longitude) {
      reason = `You need to be within ${event.radius}m of the venue (currently ${Math.round(distance)}m away)`
    } else if (!isAuthorized) {
      reason = 'You need to RSVP as "Going" or be an approved guest'
    } else if (!latitude || !longitude) {
      reason = 'Location permission required'
    }

    return NextResponse.json({
      canCheckIn,
      reason: canCheckIn ? undefined : reason,
      eventStarted,
      eventEnded: now > eventEnd,
      withinRadius,
      isAuthorized,
      alreadyCheckedIn,
      eventApproved,
      distance: Math.round(distance),
      requiredRadius: event.radius,
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
