"use client"

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle2, Clock, XCircle, AlertCircle, Loader2, Link2 } from 'lucide-react'

interface GuestListProps {
  eventId: string
  refreshTrigger?: number
}

interface Guest {
  id: string
  email: string
  name: string
  approvalStatus: 'APPROVED' | 'PENDING' | 'DECLINED' | 'WAITLIST'
  registrationStatus: 'REGISTERED' | 'CANCELLED'
  userId: string | null
  user: {
    id: string
    name: string
    email: string
    profileImage: string | null
  } | null
}

export default function GuestList({ eventId, refreshTrigger }: GuestListProps) {
  const { getAccessToken } = usePrivy()
  const [loading, setLoading] = useState(true)
  const [guests, setGuests] = useState<Guest[]>([])
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    linked: 0,
  })

  useEffect(() => {
    fetchGuests()
  }, [eventId, refreshTrigger])

  const fetchGuests = async () => {
    setLoading(true)

    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/import-guests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setGuests(data.guests)
        setStats({
          total: data.total,
          approved: data.approved,
          linked: data.linked,
        })
      }
    } catch (error) {
      console.error('Error fetching guests:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-4">Loading guest list...</p>
        </CardContent>
      </Card>
    )
  }

  if (guests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No guests imported yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a CSV file to import your guest list
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'DECLINED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'WAITLIST':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
      case 'DECLINED':
        return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      case 'WAITLIST':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Imported Guest List
        </CardTitle>
        <CardDescription>
          Guests from CSV import • {stats.total} total
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pb-4 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.linked}</p>
            <p className="text-xs text-muted-foreground">Linked Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total - stats.linked}</p>
            <p className="text-xs text-muted-foreground">Not Registered</p>
          </div>
        </div>

        {/* Guest List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {guest.user?.profileImage ? (
                  <img
                    src={guest.user.profileImage}
                    alt={guest.name}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {guest.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{guest.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{guest.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {guest.userId && (
                  <Badge variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    Registered
                  </Badge>
                )}

                {guest.registrationStatus === 'CANCELLED' && (
                  <Badge variant="secondary">Cancelled</Badge>
                )}

                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(guest.approvalStatus)}`}>
                  {getStatusIcon(guest.approvalStatus)}
                  {guest.approvalStatus}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="text-muted-foreground">
            ℹ️ Approved guests who are registered on the platform can check in to this event.
            Other guests will need to register first.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
