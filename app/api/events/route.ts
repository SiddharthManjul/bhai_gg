/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { EventStatus } from '@/generated/prisma/client'
import { randomBytes } from 'crypto'
import { generateEventBadgeImage } from '@/lib/generate-nft-image'

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      name,
      hostName,
      startTime,
      endTime,
    } = body

    // Validate required fields
    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start time must be in the future' },
        { status: 400 }
      )
    }

    // Generate unique QR secret
    const qrSecret = randomBytes(32).toString('hex')

    // Auto-approve events created by admins
    const approvalStatus = user.role === 'ADMIN' ? EventStatus.APPROVED : EventStatus.PENDING

    // Generate NFT badge image with event name
    let badgeImage: string | null = null
    try {
      badgeImage = await generateEventBadgeImage(name)
    } catch (error) {
      console.error('Error generating badge image:', error)
      // Continue with event creation even if badge image generation fails
    }

    // Create event
    const event = await db.event.create({
      data: {
        name,
        hostName: hostName || null,
        description: null,
        isPublic: true,
        maxAttendees: null,
        location: null,
        latitude: null,
        longitude: null,
        radius: null,
        startTime: start,
        endTime: end,
        qrSecret,
        badgeImage,
        approvalStatus,
        createdById: user.id,
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
      },
    })

    return NextResponse.json({
      success: true,
      event,
      message: user.role === 'ADMIN'
        ? 'Event created and approved'
        : 'Event created and pending admin approval',
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const isPublic = searchParams.get('isPublic')
    const upcoming = searchParams.get('upcoming')
    const myEvents = searchParams.get('myEvents')
    const includeAttendances = searchParams.get('includeAttendances')

    // Build where clause
    const where: any = {}

    // Regular users only see approved events (unless viewing their own)
    if (user.role !== 'ADMIN') {
      if (myEvents === 'true') {
        where.createdById = user.id
      } else {
        where.approvalStatus = EventStatus.APPROVED
      }
    } else {
      // Admins can filter by status
      if (status) {
        where.approvalStatus = status
      }
    }

    // Filter by public/private
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // Filter by upcoming events
    if (upcoming === 'true') {
      where.startTime = {
        gte: new Date(),
      }
    }

    // Build include clause
    const includeClause: any = {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
      invites: {
        where: { userId: user.id },
      },
      joinRequests: {
        where: { userId: user.id },
      },
      _count: {
        select: {
          rsvps: true,
          attendances: true,
        },
      },
    }

    // Include full RSVPs with user data for badge minting (admins or event creators)
    if (includeAttendances === 'true' && (user.role === 'ADMIN' || myEvents === 'true')) {
      includeClause.rsvps = {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              walletAddress: true,
              profileImage: true,
            },
          },
        },
      }
      includeClause.attendances = {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              walletAddress: true,
              profileImage: true,
            },
          },
        },
      }
    } else {
      // For regular event listing, only include current user's RSVP
      includeClause.rsvps = {
        where: { userId: user.id },
      }
    }

    // Fetch events
    const events = await db.event.findMany({
      where,
      include: includeClause,
      orderBy: {
        startTime: 'asc',
      },
    })

    // For non-admin users, filter events based on access permissions
    let filteredEvents = events

    if (user.role !== 'ADMIN' && myEvents !== 'true') {
      filteredEvents = events.filter((event: any) => {
        // All APPROVED public events are visible to everyone
        if (event.isPublic && event.approvalStatus === 'APPROVED') {
          return true
        }

        // Private events: must have accepted invite or be creator
        if (!event.isPublic) {
          if (event.createdById === user.id) {
            return true
          }

          const hasAcceptedInvite = event.invites?.some(
            (inv: any) => inv.status === 'ACCEPTED'
          )
          return hasAcceptedInvite
        }

        return false
      })
    }

    // Remove sensitive data (QR secret)
    const sanitizedEvents = filteredEvents.map((event: any) => {
      const { qrSecret, ...rest } = event
      return {
        ...rest,
        userRsvp: event.rsvps?.[0] || null,
        userInvite: event.invites?.[0] || null,
        userJoinRequest: event.joinRequests?.[0] || null,
        rsvpCount: event._count?.rsvps || 0,
        attendanceCount: event._count?.attendances || 0,
      }
    })

    return NextResponse.json({ events: sanitizedEvents })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
