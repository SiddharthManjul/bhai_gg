import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

// POST /api/events/[id]/badge-image - Set badge image for event
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

    // Get event
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check authorization - must be event creator or admin
    const isCreator = event.createdById === user.id
    const isAdmin = user.role === 'ADMIN'

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the event creator or admin can set the badge image' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { badgeImage } = body

    if (!badgeImage) {
      return NextResponse.json(
        { error: 'Badge image is required' },
        { status: 400 }
      )
    }

    // Validate that it's a base64 image
    if (!badgeImage.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      )
    }

    // Update event with badge image
    await db.event.update({
      where: { id: eventId },
      data: { badgeImage },
    })

    return NextResponse.json({
      success: true,
      message: 'Badge image saved successfully',
    })
  } catch (error) {
    console.error('Error saving badge image:', error)
    return NextResponse.json(
      { error: 'Failed to save badge image' },
      { status: 500 }
    )
  }
}
