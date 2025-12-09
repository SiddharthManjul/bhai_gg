import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

// Debug endpoint to see raw database data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('userEmail')

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

    // Fetch ALL users to see what we have
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    })

    // Fetch users with city/country (the ones we try to show on map)
    const usersWithLocation = await prisma.user.findMany({
      where: {
        city: { not: null },
        country: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    })

    return NextResponse.json({
      totalUsers: allUsers.length,
      usersWithLocation: usersWithLocation.length,
      allUsersData: allUsers,
      usersWithLocationData: usersWithLocation,
    })
  } catch (error) {
    console.error("Error fetching debug data:", error)
    return NextResponse.json(
      { error: "Failed to fetch debug data" },
      { status: 500 }
    )
  }
}
