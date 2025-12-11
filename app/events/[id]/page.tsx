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

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { authenticated, user, getAccessToken } = usePrivy()
  const router = useRouter()

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [badgeImagePreview, setBadgeImagePreview] = useState<string>('')
  const [uploadingBadge, setUploadingBadge] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authenticated) {
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
      } else {
        alert(data.error || 'Failed to load event')
        router.push('/events')
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      alert('Failed to load event')
      router.push('/events')
    } finally {
      setLoading(false)
    }
  }

  const handleBadgeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      setBadgeImagePreview(base64String)

      // Upload to server
      setUploadingBadge(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(`/api/events/${id}/badge-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ badgeImage: base64String }),
        })

        if (res.ok) {
          alert('Badge image saved! Attendees can now claim their NFT badges.')
          fetchEvent()
        } else {
          const data = await res.json()
          alert(data.error || 'Failed to save badge image')
        }
      } catch (error) {
        console.error('Error uploading badge image:', error)
        alert('Failed to upload badge image')
      } finally {
        setUploadingBadge(false)
      }
    }
    reader.readAsDataURL(file)
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
      alert('Failed to generate QR code')
    }
  }

  const copyCheckInLink = async () => {
    const checkInUrl = `${window.location.origin}/events/${id}`
    await navigator.clipboard.writeText(checkInUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{event.location}</p>
                      <p className="text-sm text-muted-foreground">
                        Check-in radius: {event.radius}m
                      </p>
                    </div>
                  </div>

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

            {/* Full Attendee List - Only for event creator/admin */}
            {(event.canManage || isAdmin) && event.attendances && event.attendances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Checked-In Attendees ({event.attendances.length})
                  </CardTitle>
                  <CardDescription>
                    Complete list of users who checked in to your event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Attendee</th>
                          <th className="text-left p-3 font-medium hidden sm:table-cell">Check-in Time</th>
                          <th className="text-left p-3 font-medium hidden md:table-cell">NFT Claimed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {event.attendances.map((attendance: any) => (
                          <tr key={attendance.id} className="hover:bg-muted/50">
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
                              {attendance.nftMinted ? (
                                <Badge variant="default" className="bg-green-600">Claimed</Badge>
                              ) : (
                                <Badge variant="secondary">Not Claimed</Badge>
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
                    Attendees scan the QR code and check in with GPS verification
                  </p>
                </CardContent>
              </Card>
            )}

            {/* NFT Badge Setup - Only for event creator/admin */}
            {(event.canManage || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle>NFT Badge Setup</CardTitle>
                  <CardDescription>
                    Upload a badge image for attendees to mint as NFT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(event.badgeImage || badgeImagePreview) && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={badgeImagePreview || event.badgeImage}
                        alt="Badge preview"
                        className="h-32 w-32 object-contain border-2 border-muted rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBadgeImageUpload}
                      disabled={uploadingBadge}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {uploadingBadge ? 'Uploading...' : 'PNG, JPG, GIF, WebP - Max 5MB'}
                    </p>
                  </div>

                  {event.badgeImage ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ Badge image set! Attendees who check in can claim their NFT from &quot;My Badges&quot; page.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        ⚠️ Upload a badge image to enable NFT claiming for attendees.
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
