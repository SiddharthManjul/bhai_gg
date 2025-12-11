/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Calendar, MapPin, Users, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewEventPage() {
  const { authenticated, user, getAccessToken } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [searchingLocation, setSearchingLocation] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    latitude: 0,
    longitude: 0,
    startTime: '',
    endTime: '',
    isPublic: true,
    maxAttendees: '',
    radius: '100',
  })

  useEffect(() => {
    if (!authenticated) {
      router.push('/auth/signin')
    }
  }, [authenticated, router])

  useEffect(() => {
    if (locationQuery.length > 2) {
      const timer = setTimeout(() => {
        searchLocation(locationQuery)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setLocationResults([])
    }
  }, [locationQuery])

  const searchLocation = async (query: string) => {
    try {
      setSearchingLocation(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      setLocationResults(data)
    } catch (error) {
      console.error('Error searching location:', error)
    } finally {
      setSearchingLocation(false)
    }
  }

  const selectLocation = (result: any) => {
    setFormData({
      ...formData,
      location: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    })
    setLocationQuery(result.display_name)
    setLocationResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.location || !formData.latitude || !formData.longitude) {
      alert('Please select a location from the search results')
      return
    }

    const startTime = new Date(formData.startTime)
    const endTime = new Date(formData.endTime)

    if (endTime <= startTime) {
      alert('End time must be after start time')
      return
    }

    if (startTime < new Date()) {
      alert('Start time must be in the future')
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
          description: formData.description || null,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          isPublic: formData.isPublic,
          maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
          radius: parseInt(formData.radius),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || 'Event created successfully!')
        router.push(`/events/${data.event.id}`)
      } else {
        alert(data.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell us about your event..."
                  rows={4}
                />
              </div>

              {/* Location Search */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location *
                </Label>
                <Input
                  id="location"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Search for a location..."
                  required
                />
                {searchingLocation && (
                  <p className="text-sm text-muted-foreground">Searching...</p>
                )}
                {locationResults.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {locationResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectLocation(result)}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
                {formData.location && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {formData.location}
                  </p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Start Time *
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">
                    <Clock className="inline h-4 w-4 mr-1" />
                    End Time *
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic">Public Event</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.isPublic
                        ? 'Anyone can request to join'
                        : 'Invitation only'}
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPublic: checked })
                    }
                  />
                </div>
              </div>

              {/* Max Attendees */}
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">
                  <Users className="inline h-4 w-4 mr-1" />
                  Max Attendees (Optional)
                </Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>

              {/* Check-in Radius */}
              <div className="space-y-2">
                <Label htmlFor="radius">Check-in Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                  min="50"
                  max="1000"
                />
                <p className="text-sm text-muted-foreground">
                  Attendees must be within this distance to check in (default: 100m)
                </p>
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
