 
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface DirectoryUser {
  id: string
  name: string | null
  bio: string | null
  skills: string[]
  profileImage: string | null
  country: string | null
  city: string | null
  xHandle: string | null
  linkedIn: string | null
  role: "ADMIN" | "CONTRIBUTOR" | "USER"
  createdAt: string
  _count: {
    badges: number
  }
}

interface Filters {
  countries: string[]
  cities: string[]
  skills: string[]
}

export default function DirectoryPage() {
  const { user } = usePrivy()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<DirectoryUser[]>([])
  const [filters, setFilters] = useState<Filters>({ countries: [], cities: [], skills: [] })

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedSkill, setSelectedSkill] = useState<string>('all')

  useEffect(() => {
    if (user) {
      fetchDirectory()
    } else {
      setLoading(false)
    }

  }, [user])

  // Apply filters whenever search query or filters change
  useEffect(() => {
    applyFilters()
  }, [searchQuery, selectedCountry, selectedCity, selectedSkill, users])

  const fetchDirectory = async () => {
    try {
      const res = await fetch(`/api/directory?userEmail=${user?.email?.address}`)

      if (res.status === 401 || res.status === 403) {
        // User not authenticated or not registered
        setLoading(false)
        return
      }

      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setFilters(data.filters)
        setFilteredUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching directory:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query) ||
        user.country?.toLowerCase().includes(query)
      )
    }

    // Apply country filter
    if (selectedCountry && selectedCountry !== 'all') {
      filtered = filtered.filter(user => user.country === selectedCountry)
    }

    // Apply city filter
    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(user => user.city === selectedCity)
    }

    // Apply skill filter
    if (selectedSkill && selectedSkill !== 'all') {
      filtered = filtered.filter(user => Array.isArray(user.skills) && user.skills.includes(selectedSkill))
    }

    setFilteredUsers(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCountry('all')
    setSelectedCity('all')
    setSelectedSkill('all')
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'CONTRIBUTOR':
        return 'default'
      case 'USER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  // Not authenticated - show sign in prompt
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Bhai Directory</CardTitle>
            <CardDescription>
              Sign in to view the community directory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Bhai directory is available to all registered members.
              Sign in or create an account to browse and connect with the community.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authenticated - show directory
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Stats & Filters */}
        <Card className="mb-4 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Community Members</CardTitle>
                <CardDescription className="text-sm">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
                  {filteredUsers.length !== users.length && ` (filtered from ${users.length} total)`}
                </CardDescription>
              </div>
              {(searchQuery || selectedCountry !== 'all' || selectedCity !== 'all' || selectedSkill !== 'all') && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name, bio, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Country Filter */}
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {filters.countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger id="city">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {filters.cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Skill Filter */}
              <div className="space-y-2">
                <Label htmlFor="skill">Skill</Label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger id="skill">
                    <SelectValue placeholder="All skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All skills</SelectItem>
                    {filters.skills.map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Grid */}
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No members found
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full"
                onClick={() => router.push(`/profile/${member.id}`)}
              >
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      {member.profileImage && (
                        <img
                          src={member.profileImage}
                          alt={member.name || 'User'}
                          className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-muted shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">
                            {member.name || 'Anonymous'}
                          </CardTitle>
                          <Badge variant={getRoleBadgeVariant(member.role) as any} className="shrink-0">
                            {member.role}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {member.city && member.country ? (
                            <span>{member.city}, {member.country}</span>
                          ) : member.country ? (
                            <span>{member.country}</span>
                          ) : (
                            <span className="text-muted-foreground">Location not set</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    {member.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {member.bio}
                      </p>
                    )}

                    {Array.isArray(member.skills) && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {member.skills.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 text-sm">
                      {member.xHandle && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">X:</span>
                          <a
                            href={`https://x.com/${member.xHandle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {member.xHandle}
                          </a>
                        </div>
                      )}
                      {member.linkedIn && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">LinkedIn:</span>
                          <a
                            href={member.linkedIn.startsWith('http') ? member.linkedIn : `https://${member.linkedIn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              // Extract username from LinkedIn URL
                              const url = member.linkedIn
                              // Match patterns like linkedin.com/in/username or /in/username
                              const match = url.match(/(?:linkedin\.com\/in\/|\/in\/)([^\/\?]+)/)
                              if (match) return `@${match[1]}`
                              // If no /in/ pattern, try to get last segment
                              const segments = url.replace(/\/$/, '').split('/')
                              const lastSegment = segments[segments.length - 1]
                              return lastSegment && lastSegment !== 'linkedin.com' ? `@${lastSegment}` : url
                            })()}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Member since {new Date(member.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Badges:</span>
                        <span className="text-sm font-semibold">{member._count.badges}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
