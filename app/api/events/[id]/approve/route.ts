/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { JoinRequestStatus } from '@/generated/prisma/client'

// POST /api/events/[id]/approve - Approve or reject join requests
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
    const { userId, status } = body

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

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

    // Only event creator can approve/reject requests
    if (event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only event creator can approve join requests' },
        { status: 403 }
      )
    }

    // Event must be public
    if (!event.isPublic) {
      return NextResponse.json(
        { error: 'This endpoint is for public events only. Use invites for private events.' },
        { status: 400 }
      )
    }

    // Find join request
    const joinRequest = event.joinRequests.find(
      (req) => req.userId === userId
    )

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      )
    }

    // Can only approve/reject pending requests
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Join request has already been processed' },
        { status: 400 }
      )
    }

    // Check capacity if approving
    if (status === 'APPROVED' && event.maxAttendees) {
      const approvedCount = event.joinRequests.filter(
        (req) => req.status === 'APPROVED'
      ).length

      if (approvedCount >= event.maxAttendees) {
        return NextResponse.json(
          { error: 'Event is at full capacity' },
          { status: 400 }
        )
      }
    }

    // Update join request
    const updatedRequest = await db.eventJoinRequest.update({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      data: {
        status: status as JoinRequestStatus,
        respondedAt: new Date(),
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
      joinRequest: updatedRequest,
      message: `Join request ${status.toLowerCase()}`,
    })
  } catch (error) {
    console.error('Error approving join request:', error)
    return NextResponse.json(
      { error: 'Failed to process join request' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id]/approve - Batch approve/reject multiple join requests
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

    const { id: eventId } = await params
    const body = await request.json()
    const { requests } = body // Array of { userId, status }

    // Validate inputs
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json(
        { error: 'requests must be a non-empty array of { userId, status }' },
        { status: 400 }
      )
    }

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

    // Only event creator can approve/reject requests
    if (event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only event creator can approve join requests' },
        { status: 403 }
      )
    }

    // Process each request
    const results = await Promise.all(
      requests.map(async (req: { userId: string; status: string }) => {
        if (!req.userId || !req.status || !['APPROVED', 'REJECTED'].includes(req.status)) {
          return {
            userId: req.userId,
            success: false,
            error: 'Invalid request data',
          }
        }

        // Find join request
        const joinRequest = event.joinRequests.find(
          (jr) => jr.userId === req.userId
        )

        if (!joinRequest) {
          return {
            userId: req.userId,
            success: false,
            error: 'Join request not found',
          }
        }

        if (joinRequest.status !== 'PENDING') {
          return {
            userId: req.userId,
            success: false,
            error: 'Already processed',
          }
        }

        try {
          const updated = await db.eventJoinRequest.update({
            where: {
              eventId_userId: {
                eventId,
                userId: req.userId,
              },
            },
            data: {
              status: req.status as JoinRequestStatus,
              respondedAt: new Date(),
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })

          return {
            userId: req.userId,
            success: true,
            joinRequest: updated,
          }
        } catch (error) {
          return {
            userId: req.userId,
            success: false,
            error: 'Failed to update',
          }
        }
      })
    )

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      success: true,
      results: successful,
      failed,
      message: `${successful.length} request(s) processed, ${failed.length} failed`,
    })
  } catch (error) {
    console.error('Error batch processing join requests:', error)
    return NextResponse.json(
      { error: 'Failed to process join requests' },
      { status: 500 }
    )
  }
}
