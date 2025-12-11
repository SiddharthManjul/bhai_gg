/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import Link from "next/link"
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
      {/* Header */}
      

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Welcome to Bhai Cabal
            </h2>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              A global community platform for Bhai Cabal members. Connect with members worldwide,
              attend events, and build the future together.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              {authenticated ? (
                <>
                  <Button asChild size="lg" className="text-lg">
                    <Link href="/profile">Go to Profile</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg">
                    <Link href="/directory">Browse Directory</Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="lg" className="text-lg">
                  <Link href="/auth/signin">Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <h3 className="mb-12 text-center text-3xl font-bold">Platform Features</h3>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>World Map</CardTitle>
                  <CardDescription>
                    View all Bhai Cabal members on an interactive world map
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Discover members in your city and connect with the global community.
                    Privacy-first: only city-level locations are shown.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events & Meetups</CardTitle>
                  <CardDescription>
                    Create and join community events with GPS verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Organize public or private events, verify attendance with GPS check-ins,
                    and earn NFT badges for participation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>NFT Badges</CardTitle>
                  <CardDescription>
                    Earn and collect contribution badges on Monad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track your contributions with on-chain badges. No wallet setup required -
                    we handle the blockchain complexity for you.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Member Directory</CardTitle>
                  <CardDescription>
                    Browse and search the entire Bhai Cabal community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Find members by location, interests, or contributions. Connect with
                    like-minded builders and creators.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    Track community growth and engagement metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View real-time stats on community activity, event attendance,
                    and member distribution across the globe.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Zero Friction</CardTitle>
                  <CardDescription>
                    Simple email sign-in, no wallet required
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Sign in with just your email. We handle all the blockchain complexity
                    behind the scenes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h3 className="mb-4 text-3xl font-bold">Ready to join?</h3>
          <p className="mb-8 text-lg text-muted-foreground">
            {authenticated
              ? "Explore the platform and connect with the community"
              : "Sign in to access the platform and connect with the community"
            }
          </p>
          {authenticated ? (
            <Button asChild size="lg">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/auth/signin">Sign In Now</Link>
            </Button>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Bhai.gg - Built for the Bhai Cabal community</p>
        </div>
      </footer>
    </div>
  )
}
