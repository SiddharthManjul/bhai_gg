/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const { user } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    city: '',
    state: '',
    country: '',
    latitude: null as number | null,
    longitude: null as number | null,
    xHandle: '',
    linkedIn: '',
    phone: '',
    walletAddress: '',
    profileImage: '',
  })
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isNewUser, setIsNewUser] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    // Fetch existing profile data
    fetchProfile()
  }, [user, router])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile?email=${user?.email?.address}`)
      const data = await res.json()

      if (data.user) {
        setFormData({
          name: data.user.name || '',
          bio: data.user.bio || '',
          city: data.user.city || '',
          state: data.user.state || '',
          country: data.user.country || '',
          latitude: data.user.latitude || null,
          longitude: data.user.longitude || null,
          xHandle: data.user.xHandle || '',
          linkedIn: data.user.linkedIn || '',
          phone: data.user.phone || '',
          walletAddress: data.user.walletAddress || '',
          profileImage: data.user.profileImage || '',
        })
        // Set image preview if exists
        if (data.user.profileImage) {
          setImagePreview(data.user.profileImage)
          setIsNewUser(false)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGetLocation = async () => {
    setGettingLocation(true)

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          // Reverse geocode to get city and country
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          )
          const data = await response.json()

          const city = data.address.city || data.address.town || data.address.village || ''
          const state = data.address.state || ''
          const country = data.address.country || ''

          setFormData({
            ...formData,
            city,
            state,
            country,
            latitude,
            longitude,
          })

          alert(`Location detected: ${city}${state ? ', ' + state : ''}, ${country}`)
        } catch (error) {
          console.error('Error reverse geocoding:', error)
          alert('Failed to get location details. Please try again.')
        } finally {
          setGettingLocation(false)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        let message = 'Failed to get your location. '

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Please allow location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            message += 'The request to get your location timed out.'
            break
          default:
            message += 'An unknown error occurred.'
        }

        alert(message)
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds for better reliability on production
        maximumAge: 0,
      }
    )
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onloadend = () => {
      const base64String = reader.result as string
      setFormData({ ...formData, profileImage: base64String })
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate location
    if (!formData.city || !formData.country) {
      alert('Please enable location access to set your city and country')
      return
    }

    // Validate profile image (required for new users)
    if (isNewUser && !formData.profileImage) {
      alert('Please upload a profile image')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: user?.id,
          email: user?.email?.address,
          ...formData,
        }),
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        alert('Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Tell us about yourself to join the Bhai community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email?.address || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                This is your registered email and cannot be changed
              </p>
            </div>

            {/* Profile Image */}
            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image *</Label>
              <div className="flex flex-col gap-4">
                {imagePreview && (
                  <div className="flex justify-center">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover border-2 border-muted"
                    />
                  </div>
                )}
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a profile picture (max 5MB). Supported formats: JPG, PNG, GIF, WebP
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Your full name"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location *</Label>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="w-full"
                >
                  {gettingLocation ? (
                    <>
                      <span className="mr-2">📍</span>
                      Detecting your location...
                    </>
                  ) : formData.city && formData.country ? (
                    <>
                      <span className="mr-2">✓</span>
                      {formData.city}, {formData.country}
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📍</span>
                      Enable Location Access
                    </>
                  )}
                </Button>
                {formData.city && formData.country && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>📌 Location set to: {formData.city}{formData.state ? ', ' + formData.state : ''}, {formData.country}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                    >
                      Update
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                We only store your city and country for the directory. Your exact coordinates are private and used only for event verification.
              </p>
            </div>

            {/* Socials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Links (Public)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xHandle">X (Twitter) Handle</Label>
                  <Input
                    id="xHandle"
                    value={formData.xHandle}
                    onChange={(e) => setFormData({ ...formData, xHandle: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedIn">LinkedIn URL</Label>
                  <Input
                    id="linkedIn"
                    value={formData.linkedIn}
                    onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                    placeholder="linkedin.com/in/username"
                  />
                </div>
              </div>
            </div>

            {/* Private Information (Admin Only) */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Private Information</h3>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Admin Only</span>
              </div>
              <p className="text-sm text-muted-foreground">
                This information is private and only visible to administrators.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional - Only visible to admins
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional - For NFT badge drops
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button type="submit" className="flex-1" size="lg" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push('/')}
                disabled={saving}
                className="sm:w-auto"
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
