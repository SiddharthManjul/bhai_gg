/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
 
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'

// Country codes with flags
const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+1', country: 'CA', flag: '🇨🇦' },
  { code: '+44', country: 'GB', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+82', country: 'KR', flag: '🇰🇷' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+52', country: 'MX', flag: '🇲🇽' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+64', country: 'NZ', flag: '🇳🇿' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+966', country: 'SA', flag: '🇸🇦' },
  { code: '+27', country: 'ZA', flag: '🇿🇦' },
  { code: '+234', country: 'NG', flag: '🇳🇬' },
  { code: '+254', country: 'KE', flag: '🇰🇪' },
  { code: '+62', country: 'ID', flag: '🇮🇩' },
  { code: '+60', country: 'MY', flag: '🇲🇾' },
  { code: '+63', country: 'PH', flag: '🇵🇭' },
  { code: '+66', country: 'TH', flag: '🇹🇭' },
  { code: '+84', country: 'VN', flag: '🇻🇳' },
  { code: '+48', country: 'PL', flag: '🇵🇱' },
  { code: '+31', country: 'NL', flag: '🇳🇱' },
  { code: '+46', country: 'SE', flag: '🇸🇪' },
  { code: '+47', country: 'NO', flag: '🇳🇴' },
  { code: '+45', country: 'DK', flag: '🇩🇰' },
  { code: '+358', country: 'FI', flag: '🇫🇮' },
  { code: '+41', country: 'CH', flag: '🇨🇭' },
  { code: '+43', country: 'AT', flag: '🇦🇹' },
  { code: '+32', country: 'BE', flag: '🇧🇪' },
  { code: '+351', country: 'PT', flag: '🇵🇹' },
  { code: '+353', country: 'IE', flag: '🇮🇪' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+380', country: 'UA', flag: '🇺🇦' },
  { code: '+90', country: 'TR', flag: '🇹🇷' },
  { code: '+972', country: 'IL', flag: '🇮🇱' },
  { code: '+20', country: 'EG', flag: '🇪🇬' },
  { code: '+92', country: 'PK', flag: '🇵🇰' },
  { code: '+880', country: 'BD', flag: '🇧🇩' },
  { code: '+94', country: 'LK', flag: '🇱🇰' },
  { code: '+977', country: 'NP', flag: '🇳🇵' },
  { code: '+54', country: 'AR', flag: '🇦🇷' },
  { code: '+56', country: 'CL', flag: '🇨🇱' },
  { code: '+57', country: 'CO', flag: '🇨🇴' },
  { code: '+51', country: 'PE', flag: '🇵🇪' },
]

// Common countries list
const countries = [
  'United States', 'Canada', 'United Kingdom', 'India', 'China', 'Japan', 'South Korea',
  'Germany', 'France', 'Italy', 'Spain', 'Brazil', 'Mexico', 'Australia', 'New Zealand',
  'Singapore', 'United Arab Emirates', 'Saudi Arabia', 'South Africa', 'Nigeria', 'Kenya',
  'Indonesia', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Poland', 'Netherlands',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium', 'Portugal',
  'Ireland', 'Russia', 'Ukraine', 'Turkey', 'Israel', 'Egypt', 'Pakistan', 'Bangladesh',
  'Sri Lanka', 'Nepal', 'Argentina', 'Chile', 'Colombia', 'Peru'
].sort()

