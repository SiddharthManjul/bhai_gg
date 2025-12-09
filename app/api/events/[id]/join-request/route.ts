import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { JoinRequestStatus } from '@/generated/prisma/client'

// POST /api/events/[id]/join-request - Request to join public event
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
    const { message } = body // Optional message from user

    // Fetch event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        joinRequests: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Event must be public
    if (!event.isPublic) {
      return NextResponse.json(
        { error: 'This is a private event. You need an invitation.' },
        { status: 400 }
      )
    }

    // Event must be approved
    if (event.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Event is not approved yet' },
        { status: 403 }
      )
    }

    // Check if already requested
    const existingRequest = event.joinRequests.find(
      (req) => req.userId === user.id
    )

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json(
          { error: 'You have already requested to join this event' },
          { status: 400 }
        )
      }

      if (existingRequest.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Your request has already been approved' },
          { status: 400 }
        )
      }

      if (existingRequest.status === 'REJECTED') {
        // Allow reapplying if previously rejected
        const updatedRequest = await db.eventJoinRequest.update({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
          data: {
            status: JoinRequestStatus.PENDING,
            message,
            respondedAt: null,
          },
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
        })

        return NextResponse.json({
          success: true,
          joinRequest: updatedRequest,
          message: 'Join request resubmitted',
        })
      }
    }

    // Create join request
    const joinRequest = await db.eventJoinRequest.create({
      data: {
        eventId,
        userId: user.id,
        message: message || null,
        status: JoinRequestStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            startTime: true,
            location: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      joinRequest,
      message: 'Join request submitted. Waiting for event creator approval.',
    })
  } catch (error) {
    console.error('Error creating join request:', error)
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id]/join-request - Cancel join request
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

    // Find join request
    const joinRequest = await db.eventJoinRequest.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
    })

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      )
    }

    // Can only cancel pending requests
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      )
    }

    // Delete join request
    await db.eventJoinRequest.delete({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Join request cancelled',
    })
  } catch (error) {
    console.error('Error cancelling join request:', error)
    return NextResponse.json(
      { error: 'Failed to cancel join request' },
      { status: 500 }
    )
  }
}
