import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get("userEmail")

    // Check if user is authenticated (has email)
    if (!userEmail) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to view the directory." },
        { status: 401 }
      )
    }

    // Verify the user exists in database (is registered)
    const requestingUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })

    if (!requestingUser) {
      return NextResponse.json(
        { error: "User not found. Please complete your registration." },
        { status: 403 }
      )
    }

    // Fetch all users with only public fields
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        bio: true,
        profileImage: true,
        country: true,
        city: true,
        xHandle: true,
        linkedIn: true,
        role: true,
        createdAt: true,
      },
    })

    // Get unique countries and cities for filters
    const countries = [...new Set(users.map(u => u.country).filter(Boolean))].sort()
    const cities = [...new Set(users.map(u => u.city).filter(Boolean))].sort()

    return NextResponse.json({
      users,
      filters: {
        countries,
        cities,
      }
    })
  } catch (error) {
    console.error("Error fetching directory:", error)
    return NextResponse.json(
      { error: "Failed to fetch directory" },
      { status: 500 }
    )
  }
}
