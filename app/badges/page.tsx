/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
 
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UserBadge {
  id: string
  type: string
  nftMinted: boolean
  txHash: string | null
  tokenId: string | null
  awardedAt: string
}

interface ClaimableEvent {
  id: string
  name: string
  location: string
  startTime: string
  hasCheckedIn: boolean
  alreadyClaimed: boolean
  hasBadgeImage: boolean
}

export default function MyBadgesPage() {
  const { user, authenticated, ready, getAccessToken } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [claimableEvents, setClaimableEvents] = useState<ClaimableEvent[]>([])
  const [minting, setMinting] = useState<string | null>(null)
  const [mintSuccess, setMintSuccess] = useState<{eventId: string, txHash: string} | null>(null)

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/auth/signin')
      return
    }

    if (ready && authenticated) {
      fetchBadgesAndEvents()
    }
  }, [ready, authenticated, router])

  const fetchBadgesAndEvents = async () => {
    try {
      const token = await getAccessToken()

      // Fetch user's badges
      const badgesRes = await fetch('/api/badges/my-badges', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (badgesRes.ok) {
        const data = await badgesRes.json()
        setBadges(data.badges || [])
        setClaimableEvents(data.claimableEvents || [])
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimBadge = async (eventId: string) => {
    setMinting(eventId)
    setMintSuccess(null)

    try {
      const token = await getAccessToken()
      const res = await fetch('/api/badges/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setMintSuccess({ eventId, txHash: data.txHash })
        // Refresh badges
        await fetchBadgesAndEvents()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error claiming badge:', error)
      alert('Failed to claim badge')
    } finally {
      setMinting(null)
    }
  }

  const getTwitterShareUrl = (eventName: string) => {
    const text = `I just claimed my NFT badge for attending "${eventName}" on @bhai_gg! 🎉\n\nPowered by @monad_xyz`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Badges</h1>
          <p className="text-muted-foreground mt-2">
            View and claim your NFT badges for events you attended
          </p>
        </div>

        {/* Mint Success Alert */}
        {mintSuccess && (
          <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    Badge Minted Successfully!
                  </p>
                </div>
                <a
                  href={getTwitterShareUrl(
                    claimableEvents.find(e => e.id === mintSuccess.eventId)?.name || 'Event'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black hover:bg-gray-800 text-white rounded-md transition-colors w-fit"
                >
                  𝕏 Share on Twitter
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claimable Badges */}
        {claimableEvents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Claim Your Badges</CardTitle>
              <CardDescription>
                These events have badges available for you to claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {claimableEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-semibold">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.location} • {new Date(event.startTime).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {event.hasCheckedIn && (
                          <Badge variant="outline" className="text-xs">✓ Checked In</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {event.alreadyClaimed ? (
                        <Badge variant="default">✓ Claimed</Badge>
                      ) : (
                        <Button
                          onClick={() => handleClaimBadge(event.id)}
                          disabled={minting === event.id}
                          size="sm"
                        >
                          {minting === event.id ? 'Minting...' : '🎁 Claim Badge'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Your Badge Collection</CardTitle>
            <CardDescription>
              {badges.length} badge{badges.length !== 1 ? 's' : ''} collected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {badges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven&apos;t collected any badges yet.</p>
                <p className="text-sm mt-2">
                  Attend events and claim your NFT badges!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-4 border rounded-lg bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">{badge.type.replace('_', ' ')}</Badge>
                      {badge.nftMinted && (
                        <span className="text-xs text-green-600">✓ On-chain</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Awarded {new Date(badge.awardedAt).toLocaleDateString()}
                    </p>

                    {badge.txHash && (
                      <a
                        href={getTwitterShareUrl(badge.type.replace('_', ' '))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-black hover:bg-gray-800 text-white rounded transition-colors w-fit"
                      >
                        𝕏 Share
                      </a>
                    )}

                    {badge.tokenId && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Token #{badge.tokenId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
