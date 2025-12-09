import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// GET /api/events/[id] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
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

    // Fetch event with all relations
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            role: true,
          },
        },
        rsvps: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
        invites: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
        joinRequests: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user has access to view this event
    const isCreator = event.createdById === user.id
    const isAdmin = user.role === 'ADMIN'

    // If not creator or admin, check approval status
    if (!isCreator && !isAdmin && event.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Event not found or not approved' },
        { status: 404 }
      )
    }

    // Check access permissions for non-creators/non-admins
    if (!isCreator && !isAdmin) {
      // Public APPROVED events are visible to everyone
      if (event.isPublic && event.approvalStatus === 'APPROVED') {
        // Allow viewing
      } else if (!event.isPublic) {
        // Private events: must have accepted invite
        const hasAcceptedInvite = event.invites.some(
          (inv) => inv.userId === user.id && inv.status === 'ACCEPTED'
        )

        if (!hasAcceptedInvite) {
          return NextResponse.json(
            { error: 'You do not have access to this private event' },
            { status: 403 }
          )
        }
      } else {
        // Public but not approved - no access
        return NextResponse.json(
          { error: 'Event not found or not approved' },
          { status: 404 }
        )
      }
    }

    // Find user's specific data
    const userRsvp = event.rsvps.find((rsvp) => rsvp.userId === user.id)
    const userInvite = event.invites.find((inv) => inv.userId === user.id)
    const userJoinRequest = event.joinRequests.find(
      (req) => req.userId === user.id
    )
    const userAttendance = event.attendances.find((att) => att.userId === user.id)

    // Remove QR secret for non-creators (security)
    const { qrSecret, ...eventData } = event

    // Include QR secret only for event creator
    const response = isCreator
      ? event
      : eventData

    return NextResponse.json({
      event: {
        ...response,
        userRsvp: userRsvp || null,
        userInvite: userInvite || null,
        userJoinRequest: userJoinRequest || null,
        userAttendance: userAttendance || null,
        canManage: isCreator || isAdmin,
      },
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}
