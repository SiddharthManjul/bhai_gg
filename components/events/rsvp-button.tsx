"use client"

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from 'lucide-react'

interface RSVPButtonProps {
  eventId: string
  currentRsvp?: {
    status: string
  } | null
  onRsvpChange?: () => void
}

export default function RSVPButton({ eventId, currentRsvp, onRsvpChange }: RSVPButtonProps) {
  const { getAccessToken } = usePrivy()
  const [loading, setLoading] = useState(false)
  const [rsvpStatus, setRsvpStatus] = useState(currentRsvp?.status || null)

  const handleRSVP = async (status: 'GOING' | 'NOT_GOING') => {
    setLoading(true)

    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()

      if (res.ok) {
        setRsvpStatus(status)
        if (onRsvpChange) {
          onRsvpChange()
        }
      } else {
        alert(data.error || 'Failed to RSVP')
      }
    } catch (error) {
      console.error('Error RSVPing:', error)
      alert('Failed to RSVP')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRSVP = async () => {
    setLoading(true)

    try {
      const token = await getAccessToken()

      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (res.ok) {
        setRsvpStatus(null)
        if (onRsvpChange) {
          onRsvpChange()
        }
      } else {
        alert(data.error || 'Failed to remove RSVP')
      }
    } catch (error) {
      console.error('Error removing RSVP:', error)
      alert('Failed to remove RSVP')
    } finally {
      setLoading(false)
    }
  }

  if (rsvpStatus === 'GOING') {
    return (
      <div className="flex gap-2">
        <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled>
          <Check className="h-4 w-4 mr-2" />
          You're Going
        </Button>
        <Button
          variant="outline"
          onClick={handleRemoveRSVP}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
        </Button>
      </div>
    )
  }

  if (rsvpStatus === 'NOT_GOING') {
    return (
      <div className="flex gap-2">
        <Button className="flex-1" variant="outline" disabled>
          <X className="h-4 w-4 mr-2" />
          Not Going
        </Button>
        <Button
          onClick={() => handleRSVP('GOING')}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change to Going'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        className="flex-1"
        onClick={() => handleRSVP('GOING')}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            <Check className="h-4 w-4 mr-2" />
            I'm Going
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleRSVP('NOT_GOING')}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            <X className="h-4 w-4 mr-2" />
            Not Going
          </>
        )}
      </Button>
    </div>
  )
}
