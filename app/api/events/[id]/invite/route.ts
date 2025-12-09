import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { InviteStatus } from '@/generated/prisma/client'

// POST /api/events/[id]/invite - Invite users to private event
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
    const { userIds } = body

    // Validate userIds
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Fetch event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        invites: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Only event creator can invite users
    if (event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only event creator can invite users' },
        { status: 403 }
      )
    }

    // Event must be private
    if (event.isPublic) {
      return NextResponse.json(
        { error: 'Cannot invite users to public events. Public events use join requests.' },
        { status: 400 }
      )
    }

    // Create invites for all users
    const invites = await Promise.all(
      userIds.map(async (userId: string) => {
        // Check if user exists
        const invitedUser = await db.user.findUnique({
          where: { id: userId },
        })

        if (!invitedUser) {
          return { userId, error: 'User not found', success: false }
        }

        // Check if already invited
        const existingInvite = event.invites.find(
          (inv) => inv.userId === userId
        )

        if (existingInvite) {
          return {
            userId,
            error: 'User already invited',
            success: false,
            status: existingInvite.status,
          }
        }

        // Create invite
        try {
          const invite = await db.eventInvite.create({
            data: {
              eventId,
              userId,
              status: InviteStatus.PENDING,
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

          return {
            userId,
            success: true,
            invite,
          }
        } catch (error) {
          return {
            userId,
            error: 'Failed to create invite',
            success: false,
          }
        }
      })
    )

    const successful = invites.filter((inv) => inv.success)
    const failed = invites.filter((inv) => !inv.success)

    return NextResponse.json({
      success: true,
      invites: successful,
      failed,
      message: `${successful.length} invite(s) sent, ${failed.length} failed`,
    })
  } catch (error) {
    console.error('Error creating invites:', error)
    return NextResponse.json(
      { error: 'Failed to create invites' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id]/invite - Respond to event invite (accept/decline)
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
    const { status } = body

    // Validate status
    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED or DECLINED' },
        { status: 400 }
      )
    }

    // Find invite
    const invite = await db.eventInvite.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
      include: {
        event: true,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Update invite status
    const updatedInvite = await db.eventInvite.update({
      where: {
        eventId_userId: {
          eventId,
          userId: user.id,
        },
      },
      data: {
        status: status as InviteStatus,
        respondedAt: new Date(),
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            location: true,
          },
        },
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
      invite: updatedInvite,
      message: `Invite ${status.toLowerCase()}`,
    })
  } catch (error) {
    console.error('Error responding to invite:', error)
    return NextResponse.json(
      { error: 'Failed to respond to invite' },
      { status: 500 }
    )
  }
}