export default function ProfilePage() {
  const { user, logout } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isNewUser, setIsNewUser] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1|US')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [walletError, setWalletError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    city: '',
    state: '',
    country: '',
    xHandle: '',
    linkedIn: '',
    phone: '',
    walletAddress: '',
    profileImage: '',
  })
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

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
          xHandle: data.user.xHandle || '',
          linkedIn: data.user.linkedIn || '',
          phone: data.user.phone || '',
          walletAddress: data.user.walletAddress || '',
          profileImage: data.user.profileImage || '',
        })

        // Parse phone number into country code and number
        if (data.user.phone) {
          const phone = data.user.phone
          // Find matching country code (try longer codes first)
          const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
          const matchedCode = sortedCodes.find(c => phone.startsWith(c.code))
          if (matchedCode) {
            setPhoneCountryCode(`${matchedCode.code}|${matchedCode.country}`)
            setPhoneNumber(phone.substring(matchedCode.code.length))
          } else {
            setPhoneNumber(phone)
          }
        }

        if (data.user.profileImage) {
          setImagePreview(data.user.profileImage)
        }
        if (data.user.role === 'ADMIN') {
          setIsAdmin(true)
        }
        // If profile is complete, show view mode
        if (data.user.name && data.user.city && data.user.profileImage) {
          setIsNewUser(false)
          setIsEditing(false)
        } else {
          // Incomplete profile, show edit mode
          setIsNewUser(true)
          setIsEditing(true)
        }
      } else {
        // New user, show edit mode
        setIsNewUser(true)
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setFormData({ ...formData, profileImage: base64String })
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handlePhoneChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '')
    setPhoneNumber(digitsOnly)

    if (digitsOnly && digitsOnly.length < 6) {
      setPhoneError('Phone number must be at least 6 digits')
    } else if (digitsOnly && digitsOnly.length > 15) {
      setPhoneError('Phone number must be at most 15 digits')
    } else {
      setPhoneError('')
    }
  }

  const handleWalletChange = (value: string) => {
    setFormData({ ...formData, walletAddress: value })

    if (value && !value.startsWith('0x')) {
      setWalletError('Wallet address must start with 0x')
    } else if (value && value.length !== 42) {
      setWalletError('Wallet address must be 42 characters')
    } else if (value && !/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setWalletError('Invalid wallet address format')
    } else {
      setWalletError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.city || !formData.country) {
      alert('Please enter your city and country')
      return
    }

    if (isNewUser && !formData.profileImage) {
      alert('Please upload a profile image')
      return
    }

    if (walletError) {
      alert('Please fix the wallet address error')
      return
    }

    if (phoneError) {
      alert('Please fix the phone number error')
      return
    }

    // Combine phone country code and number (extract code from "code|country" format)
    const actualCode = phoneCountryCode.split('|')[0]
    const fullPhone = phoneNumber ? `${actualCode}${phoneNumber}` : ''

    setSaving(true)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: user?.id,
          email: user?.email?.address,
          ...formData,
          phone: fullPhone,
        }),
      })

      if (res.ok) {
        setIsNewUser(false)
        setIsEditing(false)
        fetchProfile() // Refresh data
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

  const handleLogout = async () => {
    logout()
    router.push('/auth/signin')
  }

  const handleCancelEdit = () => {
    fetchProfile() // Reset form data
    setIsEditing(false)
  }

  // Get flag for display from phone number
  const getPhoneDisplay = (phone: string) => {
    const matchedCode = countryCodes.find(c => phone.startsWith(c.code))
    if (matchedCode) {
      return `${matchedCode.flag} ${phone}`
    }
    return phone
  }

  if (!user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // View Mode
  if (!isEditing && !isNewUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt={formData.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-muted"
                />
              )}
              <div className="flex-1 text-center sm:text-left">
                <CardTitle className="text-2xl sm:text-3xl font-bold">{formData.name}</CardTitle>
                <CardDescription>
                  {formData.city}{formData.state ? `, ${formData.state}` : ''}, {formData.country}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="mt-1 text-sm">{user?.email?.address || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                  <dd className="mt-1 text-sm">{formData.city}{formData.state ? `, ${formData.state}` : ''}, {formData.country}</dd>
                </div>
                {formData.bio && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Bio</dt>
                    <dd className="mt-1 text-sm">{formData.bio}</dd>
                  </div>
                )}
                {formData.xHandle && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">X (Twitter)</dt>
                    <dd className="mt-1 text-sm">
                      <a
                        href={`https://x.com/${formData.xHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {formData.xHandle}
                      </a>
                    </dd>
                  </div>
                )}
                {formData.linkedIn && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">LinkedIn</dt>
                    <dd className="mt-1 text-sm">
                      <a
                        href={formData.linkedIn.startsWith('http') ? formData.linkedIn : `https://${formData.linkedIn}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate block"
                      >
                        {formData.linkedIn}
                      </a>
                    </dd>
                  </div>
                )}
                {formData.phone && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                    <dd className="mt-1 text-sm">{getPhoneDisplay(formData.phone)}</dd>
                  </div>
                )}
                {formData.walletAddress && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Wallet Address</dt>
                    <dd className="mt-1 font-mono text-xs break-all">{formData.walletAddress}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button onClick={() => router.push('/events')} variant="outline" size="sm">
                  Events
                </Button>
                <Button onClick={() => router.push('/map')} variant="outline" size="sm">
                  Map
                </Button>
                <Button onClick={() => router.push('/directory')} variant="outline" size="sm">
                  Directory
                </Button>
                <Button onClick={() => router.push('/badges')} variant="outline" size="sm">
                  Badges
                </Button>
              </div>
              {isAdmin && (
                <Button onClick={() => router.push('/admin')} className="w-full" size="sm">
                  Admin Panel
                </Button>
              )}
              <Button onClick={handleLogout} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Edit Mode
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {isNewUser ? 'Complete Your Profile' : 'Edit Profile'}
                </CardTitle>
                <CardDescription>
                  {isNewUser ? 'Tell us about yourself to join the Bhai community' : 'Update your profile information'}
                </CardDescription>
              </div>
              {!isNewUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                <Label htmlFor="profileImage">Profile Image {isNewUser && '*'}</Label>
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

              {/* Location - Manual Entry */}
              <div className="space-y-4">
                <Label>Location *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm text-muted-foreground">Country</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm text-muted-foreground">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm text-muted-foreground">State/Province (Optional)</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter your state or province"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your location will be shown on the community map at city level only.
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

              {/* Private Information */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Private Information</h3>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Admin Only</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This information is private and only visible to administrators.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number with Country Code */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex">
                      <Select
                        value={phoneCountryCode}
                        onValueChange={setPhoneCountryCode}
                      >
                        <SelectTrigger className="w-[100px] rounded-r-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((cc, index) => (
                            <SelectItem key={`${cc.country}-${index}`} value={`${cc.code}|${cc.country}`}>
                              {cc.flag} {cc.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="1234567890"
                        className="rounded-l-none flex-1"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-xs text-red-500">{phoneError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Optional - Only visible to admins
                    </p>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress">Wallet Address (Monad)</Label>
                    <Input
                      id="walletAddress"
                      value={formData.walletAddress}
                      onChange={(e) => handleWalletChange(e.target.value)}
                      placeholder="0x..."
                      className={walletError ? 'border-red-500' : ''}
                    />
                    {walletError && (
                      <p className="text-xs text-red-500">{walletError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Required for claiming NFT badges. Must start with 0x
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="flex-1" size="lg" disabled={saving || !!walletError || !!phoneError}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
                {!isNewUser && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="sm:w-auto"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
