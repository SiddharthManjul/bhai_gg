import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { RsvpStatus } from '@/generated/prisma/client'

// POST /api/events/[id]/rsvp - RSVP to an event
export async function POST(
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
    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !['GOING', 'NOT_GOING'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid RSVP status. Must be GOING or NOT_GOING' },
        { status: 400 }
      )
    }

    // Fetch event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        invites: true,
        joinRequests: true,
        rsvps: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is approved
    if (event.approvalStatus !== 'APPROVED' && event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Event is not approved yet' },
        { status: 403 }
      )
    }

    // Check access permissions
    const isCreator = event.createdById === user.id
    const isAdmin = user.role === 'ADMIN'

    // Admins and creators can always RSVP
    if (!isCreator && !isAdmin) {
      if (event.isPublic) {
        // For public events, must have approved join request
        const hasApprovedRequest = event.joinRequests.some(
          (req) => req.userId === user.id && req.status === 'APPROVED'
        )

        if (!hasApprovedRequest) {
          return NextResponse.json(
            { error: 'You must request to join this public event first' },
            { status: 403 }
          )
        }
      } else {
        // For private events, must have accepted invite
        const hasAcceptedInvite = event.invites.some(
          (inv) => inv.userId === user.id && inv.status === 'ACCEPTED'
        )

        if (!hasAcceptedInvite) {
          return NextResponse.json(
            { error: 'You must be invited to this private event' },
            { status: 403 }
          )
        }
      }
    }

    // Check capacity if RSVPing as GOING
    if (status === 'GOING' && event.maxAttendees) {
      const goingCount = event.rsvps.filter(
        (rsvp) => rsvp.status === 'GOING'
      ).length

      // Get existing RSVP to check if user is already going
      const existingRsvp = event.rsvps.find((rsvp) => rsvp.userId === user.id)

      // Only check capacity if user is not already going
      if (
        (!existingRsvp || existingRsvp.status !== 'GOING') &&
        goingCount >= event.maxAttendees
      ) {
        return NextResponse.json(
          { error: 'Event is at full capacity' },
          { status: 400 }
        )
      }
    }

    // Create or update RSVP
    const rsvp = await db.eventRsvp.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
      update: {
        status: status as RsvpStatus,
      },
      create: {
        eventId,
        userId: user.id,
        status: status as RsvpStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      rsvp,
      message: `RSVP updated to ${status}`,
    })
  } catch (error) {
    console.error('Error creating RSVP:', error)
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 })
  }
}

// DELETE /api/events/[id]/rsvp - Remove RSVP
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

    // Delete RSVP
    await db.eventRsvp.delete({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'RSVP removed',
    })
  } catch (error) {
    console.error('Error deleting RSVP:', error)
    return NextResponse.json(
      { error: 'Failed to remove RSVP' },
      { status: 500 }
    )
  }
}
