/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get("userEmail")
    const skillFilter = searchParams.get("skill") // Get skill filter from query params

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

    // Build where clause for filtering
    const whereClause: any = {}
    if (skillFilter) {
      whereClause.skills = {
        has: skillFilter
      }
    }

    // Fetch all users with only public fields
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        bio: true,
        skills: true,
        profileImage: true,
        country: true,
        city: true,
        xHandle: true,
        linkedIn: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            badges: true,
          },
        },
      },
    })

    // Get unique countries, cities, and skills for filters
    const countries = [...new Set(users.map(u => u.country).filter(Boolean))].sort()
    const cities = [...new Set(users.map(u => u.city).filter(Boolean))].sort()
    const allSkills = users.flatMap(u => Array.isArray(u.skills) ? u.skills : [])
    const skills = [...new Set(allSkills)].filter(Boolean).sort()

    return NextResponse.json({
      users,
      filters: {
        countries,
        cities,
        skills,
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
