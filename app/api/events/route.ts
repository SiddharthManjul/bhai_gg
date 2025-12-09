/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'
import { EventStatus } from '@/generated/prisma/client'
import { randomBytes } from 'crypto'

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
      description,
      isPublic,
      maxAttendees,
      location,
      latitude,
      longitude,
      radius,
      startTime,
      endTime,
    } = body

    // Validate required fields
    if (!name || !location || !latitude || !longitude || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Create event
    const event = await db.event.create({
      data: {
        name,
        description,
        isPublic: isPublic ?? true,
        maxAttendees: maxAttendees || null,
        location,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius || 100,
        startTime: start,
        endTime: end,
        qrSecret,
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

    // Fetch events
    const events = await db.event.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        rsvps: {
          where: { userId: user.id },
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
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // For non-admin users, filter events based on access permissions
    let filteredEvents = events

    if (user.role !== 'ADMIN' && myEvents !== 'true') {
      filteredEvents = events.filter((event) => {
        // All APPROVED public events are visible to everyone
        if (event.isPublic && event.approvalStatus === 'APPROVED') {
          return true
        }

        // Private events: must have accepted invite or be creator
        if (!event.isPublic) {
          if (event.createdById === user.id) {
            return true
          }

          const hasAcceptedInvite = event.invites.some(
            (inv) => inv.status === 'ACCEPTED'
          )
          return hasAcceptedInvite
        }

        return false
      })
    }

    // Remove sensitive data (QR secret)
    const sanitizedEvents = filteredEvents.map((event) => {
      const { qrSecret, ...rest } = event
      return {
        ...rest,
        userRsvp: event.rsvps[0] || null,
        userInvite: event.invites[0] || null,
        userJoinRequest: event.joinRequests[0] || null,
        rsvpCount: event._count.rsvps,
        attendanceCount: event._count.attendances,
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
