/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import Link from "next/link"
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const { authenticated, user, logout } = usePrivy()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authenticated && user) {
      checkIfAdmin()
    }
  }, [authenticated, user])

  const checkIfAdmin = async () => {
    try {
      const res = await fetch(`/api/profile?email=${user?.email?.address}`)
      const data = await res.json()
      if (data.user?.role === 'ADMIN') {
        setIsAdmin(true)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const handleLogout = async () => {
    logout()
    setIsAdmin(false)
    router.push('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 flex items-center justify-center">
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to Bhai Cabal
            </h2>
            <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
              A global community platform for Bhai Cabal members. Connect with members worldwide,
              attend events, and build the future together.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              {authenticated ? (
                <>
                  <Button asChild size="lg" className="text-lg">
                    <Link href="/profile">My Profile</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg">
                    <Link href="/directory">Directory</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg">
                    <Link href="/events">Events</Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="outline" size="lg" className="text-lg">
                      <Link href="/admin">Admin</Link>
                    </Button>
                  )}
                </>
              ) : (
                <Button asChild size="lg" className="text-lg">
                  <Link href="/auth/signin">Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Bhai.gg - Built for the Bhai Cabal community</p>
        </div>
      </footer>
    </div>
  )
}
