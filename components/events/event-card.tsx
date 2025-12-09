"use client"

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface EventCardProps {
  event: {
    id: string
    name: string
    description?: string | null
    location: string
    startTime: Date | string
    endTime: Date | string
    isPublic: boolean
    approvalStatus: string
    maxAttendees?: number | null
    creator: {
      id: string
      name: string
      profileImage?: string | null
    }
    rsvpCount?: number
    attendanceCount?: number
    userRsvp?: {
      status: string
    } | null
    userJoinRequest?: {
      status: string
    } | null
    userInvite?: {
      status: string
    } | null
    canManage?: boolean
  }
  showActions?: boolean
}

export default function EventCard({ event, showActions = true }: EventCardProps) {
  const startDate = new Date(event.startTime)
  const endDate = new Date(event.endTime)
  const isPast = endDate < new Date()
  const isUpcoming = startDate > new Date()
  const isOngoing = startDate <= new Date() && endDate >= new Date()

  const getStatusBadge = () => {
    if (event.approvalStatus === 'PENDING') {
      return <Badge variant="secondary">Pending Approval</Badge>
    }
    if (event.approvalStatus === 'REJECTED') {
      return <Badge variant="destructive">Rejected</Badge>
    }
    if (isPast) {
      return <Badge variant="secondary">Ended</Badge>
    }
    if (isOngoing) {
      return <Badge className="bg-green-600">Ongoing</Badge>
    }
    if (isUpcoming) {
      return <Badge>Upcoming</Badge>
    }
    return null
  }

  const getAccessBadge = () => {
    if (event.userRsvp?.status === 'GOING') {
      return <Badge className="bg-blue-600">Going</Badge>
    }
    if (event.userJoinRequest?.status === 'PENDING') {
      return <Badge variant="outline">Request Pending</Badge>
    }
    if (event.userJoinRequest?.status === 'APPROVED') {
      return <Badge className="bg-green-600">Approved</Badge>
    }
    if (event.userInvite?.status === 'PENDING') {
      return <Badge variant="outline">Invited</Badge>
    }
    if (event.userInvite?.status === 'ACCEPTED') {
      return <Badge className="bg-green-600">Invite Accepted</Badge>
    }
    return null
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">
              <Link href={`/events/${event.id}`} className="hover:underline">
                {event.name}
              </Link>
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-2 mt-2">
              {getStatusBadge()}
              {getAccessBadge()}
              {event.isPublic ? (
                <Badge variant="outline">Public</Badge>
              ) : (
                <Badge variant="outline">Private</Badge>
              )}
              {event.canManage && (
                <Badge className="bg-purple-600">You&apos;re the organizer</Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{format(startDate, 'PPP')}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {format(startDate, 'p')} - {format(endDate, 'p')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{event.location}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {event.rsvpCount || 0} RSVP{event.rsvpCount !== 1 ? 's' : ''}
              {event.maxAttendees && ` / ${event.maxAttendees} max`}
            </span>
          </div>

          {event.attendanceCount !== undefined && event.attendanceCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-green-600">
                ✓ {event.attendanceCount} attended
              </span>
            </div>
          )}
        </div>

        {event.creator && (
          <div className="flex items-center gap-2 pt-2">
            {event.creator.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.creator.profileImage}
                alt={event.creator.name || 'Organizer'}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {event.creator.name ? event.creator.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              Organized by {event.creator.name || 'Unknown'}
            </span>
          </div>
        )}

        {showActions && (
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href={`/events/${event.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
