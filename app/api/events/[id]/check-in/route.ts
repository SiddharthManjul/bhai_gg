import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

/**
 * POST /api/events/[id]/check-in
 * Self-service QR code based event check-in
 *
 * Requirements:
 * 1. User must be registered
 * 2. Event must be approved and started
 *
 * Note: GPS validation removed - QR code scan is sufficient for check-in
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

    // Check: Event has started
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

    // Create attendance record (no GPS data needed)
    const attendance = await db.eventAttendance.create({
      data: {
        eventId: event.id,
        userId: user.id,
        latitude: 0, // No longer tracking GPS
        longitude: 0,
        distance: 0,
        checkedInAt: now,
      },
    })

    // Update user's last active
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
