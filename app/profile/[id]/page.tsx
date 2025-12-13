/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
 
/* eslint-disable @next/next/no-img-element */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MapPin, Calendar, Award } from 'lucide-react'
import { useNotification } from '@/components/notification-provider'

interface UserBadge {
  id: string
  type: string
  nftMinted: boolean
  txHash: string | null
  tokenId: string | null
  awardedAt: string
  event?: {
    id: string
    name: string
  }
}

interface UserProfile {
  id: string
  name: string
  bio: string | null
  profileImage: string | null
  country: string | null
  state: string | null
  city: string | null
  xHandle: string | null
  linkedIn: string | null
  role: string
  createdAt: string
  _count: {
    badges: number
  }
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showError } = useNotification()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchUserProfile()
    fetchUserBadges()
  }, [user, id, router])

  const fetchUserProfile = async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()

      if (res.ok) {
        setProfile(data.user)
      } else {
        showError(data.error || 'Failed to load profile', 'Error')
        router.push('/directory')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      showError('Failed to load profile', 'Error')
      router.push('/directory')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserBadges = async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/users/${id}/badges`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()

      if (res.ok) {
        setBadges(data.badges || [])
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
    }
  }

  const getBadgeEmoji = (type: string) => {
    switch (type) {
      case 'STARTER':
        return '⭐'
      case 'ACTIVE':
        return '🔥'
      case 'VETERAN':
        return '💎'
      case 'ELITE':
        return '👑'
      case 'MEETUP':
        return '🤝'
      default:
        return '✅'
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'CONTRIBUTOR':
        return 'default'
      case 'USER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/directory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {profile.profileImage && (
                    <img
                      src={profile.profileImage}
                      alt={profile.name}
                      className="h-32 w-32 rounded-full object-cover border-4 border-muted"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h1 className="text-3xl font-bold">{profile.name}</h1>
                      <Badge variant={getRoleBadgeVariant(profile.role) as any}>
                        {profile.role}
                      </Badge>
                    </div>

                    {profile.bio && (
                      <p className="text-muted-foreground mb-4">{profile.bio}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      {(profile.city || profile.country) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {profile.city && profile.country
                              ? `${profile.city}, ${profile.country}`
                              : profile.country || profile.city}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Member since {new Date(profile.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      {profile.xHandle && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">X:</span>
                          <a
                            href={`https://x.com/${profile.xHandle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {profile.xHandle}
                          </a>
                        </div>
                      )}
                      {profile.linkedIn && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">LinkedIn:</span>
                          <a
                            href={profile.linkedIn.startsWith('http') ? profile.linkedIn : `https://${profile.linkedIn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Badge Collection */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Badge Collection
                  </CardTitle>
                  <CardDescription>
                    {profile._count.badges} {profile._count.badges === 1 ? 'badge' : 'badges'} earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {badges.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No badges yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-3xl shrink-0">{getBadgeEmoji(badge.type)}</span>
                          <div className="flex-1 min-w-0">
                            {badge.event && (
                              <p className="text-base font-bold">{badge.event.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{badge.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
