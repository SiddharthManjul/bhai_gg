/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useEffect, useState } from 'react'
import { Pencil, X, Check, ChevronsUpDown } from 'lucide-react'
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city'
import { cn } from "@/lib/utils"
import { useNotification } from '@/components/notification-provider'

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

// Get all countries from the library
const allCountries = Country.getAllCountries()

export default function ProfilePage() {
  const { user, logout, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showError, showSuccess } = useNotification()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isNewUser, setIsNewUser] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1|US')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [walletError, setWalletError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Location dropdowns state
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null)
  const [selectedState, setSelectedState] = useState<IState | null>(null)
  const [selectedCity, setSelectedCity] = useState<ICity | null>(null)
  const [availableStates, setAvailableStates] = useState<IState[]>([])
  const [availableCities, setAvailableCities] = useState<ICity[]>([])

  // Popover open states
  const [countryOpen, setCountryOpen] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false)

  // Search states
  const [countrySearch, setCountrySearch] = useState('')
  const [stateSearch, setStateSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [phoneCodeSearch, setPhoneCodeSearch] = useState('')

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

  // Badges state
  interface UserBadge {
    id: string
    type: string
    nftMinted: boolean
    txHash: string | null
    tokenId: string | null
    awardedAt: string
    event?: {
      id: string
      name: string
    } | null
  }

  const [badges, setBadges] = useState<UserBadge[]>([])
  const [badgesLoading, setBadgesLoading] = useState(false)

  // Filtered options based on search
  const filteredCountries = allCountries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const filteredStates = availableStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase())
  )

  const filteredCities = availableCities.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase())
  )

  const filteredPhoneCodes = countryCodes.filter(cc =>
    cc.country.toLowerCase().includes(phoneCodeSearch.toLowerCase()) ||
    cc.code.includes(phoneCodeSearch)
  )

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchProfile()
  }, [user, router])

  const fetchBadges = async () => {
    try {
      setBadgesLoading(true)
      const token = await getAccessToken()

      if (!token) {
        return
      }

      const res = await fetch('/api/badges/my-badges', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setBadges(data.badges || [])
      }
    } catch (error) {
      console.error('Error fetching badges:', error)
    } finally {
      setBadgesLoading(false)
    }
  }

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

        // Set location dropdowns based on saved data
        if (data.user.country) {
          const country = allCountries.find(c => c.name === data.user.country)
          if (country) {
            setSelectedCountry(country)
            const states = State.getStatesOfCountry(country.isoCode)
            setAvailableStates(states)

            if (data.user.state) {
              const state = states.find(s => s.name === data.user.state)
              if (state) {
                setSelectedState(state)
                const cities = City.getCitiesOfState(country.isoCode, state.isoCode)
                setAvailableCities(cities)

                if (data.user.city) {
                  const city = cities.find(c => c.name === data.user.city)
                  if (city) {
                    setSelectedCity(city)
                  }
                }
              }
            } else if (data.user.city) {
              // If no state but has city, load all cities in country
              const allCitiesInCountry = City.getCitiesOfCountry(country.isoCode) || []
              setAvailableCities(allCitiesInCountry)
              const city = allCitiesInCountry.find(c => c.name === data.user.city)
              if (city) {
                setSelectedCity(city)
              }
            }
          }
        }

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
          // Fetch badges for view mode
          fetchBadges()
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
      showError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB')
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

  // Handle country change
  const handleCountryChange = (countryCode: string) => {
    const country = allCountries.find(c => c.isoCode === countryCode)
    if (country) {
      setSelectedCountry(country)
      setFormData({ ...formData, country: country.name, state: '', city: '' })
      setCountryOpen(false)

      // Load states for this country
      const states = State.getStatesOfCountry(countryCode)
      setAvailableStates(states)
      setSelectedState(null)
      setSelectedCity(null)

      // If no states, load all cities directly for the country
      if (states.length === 0) {
        const cities = City.getCitiesOfCountry(countryCode) || []
        setAvailableCities(cities)
      } else {
        setAvailableCities([])
      }
    }
  }

  // Handle state change
  const handleStateChange = (stateCode: string) => {
    if (!selectedCountry) return

    const state = availableStates.find(s => s.isoCode === stateCode)
    if (state) {
      setSelectedState(state)
      setFormData({ ...formData, state: state.name, city: '' })
      setStateOpen(false)

      // Load cities for this state
      const cities = City.getCitiesOfState(selectedCountry.isoCode, stateCode)
      setAvailableCities(cities)
      setSelectedCity(null)
    }
  }

  // Handle city change
  const handleCityChange = (cityName: string) => {
    const city = availableCities.find(c => c.name === cityName)
    if (city) {
      setSelectedCity(city)
      setFormData({ ...formData, city: city.name })
      setCityOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate location fields - must select from dropdowns
    if (!selectedCountry) {
      showError('Please select a country from the dropdown')
      return
    }

    if (!selectedCity || !formData.city) {
      showError('Please select a city from the dropdown')
      return
    }

    // Ensure the values match dropdown selections (prevent gibberish)
    if (formData.country !== selectedCountry.name) {
      showError('Invalid country selection. Please select a valid country from the dropdown.')
      return
    }

    if (formData.city !== selectedCity.name) {
      showError('Invalid city selection. Please select a valid city from the dropdown.')
      return
    }

    if (selectedState && formData.state !== selectedState.name) {
      showError('Invalid state selection. Please select a valid state from the dropdown.')
      return
    }

    if (isNewUser && !formData.profileImage) {
      showError('Please upload a profile image')
      return
    }

    if (walletError) {
      showError('Please fix the wallet address error')
      return
    }

    if (phoneError) {
      showError('Please fix the phone number error')
      return
    }

    // Validate LinkedIn URL format if provided
    if (formData.linkedIn && formData.linkedIn.trim() !== '') {
      // LinkedIn personal profiles use /in/ globally (not a country code)
      // Also accept country-specific domains like uk.linkedin.com, in.linkedin.com, etc.
      const linkedInRegex = /^(https?:\/\/)?([\w]{2,3}\.)?linkedin\.com\/in\/[\w\-\.%]+\/?(\?.*)?$/i
      if (!linkedInRegex.test(formData.linkedIn.trim())) {
        showError('Invalid LinkedIn profile URL. Format: linkedin.com/in/your-profile or https://www.linkedin.com/in/your-profile', 'Validation Error')
        return
      }
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
        showSuccess('Profile saved successfully!', 'Success')
        setIsNewUser(false)
        setIsEditing(false)
        fetchProfile() // Refresh data
      } else {
        showError('Failed to save profile', 'Error')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      showError('Failed to save profile', 'Error')
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

  // Badge helper functions
  const getExplorerUrl = (txHash: string) =>
    `https://testnet.monadvision.com/tx/${txHash}`

  const getTwitterShareUrl = (badgeType: string, txHash: string) => {
    const text = `I just collected my "${badgeType.replace('_', ' ')}" badge on @bhai_gg! 🎉\n\nPowered by @monad_xyz\n\n${getExplorerUrl(txHash)}`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
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
      <div className="min-h-screen p-4 py-8">
        <div className="container mx-auto max-w-7xl">
          <Card className="w-full">
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
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left column - Profile Details (2/3 width on large screens) */}
              <div className="lg:col-span-2 space-y-6">
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

              {/* Navigation Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Button onClick={() => router.push('/events')} variant="outline" size="sm">
                    Events
                  </Button>
                  <Button onClick={() => router.push('/map')} variant="outline" size="sm">
                    Map
                  </Button>
                  <Button onClick={() => router.push('/directory')} variant="outline" size="sm">
                    Directory
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
              </div>

              {/* Right column - Badge Collection (1/3 width on large screens) */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Badges</h3>
                    {!badgesLoading && badges.length > 0 && (
                      <span className="text-sm text-muted-foreground">{badges.length}</span>
                    )}
                  </div>
              {badgesLoading ? (
                <p className="text-sm text-muted-foreground">Loading badges...</p>
              ) : badges.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                  <p>No badges collected yet.</p>
                  <p className="text-sm mt-2">
                    Attend events and claim your NFT badges!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="p-3 border rounded-lg bg-linear-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950"
                    >
                      <div className="flex flex-col gap-2">
                        {badge.event && (
                          <p className="text-base font-bold">
                            {badge.event.name}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {badge.type.replace('_', ' ')}
                          </span>
                          {badge.nftMinted && (
                            <span className="text-xs text-green-600 dark:text-green-400">✓ Minted</span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {new Date(badge.awardedAt).toLocaleDateString()}
                        </p>

                        {badge.txHash && (
                          <div className="flex flex-col gap-1.5">
                            <a
                              href={getExplorerUrl(badge.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                            >
                              🔍 View on Explorer
                            </a>
                            <a
                              href={getTwitterShareUrl(badge.type, badge.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-black hover:bg-gray-800 text-white rounded transition-colors"
                            >
                              𝕏 Share on Twitter
                            </a>
                          </div>
                        )}

                        {badge.tokenId && (
                          <p className="text-xs text-muted-foreground">
                            Token #{badge.tokenId}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
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

              {/* Location - Searchable Dropdown Selection */}
              <div className="space-y-4">
                <Label>Location *</Label>

                {/* Country Combobox */}
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm text-muted-foreground">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between"
                      >
                        {selectedCountry ? (
                          <>
                            {selectedCountry.flag} {selectedCountry.name}
                          </>
                        ) : (
                          "Select country..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search country..."
                          value={countrySearch}
                          onValueChange={setCountrySearch}
                        />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCountries.map((country) => (
                              <CommandItem
                                key={country.isoCode}
                                value={country.name}
                                onSelect={() => {
                                  handleCountryChange(country.isoCode)
                                  setCountrySearch('')
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCountry?.isoCode === country.isoCode ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {country.flag} {country.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* State/Province Combobox */}
                {selectedCountry && availableStates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm text-muted-foreground">State/Province</Label>
                    <Popover open={stateOpen} onOpenChange={setStateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={stateOpen}
                          className="w-full justify-between"
                        >
                          {selectedState ? selectedState.name : "Select state/province..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search state/province..."
                            value={stateSearch}
                            onValueChange={setStateSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No state/province found.</CommandEmpty>
                            <CommandGroup>
                              {filteredStates.map((state) => (
                                <CommandItem
                                  key={state.isoCode}
                                  value={state.name}
                                  onSelect={() => {
                                    handleStateChange(state.isoCode)
                                    setStateSearch('')
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedState?.isoCode === state.isoCode ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {state.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* City Combobox */}
                {selectedCountry && (
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm text-muted-foreground">City *</Label>
                    <Popover open={cityOpen} onOpenChange={setCityOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={cityOpen}
                          className="w-full justify-between"
                          disabled={availableCities.length === 0}
                        >
                          {selectedCity ? selectedCity.name : "Select city..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search city..."
                            value={citySearch}
                            onValueChange={setCitySearch}
                          />
                          <CommandList>
                            <CommandEmpty>No city found.</CommandEmpty>
                            <CommandGroup>
                              {filteredCities.map((city) => (
                                <CommandItem
                                  key={`${city.name}-${city.stateCode || 'none'}`}
                                  value={city.name}
                                  onSelect={() => {
                                    handleCityChange(city.name)
                                    setCitySearch('')
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCity?.name === city.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {city.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {availableCities.length === 0 && selectedCountry && availableStates.length > 0 && (
                      <p className="text-xs text-yellow-600">
                        Please select a state/province first.
                      </p>
                    )}
                    {availableCities.length === 0 && selectedCountry && availableStates.length === 0 && (
                      <p className="text-xs text-red-600">
                        No cities found for this country in our database.
                      </p>
                    )}
                  </div>
                )}

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
                    <div className="flex gap-2">
                      <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={phoneCodeOpen}
                            className="w-[140px] justify-between"
                          >
                            {phoneCountryCode ? (
                              <>
                                {countryCodes.find(cc => `${cc.code}|${cc.country}` === phoneCountryCode)?.flag}{' '}
                                {phoneCountryCode.split('|')[0]}
                              </>
                            ) : (
                              "Code"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search country code..."
                              value={phoneCodeSearch}
                              onValueChange={setPhoneCodeSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No country code found.</CommandEmpty>
                              <CommandGroup>
                                {filteredPhoneCodes.map((cc, index) => (
                                  <CommandItem
                                    key={`${cc.country}-${index}`}
                                    value={`${cc.country} ${cc.code}`}
                                    onSelect={() => {
                                      setPhoneCountryCode(`${cc.code}|${cc.country}`)
                                      setPhoneCodeOpen(false)
                                      setPhoneCodeSearch('')
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        phoneCountryCode === `${cc.code}|${cc.country}` ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cc.flag} {cc.code} ({cc.country})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="1234567890"
                        className="flex-1"
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
