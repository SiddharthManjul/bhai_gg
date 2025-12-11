import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// POST /api/events/[id]/approve-minting - Approve attendees for NFT minting
export async function POST(
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

    const body = await request.json()
    const { attendeeIds, approved } = body

    if (!Array.isArray(attendeeIds) || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: attendeeIds must be an array and approved must be a boolean' },
        { status: 400 }
      )
    }

    // Get event
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is admin or event creator
    if (user.role !== 'ADMIN' && event.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Only admins and event creators can approve attendees for minting' },
        { status: 403 }
      )
    }

    // Update approval status for all specified attendees
    await db.eventAttendance.updateMany({
      where: {
        eventId,
        userId: {
          in: attendeeIds,
        },
      },
      data: {
        approvedForMinting: approved,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${attendeeIds.length} attendee${attendeeIds.length !== 1 ? 's' : ''} ${approved ? 'approved' : 'disapproved'} for minting`,
    })
  } catch (error) {
    console.error('Error updating minting approval:', error)
    return NextResponse.json(
      { error: 'Failed to update minting approval' },
      { status: 500 }
    )
  }
}
