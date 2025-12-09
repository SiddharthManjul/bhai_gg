import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authUserId, email, name, bio, city, state, country, latitude, longitude, xHandle, linkedIn, phone, walletAddress, profileImage } = body

    if (!authUserId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      )
    }

    // Upsert user - create if doesn't exist, update if exists
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        privyId: authUserId, // Update privyId for existing users
        name,
        bio,
        city,
        state,
        country,
        latitude,
        longitude,
        xHandle,
        linkedIn,
        phone,
        walletAddress,
        profileImage,
      },
      create: {
        privyId: authUserId, // Use Privy's user ID
        email,
        name,
        bio,
        city,
        state,
        country,
        latitude,
        longitude,
        xHandle,
        linkedIn,
        phone,
        walletAddress,
        profileImage,
        emailVerified: new Date(),
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Error saving profile:", error)
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        privyId: true,
        email: true,
        name: true,
        bio: true,
        city: true,
        state: true,
        country: true,
        latitude: true,
        longitude: true,
        xHandle: true,
        linkedIn: true,
        phone: true,
        walletAddress: true,
        profileImage: true,
        role: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
