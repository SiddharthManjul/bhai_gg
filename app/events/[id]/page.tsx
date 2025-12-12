/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
 
"use client"

import { useEffect, useState, use } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import CheckInButton from '@/components/events/check-in-button'
import { Calendar, MapPin, Users, ArrowLeft, QrCode, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import QRCode from 'qrcode'
import { useNotification } from '@/components/notification-provider'

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { authenticated, user, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showError, showSuccess } = useNotification()

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [copied, setCopied] = useState(false)

  // Badge claiming state
  const [canClaimBadge, setCanClaimBadge] = useState(false)
  const [badgeAlreadyClaimed, setBadgeAlreadyClaimed] = useState(false)
  const [claimingBadge, setClaimingBadge] = useState(false)
  const [badgeMintSuccess, setBadgeMintSuccess] = useState<string | null>(null)

  // Approval state
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())
  const [approvingAttendees, setApprovingAttendees] = useState(false)

  useEffect(() => {
    if (!authenticated) {
      // Save the current event page URL so we can redirect back after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', `/events/${id}`)
      }
      router.push('/auth/signin')
      return
    }

    checkIfAdmin()
    fetchEvent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, id, router])

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

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (res.ok) {
        setEvent(data.event)
        // Check badge claim status after loading event
        checkBadgeClaimStatus()
      } else {
        showError(data.error || 'Failed to load event', 'Error')
        router.push('/events')
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      showError('Failed to load event', 'Error')
      router.push('/events')
    } finally {
      setLoading(false)
    }
  }

  const checkBadgeClaimStatus = async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/badges/my-badges', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        const claimableEvent = data.claimableEvents?.find((e: any) => e.id === id)
        const alreadyClaimed = data.badges?.some((b: any) =>
          b.eventId === id || data.claimableEvents?.find((e: any) => e.id === id)?.alreadyClaimed
        )

        setCanClaimBadge(claimableEvent && !alreadyClaimed)
        setBadgeAlreadyClaimed(alreadyClaimed || false)
      }
    } catch (error) {
      console.error('Error checking badge status:', error)
    }
  }

  const handleClaimBadge = async () => {
    setClaimingBadge(true)
    setBadgeMintSuccess(null)

    try {
      const token = await getAccessToken()
      const res = await fetch('/api/badges/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId: id }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setBadgeMintSuccess(data.txHash)
        setBadgeAlreadyClaimed(true)
        setCanClaimBadge(false)
        showSuccess('NFT Badge claimed successfully!', 'Success')
        // Refresh event to update attendee list
        await fetchEvent()
      } else {
        showError(data.error || 'Failed to claim badge', 'Error')
      }
    } catch (error) {
      console.error('Error claiming badge:', error)
      showError('Failed to claim badge', 'Error')
    } finally {
      setClaimingBadge(false)
    }
  }

  const getExplorerUrl = (txHash: string) =>
    `https://testnet.monadvision.com/tx/${txHash}`

  const getTwitterShareUrl = (eventName: string, txHash: string) => {
    const text = `I just claimed my NFT badge for attending "${eventName}" on @bhai_gg! 🎉\n\nPowered by @monad_xyz\n\n${getExplorerUrl(txHash)}`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  }

  const generateQRCode = async () => {
    try {
      // Generate QR code with the event check-in URL
      const checkInUrl = `${window.location.origin}/events/${id}`
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      setQrCodeUrl(qrDataUrl)
      setShowQrCode(true)
    } catch (error) {
      console.error('Error generating QR code:', error)
      showError('Failed to generate QR code', 'Error')
    }
  }

  const copyCheckInLink = async () => {
    const checkInUrl = `${window.location.origin}/events/${id}`
    await navigator.clipboard.writeText(checkInUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleAttendeeSelection = (userId: string) => {
    const newSelected = new Set(selectedAttendees)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedAttendees(newSelected)
  }

  const selectAllAttendees = () => {
    if (!event.attendances) return
    const allAttendeeIds = event.attendances.map((a: any) => a.userId)
    setSelectedAttendees(new Set(allAttendeeIds))
  }

  const deselectAllAttendees = () => {
    setSelectedAttendees(new Set())
  }

  const handleApproveForMinting = async (approved: boolean) => {
    if (selectedAttendees.size === 0) {
      showError('Please select at least one attendee', 'No Selection')
      return
    }

    setApprovingAttendees(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${id}/approve-minting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendeeIds: Array.from(selectedAttendees),
          approved,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showSuccess(
          data.message || `${selectedAttendees.size} attendee${selectedAttendees.size !== 1 ? 's' : ''} ${approved ? 'approved' : 'disapproved'}`,
          'Success'
        )
        setSelectedAttendees(new Set())
        await fetchEvent()
      } else {
        showError(data.error || 'Failed to update approval status', 'Error')
      }
    } catch (error) {
      console.error('Error updating approval:', error)
      showError('Failed to update approval status', 'Error')
    } finally {
      setApprovingAttendees(false)
    }
  }

  if (!authenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!event) {
    return null
  }

  const startDate = new Date(event.startTime)
  const endDate = new Date(event.endTime)
  const isPast = endDate < new Date()
  const isUpcoming = startDate > new Date()
  const isOngoing = startDate <= new Date() && endDate >= new Date()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2 mb-2">
                  {event.approvalStatus === 'PENDING' && (
                    <Badge variant="secondary">Pending Approval</Badge>
                  )}
                  {event.approvalStatus === 'REJECTED' && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                  {isPast && <Badge variant="secondary">Ended</Badge>}
                  {isOngoing && <Badge className="bg-green-600">Ongoing</Badge>}
                  {isUpcoming && <Badge>Upcoming</Badge>}
                  {event.isPublic ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="outline">Private</Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{event.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  {event.creator.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.creator.profileImage}
                      alt={event.creator.name}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {event.creator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  Organized by {event.creator.name}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {event.description && (
                  <p className="text-muted-foreground">{event.description}</p>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{format(startDate, 'PPPP')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, 'p')} - {format(endDate, 'p')}
                      </p>
                    </div>
                  </div>

                  {/* <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{event.location}</p>
                    </div>
                  </div> */}

                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {event.attendances?.length || 0} checked in
                        {event.maxAttendees && ` / ${event.maxAttendees} max`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-In Section - Show for approved events that haven't ended */}
            {event.approvalStatus === 'APPROVED' && !isPast && (
              <CheckInButton eventId={event.id} onCheckInSuccess={fetchEvent} />
            )}

            {/* Badge Minting Success Alert */}
            {badgeMintSuccess && (
              <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Badge Minted Successfully!
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={getExplorerUrl(badgeMintSuccess)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                      >
                        🔍 View on Explorer
                      </a>
                      <a
                        href={getTwitterShareUrl(event.name, badgeMintSuccess)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-black hover:bg-gray-800 text-white rounded-md transition-colors"
                      >
                        𝕏 Share on Twitter
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Badge Claiming Section - Show if user has checked in */}
            {event.approvalStatus === 'APPROVED' && event.userAttendance && (
              <Card className={badgeAlreadyClaimed ? 'border-green-500' : canClaimBadge ? 'border-primary' : 'border-yellow-500'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🎁 NFT Badge
                  </CardTitle>
                  <CardDescription>
                    {badgeAlreadyClaimed
                      ? 'You have claimed your NFT badge for this event!'
                      : event.userAttendance.approvedForMinting
                      ? 'Claim your NFT badge for attending this event'
                      : 'Waiting for event host approval to mint NFT'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {badgeAlreadyClaimed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Badge Claimed</span>
                    </div>
                  ) : event.userAttendance.approvedForMinting ? (
                    <Button
                      onClick={handleClaimBadge}
                      disabled={claimingBadge}
                      size="lg"
                      className="w-full"
                    >
                      {claimingBadge ? 'Minting Badge...' : '🎁 Claim NFT Badge'}
                    </Button>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        ⏳ Your check-in has been recorded. The event host will approve you for NFT minting soon.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Full Attendee List - Only for event creator/admin */}
            {(event.canManage || isAdmin) && event.attendances && event.attendances.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Checked-In Attendees ({event.attendances.length})
                      </CardTitle>
                      <CardDescription>
                        Select attendees to approve for NFT minting
                      </CardDescription>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllAttendees}
                        disabled={approvingAttendees}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllAttendees}
                        disabled={approvingAttendees || selectedAttendees.size === 0}
                      >
                        Deselect All
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveForMinting(true)}
                        disabled={approvingAttendees || selectedAttendees.size === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✓ Approve for Minting ({selectedAttendees.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleApproveForMinting(false)}
                        disabled={approvingAttendees || selectedAttendees.size === 0}
                      >
                        ✗ Disapprove ({selectedAttendees.size})
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="w-12 p-3">
                            <input
                              type="checkbox"
                              checked={selectedAttendees.size === event.attendances.length}
                              onChange={(e) => e.target.checked ? selectAllAttendees() : deselectAllAttendees()}
                              className="h-4 w-4"
                            />
                          </th>
                          <th className="text-left p-3 font-medium">Attendee</th>
                          <th className="text-left p-3 font-medium hidden sm:table-cell">Check-in Time</th>
                          <th className="text-left p-3 font-medium hidden md:table-cell">Approval Status</th>
                          <th className="text-left p-3 font-medium hidden lg:table-cell">NFT Claimed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {event.attendances.map((attendance: any) => (
                          <tr
                            key={attendance.id}
                            className={`hover:bg-muted/50 cursor-pointer ${selectedAttendees.has(attendance.userId) ? 'bg-primary/5' : ''}`}
                            onClick={() => toggleAttendeeSelection(attendance.userId)}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedAttendees.has(attendance.userId)}
                                onChange={() => {}}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {attendance.user.profileImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={attendance.user.profileImage}
                                    alt={attendance.user.name}
                                    className="h-8 w-8 rounded-full"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                    {attendance.user.name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{attendance.user.name}</p>
                                  <p className="text-xs text-muted-foreground">{attendance.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell">
                              {format(new Date(attendance.checkedInAt), 'MMM d, h:mm a')}
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              {attendance.approvedForMinting ? (
                                <Badge variant="default" className="bg-green-600">Approved</Badge>
                              ) : (
                                <Badge variant="secondary">Not Approved</Badge>
                              )}
                            </td>
                            <td className="p-3 hidden lg:table-cell">
                              {attendance.nftMinted ? (
                                <Badge variant="default" className="bg-purple-600">Claimed</Badge>
                              ) : (
                                <Badge variant="outline">Not Claimed</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendees Preview - For non-creators */}
            {!(event.canManage || isAdmin) && event.attendances && event.attendances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Checked In ({event.attendances.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {event.attendances
                      .slice(0, 10)
                      .map((attendance: any) => (
                        <div key={attendance.id} className="flex items-center gap-2">
                          {attendance.user.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={attendance.user.profileImage}
                              alt={attendance.user.name}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {attendance.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm">{attendance.user.name}</span>
                        </div>
                      ))}
                    {event.attendances.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        + {event.attendances.length - 10} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* QR Code for Check-In - Only for event creator/admin */}
            {(event.canManage || isAdmin) && event.approvalStatus === 'APPROVED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Check-In QR Code
                  </CardTitle>
                  <CardDescription>
                    Share this QR code at your event for attendees to check in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showQrCode && qrCodeUrl && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="Check-in QR Code" className="w-48 h-48" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Button onClick={generateQRCode} variant="outline" className="w-full">
                      <QrCode className="h-4 w-4 mr-2" />
                      {showQrCode ? 'Regenerate QR Code' : 'Generate QR Code'}
                    </Button>
                    <Button onClick={copyCheckInLink} variant="outline" className="w-full">
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Check-In Link
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Attendees scan the QR code to check in to the event
                  </p>
                </CardContent>
              </Card>
            )}

            {/* NFT Badge - Only for event creator/admin */}
            {(event.canManage || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle>NFT Badge</CardTitle>
                  <CardDescription>
                    Auto-generated badge for attendees to mint as NFT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.badgeImage && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.badgeImage}
                        alt="NFT Badge"
                        className="h-48 w-48 object-contain border-2 border-muted rounded-lg"
                      />
                    </div>
                  )}

                  {event.badgeImage ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ Badge auto-generated! Approve attendees below to allow them to claim their NFT.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Badge will be generated automatically when event is created.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Organizer Actions */}
            {(event.canManage || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full">
                    Edit Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
