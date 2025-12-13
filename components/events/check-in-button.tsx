"use client"

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, QrCode } from 'lucide-react'

interface CheckInButtonProps {
  eventId: string
  onCheckInSuccess?: () => void
}

interface CheckInStatus {
  canCheckIn: boolean
  reason?: string
  eventStarted: boolean
  eventEnded: boolean
  alreadyCheckedIn: boolean
  eventApproved: boolean
  isRegistered?: boolean
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
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [status, setStatus] = useState<CheckInStatus | null>(null)
  const [checkInSuccess, setCheckInSuccess] = useState(false)

  // Check status on mount
  useEffect(() => {
    checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

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
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/check-in-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleCheckIn = async () => {
    setLoading(true)

    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (res.ok) {
        setCheckInSuccess(true)
        onCheckInSuccess?.()
        // Refresh status to update UI
        await checkStatus()
      } else {
        alert(data.error || 'Failed to claim badge')
      }
    } catch (error) {
      console.error('Error claiming badge:', error)
      alert('Failed to claim badge. Please try again.')
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
            <span>Loading badge claim status...</span>
          </div>
        </CardContent>
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
            <QrCode className="h-5 w-5" />
            Registration Required
          </CardTitle>
          <CardDescription>
            Please complete your profile registration to claim event badges.
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
            Badge Claim Recorded!
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            You have claimed your badge for {status.eventDetails.name}. The event host will approve you for NFT minting soon.
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
          <QrCode className="h-5 w-5" />
          Claim Event Badge
        </CardTitle>
        <CardDescription>
          {status.eventStarted
            ? 'You can claim your badge now'
            : `Badge claiming opens at ${new Date(status.eventDetails.startTime).toLocaleString()}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {status.eventStarted ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={status.eventStarted ? 'text-green-600' : 'text-muted-foreground'}>
              Event {status.eventStarted ? 'is ongoing' : 'not started yet'}
            </span>
          </div>
        </div>

        {/* Claim Badge Button */}
        <Button
          onClick={handleCheckIn}
          disabled={!status.canCheckIn || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Claiming Badge...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Claim Badge
            </>
          )}
        </Button>

        {!status.canCheckIn && status.reason && (
          <p className="text-sm text-muted-foreground text-center">
            {status.reason}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
