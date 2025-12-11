import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPrivyUserId } from '@/lib/auth'

/**
 * POST /api/events/[id]/import-guests
 * Import guest list from CSV
 *
 * Expected CSV format:
 * email,name,approval_status,registration_status
 * john@example.com,John Doe,approved,registered
 * jane@example.com,Jane Smith,approved,registered
 *
 * Status values:
 * - approval_status: approved, pending, declined, waitlist
 * - registration_status: registered, cancelled
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { csvData, clearExisting = false } = body

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.user.findUnique({
      where: { privyId: privyUserId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get event
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        creator: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Authorization: User must be admin or event creator
    const isAdmin = user.role === 'ADMIN'
    const isEventCreator = event.createdById === user.id

    if (!isAdmin && !isEventCreator) {
      return NextResponse.json(
        { error: 'Only admins or event creators can import guests' },
        { status: 403 }
      )
    }

    // Parse CSV
    const guests = parseCSV(csvData)

    if (guests.length === 0) {
      return NextResponse.json(
        { error: 'No valid guests found in CSV' },
        { status: 400 }
      )
    }

    // Clear existing guests if requested
    if (clearExisting) {
      await db.eventGuest.deleteMany({
        where: { eventId },
      })
    }

    // Import guests
    const results = {
      imported: 0,
      skipped: 0,
      linked: 0,
      errors: [] as string[],
    }

    for (const guest of guests) {
      try {
        // Check if guest already exists
        const existing = await db.eventGuest.findUnique({
          where: {
            eventId_email: {
              eventId,
              email: guest.email.toLowerCase(),
            },
          },
        })

        if (existing && !clearExisting) {
          results.skipped++
          continue
        }

        // Find user by email if exists
        const existingUser = await db.user.findUnique({
          where: { email: guest.email.toLowerCase() },
        })

        // Create or update guest entry
        await db.eventGuest.upsert({
          where: {
            eventId_email: {
              eventId,
              email: guest.email.toLowerCase(),
            },
          },
          create: {
            eventId,
            email: guest.email.toLowerCase(),
            name: guest.name,
            approvalStatus: guest.approvalStatus,
            registrationStatus: guest.registrationStatus,
            userId: existingUser?.id,
          },
          update: {
            name: guest.name,
            approvalStatus: guest.approvalStatus,
            registrationStatus: guest.registrationStatus,
            userId: existingUser?.id,
          },
        })

        results.imported++

        // If user exists and approved, auto-create RSVP
        if (existingUser && guest.approvalStatus === 'APPROVED') {
          await db.eventRsvp.upsert({
            where: {
              eventId_userId: {
                eventId,
                userId: existingUser.id,
              },
            },
            create: {
              eventId,
              userId: existingUser.id,
              status: 'GOING',
            },
            update: {
              status: 'GOING',
            },
          })
          results.linked++
        }
      } catch (error) {
        console.error('Error importing guest:', guest.email, error)
        results.errors.push(`${guest.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} guests`,
      results,
    })
  } catch (error) {
    console.error('Error importing guests:', error)
    return NextResponse.json(
      { error: 'Failed to import guests' },
      { status: 500 }
    )
  }
}

/**
 * Parse CSV data into guest objects
 */
function parseCSV(csvData: string): Array<{
  email: string
  name: string
  approvalStatus: 'APPROVED' | 'PENDING' | 'DECLINED' | 'WAITLIST'
  registrationStatus: 'REGISTERED' | 'CANCELLED'
}> {
  const lines = csvData.trim().split('\n')
  const guests: Array<{
    email: string
    name: string
    approvalStatus: 'APPROVED' | 'PENDING' | 'DECLINED' | 'WAITLIST'
    registrationStatus: 'REGISTERED' | 'CANCELLED'
  }> = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV line (handle quoted values)
    const values = parseCSVLine(line)

    if (values.length < 2) continue

    const email = values[0]?.trim()
    const name = values[1]?.trim()
    const approvalStatusRaw = values[2]?.trim().toUpperCase() || 'APPROVED'
    const registrationStatusRaw = values[3]?.trim().toUpperCase() || 'REGISTERED'

    // Validate email
    if (!email || !email.includes('@')) continue
    if (!name) continue

    // Map approval status
    let approvalStatus: 'APPROVED' | 'PENDING' | 'DECLINED' | 'WAITLIST' = 'APPROVED'
    if (approvalStatusRaw === 'PENDING') approvalStatus = 'PENDING'
    else if (approvalStatusRaw === 'DECLINED') approvalStatus = 'DECLINED'
    else if (approvalStatusRaw === 'WAITLIST') approvalStatus = 'WAITLIST'

    // Map registration status
    let registrationStatus: 'REGISTERED' | 'CANCELLED' = 'REGISTERED'
    if (registrationStatusRaw === 'CANCELLED') registrationStatus = 'CANCELLED'

    guests.push({
      email: email.toLowerCase(),
      name,
      approvalStatus,
      registrationStatus,
    })
  }

  return guests
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quotes
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last value
  values.push(current.trim())

  return values
}

/**
 * GET /api/events/[id]/import-guests
 * Get imported guest list for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Get user
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

    // Authorization
    const isAdmin = user.role === 'ADMIN'
    const isEventCreator = event.createdById === user.id

    if (!isAdmin && !isEventCreator) {
      return NextResponse.json(
        { error: 'Only admins or event creators can view guests' },
        { status: 403 }
      )
    }

    // Get guests
    const guests = await db.eventGuest.findMany({
      where: { eventId },
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
      orderBy: {
        importedAt: 'desc',
      },
    })

    return NextResponse.json({
      guests,
      total: guests.length,
      approved: guests.filter((g) => g.approvalStatus === 'APPROVED').length,
      linked: guests.filter((g) => g.userId !== null).length,
    })
  } catch (error) {
    console.error('Error fetching guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id]/import-guests
 * Clear all imported guests for an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const privyUserId = await getPrivyUserId(request)

    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Get user
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

    // Authorization
    const isAdmin = user.role === 'ADMIN'
    const isEventCreator = event.createdById === user.id

    if (!isAdmin && !isEventCreator) {
      return NextResponse.json(
        { error: 'Only admins or event creators can delete guests' },
        { status: 403 }
      )
    }

    // Delete all guests
    const result = await db.eventGuest.deleteMany({
      where: { eventId },
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} guests`,
      count: result.count,
    })
  } catch (error) {
    console.error('Error deleting guests:', error)
    return NextResponse.json(
      { error: 'Failed to delete guests' },
      { status: 500 }
    )
  }
}
