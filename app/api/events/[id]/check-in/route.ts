import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { calculateDistance } from '@/lib/gps'

/**
 * POST /api/events/[id]/check-in
 * Self-service GPS-based event check-in
 *
 * Requirements:
 * 1. User must be registered
 * 2. Event must be approved and started
 * 3. User must be within event radius (default 100m)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { latitude, longitude } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'GPS coordinates required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'You must complete your profile before checking in. Please register first.' },
        { status: 404 }
      )
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

    // Check if event is approved
    if (event.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Event is not approved yet' },
        { status: 403 }
      )
    }

    // Check if already checked in
    if (event.attendances.length > 0) {
      return NextResponse.json(
        {
          error: 'Already checked in',
          attendance: event.attendances[0]
        },
        { status: 400 }
      )
    }

    // Check 1: Event has started
    const now = new Date()
    const eventStart = new Date(event.startTime)
    const eventEnd = new Date(event.endTime)

    if (now < eventStart) {
      return NextResponse.json(
        {
          error: 'Event has not started yet',
          startsAt: eventStart.toISOString()
        },
        { status: 400 }
      )
    }

    if (now > eventEnd) {
      return NextResponse.json(
        {
          error: 'Event has ended',
          endedAt: eventEnd.toISOString()
        },
        { status: 400 }
      )
    }

    // Check 2: GPS validation (within radius)
    const distance = calculateDistance(
      latitude,
      longitude,
      event.latitude,
      event.longitude
    )

    if (distance > event.radius) {
      return NextResponse.json(
        {
          error: `You are too far from the event location`,
          distance: Math.round(distance),
          required: event.radius,
          message: `You need to be within ${event.radius}m of the venue to check in. You are currently ${Math.round(distance)}m away.`
        },
        { status: 400 }
      )
    }

    // Create attendance record
    const attendance = await db.eventAttendance.create({
      data: {
        eventId: event.id,
        userId: user.id,
        latitude,
        longitude,
        distance,
        checkedInAt: now,
      },
    })

    // Update user's location and last active
    await db.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: now,
      },
    })

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        eventName: event.name,
        location: event.location,
        checkedInAt: attendance.checkedInAt,
        distance: Math.round(distance),
      },
      message: `Successfully checked in to ${event.name}!`,
    })
  } catch (error) {
    console.error('Error during check-in:', error)
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    )
  }
}
