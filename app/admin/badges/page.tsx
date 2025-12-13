/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotification } from '@/components/notification-provider'

interface Event {
  id: string
  name: string
  location: string
  startTime: string
  rsvps?: Rsvp[]
  attendances?: Attendance[]
}

interface Rsvp {
  id: string
  userId: string
  status: 'GOING' | 'NOT_GOING'
  user: {
    id: string
    name: string
    email: string
    walletAddress: string | null
    profileImage: string | null
  }
}

interface Attendance {
  id: string
  userId: string
  nftMinted: boolean
  txHash: string | null
  user: {
    id: string
    name: string
    email: string
    walletAddress: string | null
    profileImage: string | null
  }
}

const BADGE_TYPES = [
  { value: '0', label: 'Starter' },
  { value: '1', label: 'Active' },
  { value: '2', label: 'Veteran' },
  { value: '3', label: 'Elite' },
  { value: '4', label: 'Event Attendance' },
  { value: '5', label: 'Meetup' },
]

export default function AdminBadgesPage() {
  const { user, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())
  const [badgeType, setBadgeType] = useState('4') // Default: EVENT_ATTENDANCE
  const [minting, setMinting] = useState(false)
  const [mintResult, setMintResult] = useState<any>(null)
  const [manualAddresses, setManualAddresses] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('event')
  const [badgeImage, setBadgeImage] = useState<string>('')
  const [badgeImagePreview, setBadgeImagePreview] = useState<string>('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    checkAdminAndFetchEvents()
  }, [user, router])

  const checkAdminAndFetchEvents = async () => {
    try {
      // Check user role by fetching profile
      console.log('👤 Checking user profile for:', user?.email?.address)
      const res = await fetch(`/api/profile?email=${user?.email?.address}`)

      if (!res.ok) {
        console.error('Profile fetch failed:', res.status)
        router.push('/')
        return
      }

      const data = await res.json()
      console.log('👤 Profile data:', data)

      // Admins have full access, event creators can access their own events
      const userIsAdmin = data.user && data.user.role === 'ADMIN'
      console.log('👤 Is admin:', userIsAdmin)
      setIsAdmin(userIsAdmin)
      // Note: Non-admins can still access this page to mint badges for their own events

      console.log('🔄 Fetching events with admin status:', userIsAdmin)
      await fetchEvents(userIsAdmin)
    } catch (error) {
      console.error('Error checking user status:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async (adminStatus?: boolean) => {
    try {
      const token = await getAccessToken()

      // Admins can see all events, non-admins only see their own events
      // Use the passed adminStatus or fall back to isAdmin state
      const shouldFetchAll = adminStatus !== undefined ? adminStatus : isAdmin

      // Always include attendances and myEvents parameter for proper filtering
      const endpoint = shouldFetchAll
        ? '/api/events?includeAttendances=true'
        : '/api/events?myEvents=true&includeAttendances=true'

      console.log('🔗 Fetching from endpoint:', endpoint)
      console.log('🔗 Should fetch all events:', shouldFetchAll)

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Fetched events:', data.events)
        console.log('📊 Total events returned:', data.events?.length || 0)

        // Show events that have RSVPs (people going)
        const eventsWithRsvps = data.events.filter((e: Event) => {
          const goingRsvps = e.rsvps?.filter(r => r.status === 'GOING') || []
          return goingRsvps.length > 0
        })

        console.log('📊 Events with RSVPs:', eventsWithRsvps.length)
        console.log('📊 Filtered events:', eventsWithRsvps)

        setEvents(eventsWithRsvps)
      } else {
        console.error('Failed to fetch events:', res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        console.error('Error response:', errorData)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId)
    const event = events.find((e) => e.id === eventId)
    setSelectedEvent(event || null)
    setSelectedAttendees(new Set())
    setMintResult(null)
    setBadgeImage('')
    setBadgeImagePreview('')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file', 'Invalid File Type')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB', 'File Too Large')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setBadgeImage(base64String)
      setBadgeImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const toggleAttendee = (userId: string) => {
    const newSelected = new Set(selectedAttendees)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedAttendees(newSelected)
  }

  const selectAll = () => {
    if (!selectedEvent) return

    const goingRsvps = selectedEvent.rsvps?.filter(r => r.status === 'GOING') || []
    const eligibleRsvps = goingRsvps.filter((r) => r.user.walletAddress)

    setSelectedAttendees(new Set(eligibleRsvps.map((r) => r.userId)))
  }

  const autoSelectAllAttendees = () => {
    if (!selectedEvent) return

    // Auto-select ALL RSVPs with wallet addresses
    const goingRsvps = selectedEvent.rsvps?.filter(r => r.status === 'GOING') || []
    const allWithWallets = goingRsvps.filter((r) => r.user.walletAddress)

    setSelectedAttendees(new Set(allWithWallets.map((r) => r.userId)))
  }

  const deselectAll = () => {
    setSelectedAttendees(new Set())
  }

  const handleMintBadges = async () => {
    if (!selectedEvent || selectedAttendees.size === 0) return

    if (!badgeImage) {
      showError('Please upload a badge image first', 'Badge Image Required')
      return
    }

    setMinting(true)
    setMintResult(null)

    try {
      const token = await getAccessToken()
      const res = await fetch('/api/nft/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          attendeeIds: Array.from(selectedAttendees),
          badgeType: parseInt(badgeType),
          badgeImage,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMintResult(data)
        showSuccess(`Successfully minted ${data.totalSuccess} badge${data.totalSuccess !== 1 ? 's' : ''}!`, 'Badges Minted')
        // Refresh events to update minted status
        await fetchEvents()
        // Update selected event
        const updatedEvent = events.find((e) => e.id === selectedEvent.id)
        setSelectedEvent(updatedEvent || null)
        setSelectedAttendees(new Set())
      } else {
        showError(data.error || 'Failed to mint badges', 'Minting Error')
      }
    } catch (error) {
      console.error('Error minting badges:', error)
      showError('Failed to mint badges. Please try again.', 'Minting Failed')
    } finally {
      setMinting(false)
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
    return null
  }

  // Get RSVPs who are going
  const goingRsvps = selectedEvent?.rsvps?.filter(r => r.status === 'GOING') || []

  const eligibleCount = goingRsvps.filter(
    (r) => r.user.walletAddress
  ).length || 0

  const noWalletCount = goingRsvps.filter(
    (r) => !r.user.walletAddress
  ).length || 0

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mint Event Badges</h1>
          <p className="text-muted-foreground mt-2">
            {isAdmin
              ? 'Select any event and mint NFT badges for attendees'
              : 'Select your event and mint NFT badges for attendees'}
          </p>
          {!isAdmin && (
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              You can only mint badges for events you created
            </p>
          )}
        </div>

        {/* Event Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Event & Upload Badge Design</CardTitle>
            <CardDescription>
              Choose an event and upload the NFT badge design
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div>
                <label className="text-sm font-medium">Event</label>
                <Select value={selectedEventId} onValueChange={handleEventSelect}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} ({event.rsvps?.filter(r => r.status === 'GOING').length || 0} RSVPs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Badge Type</label>
                <Select value={badgeType} onValueChange={setBadgeType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Badge Image Upload */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium">Badge Design (Required)</label>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload badge image (PNG, JPG, GIF, WebP - Max 5MB)
                  </p>
                </div>
                {badgeImagePreview && (
                  <div>
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img
                      src={badgeImagePreview}
                      alt="Badge preview"
                      className="h-32 w-32 object-contain border-2 border-muted rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {selectedEvent && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedEvent.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedEvent.location} • {new Date(selectedEvent.startTime).toLocaleDateString()}
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span>✅ {eligibleCount} with wallet</span>
                  <span>👥 {goingRsvps.length} total RSVPs</span>
                  <span>⚠️ {noWalletCount} no wallet</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Method */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="event">From Event Attendees</TabsTrigger>
            <TabsTrigger value="manual">Manual Addresses</TabsTrigger>
          </TabsList>

          <TabsContent value="event" className="mt-4">
            {/* Attendees List */}
            {selectedEvent && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Select RSVPs</CardTitle>
                        <CardDescription>
                          Choose people who RSVP&apos;d to receive badges ({selectedAttendees.size} selected)
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={autoSelectAllAttendees}
                        disabled={!selectedEvent}
                      >
                        ⚡ Auto-Select All with Wallets
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        disabled={eligibleCount === 0}
                      >
                        Select With Wallets Only
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAll}
                        disabled={selectedAttendees.size === 0}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {goingRsvps.map((rsvp) => {
                  const isEligible = !!rsvp.user.walletAddress
                  const isSelected = selectedAttendees.has(rsvp.userId)

                  return (
                    <div
                      key={rsvp.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isSelected ? 'border-primary bg-primary/5' : ''
                      } ${!isEligible ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'}`}
                      onClick={() => isEligible && toggleAttendee(rsvp.userId)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={!isEligible}
                          className="h-4 w-4"
                        />
                        {rsvp.user.profileImage && (
                          <img
                            src={rsvp.user.profileImage}
                            alt={rsvp.user.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{rsvp.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {rsvp.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!rsvp.user.walletAddress && (
                          <Badge variant="secondary">No Wallet</Badge>
                        )}
                        {rsvp.user.walletAddress && (
                          <Badge variant="outline">Ready</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleMintBadges}
                  disabled={selectedAttendees.size === 0 || minting}
                  className="w-full"
                  size="lg"
                >
                  {minting
                    ? 'Minting...'
                    : `🎁 Batch Mint ${selectedAttendees.size} Badge${selectedAttendees.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Address Distribution</CardTitle>
                <CardDescription>
                  Paste wallet addresses (one per line) to batch mint badges
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Wallet Addresses</label>
                  <Textarea
                    placeholder="0x123...&#10;0x456...&#10;0x789..."
                    value={manualAddresses}
                    onChange={(e) => setManualAddresses(e.target.value)}
                    rows={10}
                    className="mt-2 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter one wallet address per line. Invalid addresses will be skipped.
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    const addresses = manualAddresses
                      .split('\n')
                      .map(a => a.trim())
                      .filter(a => a.match(/^0x[a-fA-F0-9]{40}$/))

                    if (addresses.length === 0) {
                      showError('No valid addresses found. Please check the format.', 'Invalid Addresses')
                      return
                    }

                    if (!selectedEventId) {
                      showError('Please select an event first', 'Event Required')
                      return
                    }

                    if (!badgeImage) {
                      showError('Please upload a badge image first', 'Badge Image Required')
                      return
                    }

                    if (!confirm(`Mint badges to ${addresses.length} addresses?`)) {
                      return
                    }

                    setMinting(true)
                    setMintResult(null)

                    try {
                      const token = await getAccessToken()
                      const res = await fetch('/api/nft/mint', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          eventId: selectedEventId,
                          addresses,
                          badgeType: parseInt(badgeType),
                          badgeImage,
                        }),
                      })

                      const data = await res.json()

                      if (res.ok) {
                        setMintResult(data)
                        setManualAddresses('')
                        showSuccess(`Successfully minted ${data.totalSuccess} badge${data.totalSuccess !== 1 ? 's' : ''}!`, 'Badges Minted')
                      } else {
                        showError(data.error || 'Failed to mint badges', 'Minting Error')
                      }
                    } catch (error) {
                      console.error('Error minting badges:', error)
                      showError('Failed to mint badges. Please try again.', 'Minting Failed')
                    } finally {
                      setMinting(false)
                    }
                  }}
                  disabled={!manualAddresses.trim() || minting || !selectedEventId}
                  className="w-full"
                  size="lg"
                >
                  {minting
                    ? 'Minting...'
                    : `🎁 Batch Mint to ${manualAddresses.split('\n').filter(a => a.trim().match(/^0x[a-fA-F0-9]{40}$/)).length} Addresses`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mint Results */}
        {mintResult && (
          <Card>
            <CardHeader>
              <CardTitle>Minting Results</CardTitle>
              <CardDescription>
                {mintResult.totalSuccess} successful, {mintResult.totalFailed} failed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mintResult.results.map((result: any, index: number) => {
                  const twitterText = result.success && selectedEvent
                    ? `I just received an NFT badge for attending "${selectedEvent.name}" on @bhai_gg! 🎉\n\nPowered by @monad_xyz`
                    : ''

                  const twitterUrl = twitterText
                    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`
                    : ''

                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        result.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium truncate">
                          {result.userName || result.address}
                        </p>
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? '✓ Minted' : '✗ Failed'}
                        </Badge>
                      </div>

                      {result.success && result.txHash && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">TX:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs">
                              {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                            </code>
                            {result.tokenId && (
                              <span className="text-muted-foreground">
                                • Token #{result.tokenId}
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <a
                              href={twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-black hover:bg-gray-800 text-white rounded-md transition-colors w-fit"
                            >
                              𝕏 Share on Twitter
                            </a>
                          </div>
                        </div>
                      )}

                      {!result.success && (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {events.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No events with RSVPs found. Create an event and have users RSVP first.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
