"use client"

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface CheckInButtonProps {
  eventId: string
  onCheckInSuccess?: () => void
}

interface CheckInStatus {
  canCheckIn: boolean
  reason?: string
  eventStarted: boolean
  eventEnded: boolean
  withinRadius: boolean
  alreadyCheckedIn: boolean
  eventApproved: boolean
  isRegistered?: boolean
  distance: number
  requiredRadius: number
  eventDetails: {
    name: string
    startTime: string
    endTime: string
    location: string
  }
}

export default function CheckInButton({
  eventId,
  onCheckInSuccess,
}: CheckInButtonProps) {
  const { getAccessToken } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [status, setStatus] = useState<CheckInStatus | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState<string>('')
  const [checkInSuccess, setCheckInSuccess] = useState(false)

  // Get user's location
  useEffect(() => {
    if ('geolocation' in navigator) {
      setCheckingStatus(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setLocationError('')
          setCheckingStatus(false)
        },
        (error) => {
          console.error('Location error:', error)
          setLocationError(
            error.code === 1
              ? 'Location permission denied. Please enable location access to check in.'
              : 'Unable to get your location. Please try again.'
          )
          setCheckingStatus(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser')
    }
  }, [])

  // Check status when location is available
  useEffect(() => {
    if (location && !checkInSuccess) {
      checkStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, eventId])

  // Auto-refresh status every 10 seconds while event is ongoing
  useEffect(() => {
    if (status && !status.alreadyCheckedIn && !status.eventEnded && !checkInSuccess) {
      const interval = setInterval(() => {
        checkStatus()
      }, 10000) // 10 seconds

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, checkInSuccess])

  const checkStatus = async () => {
    if (!location) return

    try {
      const token = await getAccessToken()
      const res = await fetch(
        `/api/events/${eventId}/check-in-status?latitude=${location.latitude}&longitude=${location.longitude}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const handleCheckIn = async () => {
    if (!location) {
      setLocationError('Location not available')
      return
    }

    setLoading(true)

    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setCheckInSuccess(true)
        onCheckInSuccess?.()
        // Refresh status to update UI
        await checkStatus()
      } else {
        alert(data.error || 'Failed to check in')
      }
    } catch (error) {
      console.error('Error checking in:', error)
      alert('Failed to check in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Getting your location...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (locationError) {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="text-yellow-600 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Required
          </CardTitle>
          <CardDescription>{locationError}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  // Not registered - prompt to register
  if (status.isRegistered === false) {
    return (
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle className="text-yellow-600 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Registration Required
          </CardTitle>
          <CardDescription>
            Please complete your profile registration to check in to events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/profile')} className="w-full">
            Complete Registration
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (checkInSuccess || status.alreadyCheckedIn) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Checked In Successfully!
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            You are checked in to {status.eventDetails.name}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (status.eventEnded) {
    return (
      <Card className="border-gray-500">
        <CardHeader>
          <CardTitle className="text-gray-600 flex items-center gap-2">
            Event Ended
          </CardTitle>
          <CardDescription>
            This event ended at {new Date(status.eventDetails.endTime).toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!status.eventApproved) {
    return null // Don't show check-in for unapproved events
  }

  return (
    <Card className={status.canCheckIn ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Event Check-In
        </CardTitle>
        <CardDescription>
          {status.eventStarted
            ? 'You can check in now'
            : `Check-in opens at ${new Date(status.eventDetails.startTime).toLocaleString()}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {status.eventStarted ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={status.eventStarted ? 'text-green-600' : 'text-muted-foreground'}>
              Event Started
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status.withinRadius ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={status.withinRadius ? 'text-green-600' : 'text-muted-foreground'}>
              Within {status.requiredRadius}m of venue
              {!status.withinRadius && ` (${status.distance}m away)`}
            </span>
          </div>
        </div>

        {/* Check-In Button */}
        <Button
          onClick={handleCheckIn}
          disabled={!status.canCheckIn || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking In...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Check In to Event
            </>
          )}
        </Button>

        {!status.canCheckIn && status.reason && (
          <p className="text-sm text-muted-foreground text-center">
            {status.reason}
          </p>
        )}

        {status.canCheckIn && (
          <p className="text-xs text-muted-foreground text-center">
            Your location will be verified when you check in
          </p>
        )}
      </CardContent>
    </Card>
  )
}
