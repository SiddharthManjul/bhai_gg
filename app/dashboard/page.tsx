/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, useRef } from 'react'

export default function DashboardPage() {
  const { user, logout } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()
  const redirectingRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user && pathname === '/dashboard' && !redirectingRef.current) {
      redirectingRef.current = true
      router.push('/auth/signin')
      return
    }

    if (user) {
      fetchProfile()
    }
  }, [user, pathname, router])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile?email=${user?.email?.address}`)
      const data = await res.json()

      if (data.user) {
        setProfile(data.user)
        // Check if user is admin
        if (data.user.role === 'ADMIN') {
          setIsAdmin(true)
        }
        // Check if profile is complete
        if (!data.user.name || !data.user.city || !data.user.profileImage) {
          router.push('/profile')
        }
      } else {
        // No profile yet, redirect to profile setup
        router.push('/profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    logout()
    router.push('/auth/signin')
  }

  if (!user || loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {profile.profileImage && (
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-muted"
              />
            )}
            <div className="flex-1 text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl font-bold">Welcome back, {profile.name}!</CardTitle>
              <CardDescription>
                You&apos;re signed in with Dynamic
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Profile</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="mt-1 text-sm">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="mt-1 text-sm">{user?.email?.address || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                <dd className="mt-1 text-sm">{profile.city}, {profile.country}</dd>
              </div>
              {profile.bio && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Bio</dt>
                  <dd className="mt-1 text-sm">{profile.bio}</dd>
                </div>
              )}
              {profile.xHandle && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">X (Twitter)</dt>
                  <dd className="mt-1 text-sm">{profile.xHandle}</dd>
                </div>
              )}
              {profile.linkedIn && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">LinkedIn</dt>
                  <dd className="mt-1 text-sm truncate">{profile.linkedIn}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• World map view coming soon</li>
              <li>• Bhai directory coming soon</li>
              <li>• Event creation coming soon</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            {isAdmin && (
              <Button onClick={() => router.push('/admin')} className="w-full" size="lg">
                Admin Panel
              </Button>
            )}
            <Button onClick={() => router.push('/map')} variant="outline" className="w-full" size="lg">
              World Map
            </Button>
            <Button onClick={() => router.push('/directory')} variant="outline" className="w-full" size="lg">
              Browse Directory
            </Button>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => router.push('/profile')} variant="outline" className="flex-1" size="lg">
                Edit Profile
              </Button>
              <Button onClick={handleLogout} variant="outline" className="flex-1" size="lg">
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
