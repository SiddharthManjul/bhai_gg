/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState, use } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import RSVPButton from '@/components/events/rsvp-button'
import CheckInButton from '@/components/events/check-in-button'
import { Calendar, MapPin, Users, Clock, ArrowLeft, CheckCircle, XCircle, User } from 'lucide-react'
import { format } from 'date-fns'

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { authenticated, user, getAccessToken } = usePrivy()
  const router = useRouter()
   
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showJoinRequests, setShowJoinRequests] = useState(false)

  useEffect(() => {
    if (!authenticated) {
      router.push('/auth/signin')
      return
    }

    fetchEvent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, id, router])

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

  const handleJoinRequest = async () => {
    setActionLoading(true)

    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${id}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: 'I would like to join this event' }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        fetchEvent()
      } else {
        alert(data.error || 'Failed to request to join')
      }
    } catch (error) {
      console.error('Error requesting to join:', error)
      alert('Failed to request to join')
    } finally {
      setActionLoading(false)
    }
  }

  const handleInviteResponse = async (status: 'ACCEPTED' | 'DECLINED') => {
    setActionLoading(true)

    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${id}/invite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        fetchEvent()
      } else {
        alert(data.error || 'Failed to respond to invite')
      }
    } catch (error) {
      console.error('Error responding to invite:', error)
      alert('Failed to respond to invite')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveRequest = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, status }),
      })

      if (res.ok) {
        alert(`Request ${status.toLowerCase()}`)
        fetchEvent() // Refresh event data
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to process request')
      }
    } catch (error) {
      console.error('Error processing request:', error)
      alert('Failed to process request')
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

  const canRSVP = event.userJoinRequest?.status === 'APPROVED' ||
                  event.userInvite?.status === 'ACCEPTED' ||
                  event.canManage

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
                        {event.rsvps?.length || 0} RSVP{event.rsvps?.length !== 1 ? 's' : ''}
                        {event.maxAttendees && ` / ${event.maxAttendees} max`}
                      </p>
                      {event.attendances?.length > 0 && (
                        <p className="text-sm text-green-600">
                          {event.attendances.length} attended
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {event.approvalStatus === 'APPROVED' && !isPast && (
              <Card>
                <CardHeader>
                  <CardTitle>RSVP</CardTitle>
                </CardHeader>
                <CardContent>
                  {!canRSVP ? (
                    <div className="space-y-4">
                      {event.isPublic && !event.userJoinRequest ? (
                        <>
                          <p className="text-muted-foreground">
                            This is a public event. Request to join to RSVP.
                          </p>
                          <Button
                            onClick={handleJoinRequest}
                            disabled={actionLoading}
                            className="w-full"
                          >
                            Request to Join
                          </Button>
                        </>
                      ) : event.isPublic && event.userJoinRequest?.status === 'PENDING' ? (
                        <div className="text-center">
                          <Badge variant="outline" className="mb-2">
                            Join Request Pending
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            The organizer will review your request
                          </p>
                        </div>
                      ) : !event.isPublic && event.userInvite?.status === 'PENDING' ? (
                        <>
                          <p className="text-muted-foreground mb-4">
                            You have been invited to this private event
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleInviteResponse('ACCEPTED')}
                              disabled={actionLoading}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept Invite
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleInviteResponse('DECLINED')}
                              disabled={actionLoading}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          This is a private event. You need an invitation to RSVP.
                        </p>
                      )}
                    </div>
                  ) : (
                    <RSVPButton
                      eventId={event.id}
                      currentRsvp={event.userRsvp}
                      onRsvpChange={fetchEvent}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Check-In Section - Only for ongoing/started events */}
            {event.approvalStatus === 'APPROVED' && !isPast && canRSVP && (
              <CheckInButton eventId={event.id} onCheckInSuccess={fetchEvent} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendees */}
            {event.rsvps && event.rsvps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Going ({event.rsvps.filter((r: any) => r.status === 'GOING').length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {event.rsvps
                      .filter((rsvp: any) => rsvp.status === 'GOING')
                      .slice(0, 10)
                      .map((rsvp: any) => (
                        <div key={rsvp.id} className="flex items-center gap-2">
                          {rsvp.user.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={rsvp.user.profileImage}
                              alt={rsvp.user.name}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {rsvp.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm">{rsvp.user.name}</span>
                        </div>
                      ))}
                    {event.rsvps.filter((r: any) => r.status === 'GOING').length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        + {event.rsvps.filter((r: any) => r.status === 'GOING').length - 10} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Actions */}
            {event.canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Manage Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full">
                    Edit Event
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowJoinRequests(!showJoinRequests)}
                  >
                    {showJoinRequests ? 'Hide' : 'View'} Join Requests ({event.joinRequests?.filter((r: any) => r.status === 'PENDING').length || 0})
                  </Button>
                  <Button variant="outline" className="w-full">
                    Generate QR Code
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Join Requests List */}
            {event.canManage && showJoinRequests && (
              <Card>
                <CardHeader>
                  <CardTitle>Join Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {event.joinRequests?.filter((r: any) => r.status === 'PENDING').length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No pending join requests
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {event.joinRequests
                        ?.filter((r: any) => r.status === 'PENDING')
                        .map((request: any) => (
                          <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                            <div className="flex items-center gap-3">
                              {request.user.profileImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={request.user.profileImage}
                                  alt={request.user.name}
                                  className="h-10 w-10 rounded-full"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                  {request.user.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{request.user.name}</p>
                                <p className="text-sm text-muted-foreground">{request.user.email}</p>
                                {request.message && (
                                  <p className="text-sm text-muted-foreground italic mt-1">{request.message}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveRequest(request.userId, 'APPROVED')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproveRequest(request.userId, 'REJECTED')}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
