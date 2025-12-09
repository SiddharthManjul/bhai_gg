import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("adminEmail")

    if (!email) {
      return NextResponse.json(
        { error: "Admin email required" },
        { status: 401 }
      )
    }

    // Check if requester is admin
    const admin = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    })

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      )
    }

    // Fetch all users with all fields (admin can see everything)
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        profileImage: true,
        country: true,
        state: true,
        city: true,
        latitude: true,
        longitude: true,
        xHandle: true,
        linkedIn: true,
        phone: true,
        walletAddress: true,
        notes: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { adminEmail, userId, role } = body

    if (!adminEmail) {
      return NextResponse.json(
        { error: "Admin email required" },
        { status: 401 }
      )
    }

    // Check if requester is admin
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { role: true },
    })

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      )
    }

    // Validate role
    if (!["USER", "CONTRIBUTOR", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Error updating user role:", error)
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    )
  }
}
