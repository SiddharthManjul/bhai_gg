"use client"

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDemo } from "@/components/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useNotification } from '@/components/notification-provider'

export default function NewEventPage() {
  const { authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    hostName: '',
    date: undefined as Date | undefined,
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    if (!authenticated) {
      router.push('/auth/signin')
    }
  }, [authenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date) {
      showError('Please select a date')
      return
    }

    if (!formData.startTime || !formData.endTime) {
      showError('Please enter start and end times')
      return
    }

    // Combine date and time
    const [startHour, startMinute] = formData.startTime.split(':')
    const [endHour, endMinute] = formData.endTime.split(':')

    const startDateTime = new Date(formData.date)
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute))

    const endDateTime = new Date(formData.date)
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute))

    if (endDateTime <= startDateTime) {
      showError('End time must be after start time')
      return
    }

    if (startDateTime < new Date()) {
      showError('Event time must be in the future')
      return
    }

    setLoading(true)

    try {
      const token = await getAccessToken()

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          hostName: formData.hostName,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showSuccess(data.message || 'Event created successfully!', 'Success')
        setTimeout(() => {
          router.push(`/events/${data.event.id}`)
        }, 1000)
      } else {
        showError(data.error || 'Failed to create event', 'Error')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      showError('Failed to create event', 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Create New Event</CardTitle>
            <CardDescription>
              Create a community event. Admins will review your event before it goes live.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bhai Cabal Meetup"
                  required
                />
              </div>

              {/* Host Name */}
              <div className="space-y-2">
                <Label htmlFor="hostName">Host Name *</Label>
                <Input
                  id="hostName"
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  placeholder="Enter host name"
                  required
                />
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarDemo
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/events')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
