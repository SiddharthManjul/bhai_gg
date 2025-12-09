import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(_req: NextRequest) {
  // Privy handles authentication client-side
  // This middleware is kept minimal for future use
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
