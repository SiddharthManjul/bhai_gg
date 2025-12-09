import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { EventStatus } from '@/generated/prisma/client'

// PUT /api/events/[id]/status - Admin: Update event approval status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins can update event status
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update event status' },
        { status: 403 }
      )
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { status, reason } = body // reason is optional, for rejection feedback

    // Validate status
    if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, APPROVED, or REJECTED' },
        { status: 400 }
      )
    }

    // Fetch event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Update event status
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        approvalStatus: status as EventStatus,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            rsvps: true,
            attendances: true,
            invites: true,
            joinRequests: true,
          },
        },
      },
    })

    // TODO: Send notification to event creator about status change
    // This can be done via email, push notification, or in-app notification

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: `Event ${status.toLowerCase()}`,
      ...(reason && { reason }),
    })
  } catch (error) {
    console.error('Error updating event status:', error)
    return NextResponse.json(
      { error: 'Failed to update event status' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id]/status - Admin: Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: eventId } = await params

    // Fetch event
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Only admins or event creator can delete
    if (user.role !== 'ADMIN' && event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only admins or event creator can delete this event' },
        { status: 403 }
      )
    }

    // Delete event (cascade delete will remove related RSVPs, invites, etc.)
    await db.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
