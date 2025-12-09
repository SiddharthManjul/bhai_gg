/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from 'next/dynamic'

interface MapPin {
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

// Dynamically import the Map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/map/world-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <p>Loading map...</p>
    </div>
  ),
})

export default function MapPage() {
  const { user } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pins, setPins] = useState<MapPin[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchMapData()
  }, [user])

  const fetchMapData = async () => {
    try {
      const res = await fetch(`/api/map?userEmail=${user?.email?.address}`)

      if (res.status === 401 || res.status === 403) {
        setLoading(false)
        return
      }

      if (res.ok) {
        const data = await res.json()
        setPins(data.pins)
      }
    } catch (error) {
      console.error('Error fetching map data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Bhai World Map</CardTitle>
            <CardDescription>
              Sign in to view the community on the map
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Bhai world map is available to all registered members.
              Sign in to see where community members are located.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Map Content */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Card className="mb-4 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Community Members Around the World</CardTitle>
            <CardDescription className="text-sm">
              {pins.reduce((sum, pin) => sum + pin.userCount, 0)} {pins.reduce((sum, pin) => sum + pin.userCount, 0) === 1 ? 'member' : 'members'} in {pins.length} {pins.length === 1 ? 'city' : 'cities'}
              <br className="hidden sm:block" />
              <span className="text-xs block mt-2 sm:mt-1">Note: All locations from OpenStreetMap city centers. Privacy-first: only city-level locations shown.</span>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Map Container */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
              <MapComponent pins={pins} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
