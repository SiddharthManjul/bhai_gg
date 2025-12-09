import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getCityCoordinates, delay } from "@/lib/geocoding"

export interface MapPin {
  city: string
  country: string
  userCount: number
  users: {
    id: string
    name: string
    bio: string | null
    profileImage: string | null
  }[]
  // City center coordinates from OpenStreetMap
  latitude: number
  longitude: number
}

export interface MapPin {
  city: string
  country: string
  latitude: number
  longitude: number
  userCount: number
  users: {
    id: string
    name: string
    bio: string | null
    profileImage: string | null
  }[]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('userEmail')

    console.log('🗺️ MAP API: Starting map data fetch...')

    // Check if user is authenticated
    if (!userEmail) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Verify user exists
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    console.log(`🗺️ MAP API: Authenticated user: ${currentUser.email}`)

    // Fetch all users with city/country (ignore GPS coordinates)
    const users = await prisma.user.findMany({
      where: {
        city: { not: null },
        country: { not: null },
      },
      select: {
        id: true,
        name: true,
        bio: true,
        profileImage: true,
        city: true,
        country: true,
      },
    })

    console.log(`🗺️ MAP API: Found ${users.length} users with city/country`)
    console.log('🗺️ MAP API: User details:')
    users.forEach(u => {
      console.log(`  - ${u.name}: ${u.city}, ${u.country}`)
    })

    // Group users by city
    const cityGroups: Record<string, {
      city: string
      country: string
      users: Array<{
        id: string
        name: string
        bio: string | null
        profileImage: string | null
      }>
    }> = {}

    users.forEach((user) => {
      // Normalize city and country for grouping (trim and lowercase for matching)
      const normalizedCity = user.city!.trim().toLowerCase()
      const normalizedCountry = user.country!.trim().toLowerCase()
      const key = `${normalizedCity},${normalizedCountry}`

      if (!cityGroups[key]) {
        cityGroups[key] = {
          city: user.city!.trim(),  // Use original case for display
          country: user.country!.trim(),
          users: [],
        }
        console.log(`🆕 Created new city group: "${key}"`)
      }

      cityGroups[key].users.push({
        id: user.id,
        name: user.name || 'Anonymous',
        bio: user.bio,
        profileImage: user.profileImage,
      })

      console.log(`  👤 Added "${user.name}" to "${key}" (total: ${cityGroups[key].users.length} users)`)
    })

    // Geocode all cities and create ONE pin per city
    const pins: MapPin[] = []

    console.log(`🗺️ MAP API: Processing ${Object.keys(cityGroups).length} city groups...`)

    for (const [, group] of Object.entries(cityGroups)) {
      console.log(`\n🗺️ MAP API: Processing ${group.city}, ${group.country} (${group.users.length} users)`)

      // ONLY use OpenStreetMap geocoding - ignore GPS coordinates completely
      console.log(`  📍 Geocoding city using OpenStreetMap...`)
      const coords = await getCityCoordinates(group.city, group.country)

      if (!coords) {
        console.error(`  ✗ Geocoding failed for ${group.city}, ${group.country}`)
        console.error(`  ✗ SKIPPING this city`)
        continue
      }

      console.log(`  ✓ Geocoded successfully: ${coords.latitude}, ${coords.longitude}`)

      // Create ONE pin for this city with ALL users
      pins.push({
        city: group.city,
        country: group.country,
        latitude: coords.latitude,
        longitude: coords.longitude,
        userCount: group.users.length,
        users: group.users,
      })

      console.log(`  ✓ Created pin for ${group.city}, ${group.country} with ${group.users.length} users`)

      // Respect rate limits (1 request per second for Nominatim)
      await delay(1000)
    }

    console.log(`\n🗺️ MAP API: ========================================`)
    console.log(`🗺️ MAP API: FINAL SUMMARY`)
    console.log(`🗺️ MAP API: Total pins created: ${pins.length}`)
    console.log(`🗺️ MAP API: Total users: ${users.length}`)
    console.log(`🗺️ MAP API: ========================================\n`)

    return NextResponse.json({ pins })
  } catch (error) {
    console.error("Error fetching map data:", error)
    return NextResponse.json(
      { error: "Failed to fetch map data" },
      { status: 500 }
    )
  }
}
