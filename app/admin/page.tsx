/* eslint-disable react-hooks/exhaustive-deps */
 
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'
import { useNotification } from '@/components/notification-provider'

interface User {
  id: string
  email: string
  name: string | null
  bio: string | null
  profileImage: string | null
  country: string | null
  state: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  xHandle: string | null
  linkedIn: string | null
  phone: string | null
  walletAddress: string | null
  notes: string | null
  role: "ADMIN" | "CONTRIBUTOR" | "USER"
  emailVerified: string | null
  createdAt: string
  updatedAt: string
  lastActiveAt: string
}

interface Event {
  id: string
  name: string
  description: string | null
  location: string
  startTime: string
  endTime: string
  isPublic: boolean
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  creator: {
    id: string
    name: string
    email: string
    profileImage: string | null
  }
  createdAt: string
}

export default function AdminPage() {
  const { user, getAccessToken } = usePrivy()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [updatingEvent, setUpdatingEvent] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'events'>('users')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    checkAdminAndFetchUsers()
  }, [user, router])

  const checkAdminAndFetchUsers = async () => {
    try {
      // Fetch users - the API will check if user is admin
      const res = await fetch(`/api/admin/users?adminEmail=${user?.email?.address}`)

      if (res.status === 403) {
        // Not an admin, redirect
        router.push('/')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setIsAdmin(true)

        // Fetch pending events
        await fetchPendingEvents()
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingEvents = async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/events', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        // Filter to show all events (admin can see all approval statuses)
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleEventStatusChange = async (eventId: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingEvent(eventId)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        // Update local state
        setEvents(events.map(e =>
          e.id === eventId ? { ...e, approvalStatus: status } : e
        ))
        showSuccess(`Event ${status.toLowerCase()} successfully`, 'Success')
      } else {
        const data = await res.json()
        showError(data.error || 'Failed to update event status', 'Error')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      showError('Failed to update event status', 'Error')
    } finally {
      setUpdatingEvent(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user?.email?.address,
          userId,
          role: newRole,
        }),
      })

      if (res.ok) {
        // Update local state
        setUsers(users.map(u =>
          u.id === userId ? { ...u, role: newRole as any } : u
        ))
        showSuccess('User role updated successfully', 'Success')
      } else {
        showError('Failed to update user role', 'Error')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      showError('Failed to update user role', 'Error')
    } finally {
      setUpdatingRole(null)
    }
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

  if (!user || !isAdmin) {
    return null // Will redirect
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    contributors: users.filter(u => u.role === 'CONTRIBUTOR').length,
    users: users.filter(u => u.role === 'USER').length,
  }

  const eventStats = {
    pending: events.filter(e => e.approvalStatus === 'PENDING').length,
    approved: events.filter(e => e.approvalStatus === 'APPROVED').length,
    rejected: events.filter(e => e.approvalStatus === 'REJECTED').length,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'users' | 'events')}>
          <TabsList className="mb-8">
            <TabsTrigger value="users">Users ({stats.total})</TabsTrigger>
            <TabsTrigger value="events">
              Events ({eventStats.pending} pending)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-8">
            {/* User Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Admins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.admins}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.contributors}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Regular Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users}</div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage user roles and view all user information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedUser?.id === user.id ? 'bg-muted' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell>
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.name || 'User'}
                            className="h-10 w-10 rounded-full object-cover border border-muted"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.name || <span className="text-muted-foreground">No name</span>}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.city && user.country
                          ? `${user.city}, ${user.country}`
                          : <span className="text-muted-foreground">Not set</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role) as any}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updatingRole === user.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Detailed User Info - Only show when a user is selected */}
            {selectedUser && (
              <Card className="mt-8">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <CardTitle>User Details</CardTitle>
                      <CardDescription>
                        Detailed information for {selectedUser.name || selectedUser.email}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                      className="self-end sm:self-auto"
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border-b pb-4 mb-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4 mb-3">
                      {selectedUser.profileImage && (
                        <img
                          src={selectedUser.profileImage}
                          alt={selectedUser.name || 'User'}
                          className="h-20 w-20 rounded-full object-cover border-2 border-muted mx-auto sm:mx-0"
                        />
                      )}
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="text-center sm:text-left">
                            <h3 className="font-semibold text-lg">{selectedUser.name || "No name"}</h3>
                            <p className="text-sm text-muted-foreground break-all">{selectedUser.email}</p>
                          </div>
                          <Badge variant={getRoleBadgeVariant(selectedUser.role) as any} className="self-center sm:self-auto">
                            {selectedUser.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <dt className="font-medium text-muted-foreground">Bio</dt>
                        <dd>{selectedUser.bio || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Location</dt>
                        <dd>{selectedUser.city && selectedUser.country ? `${selectedUser.city}, ${selectedUser.state ? selectedUser.state + ', ' : ''}${selectedUser.country}` : "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Coordinates</dt>
                        <dd>{selectedUser.latitude && selectedUser.longitude ? `${selectedUser.latitude.toFixed(6)}, ${selectedUser.longitude.toFixed(6)}` : "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">X Handle</dt>
                        <dd>{selectedUser.xHandle || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">LinkedIn</dt>
                        <dd className="truncate">{selectedUser.linkedIn || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Phone</dt>
                        <dd>{selectedUser.phone || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Wallet Address</dt>
                        <dd className="truncate">{selectedUser.walletAddress || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Email Verified</dt>
                        <dd>{selectedUser.emailVerified ? new Date(selectedUser.emailVerified).toLocaleDateString() : "Not verified"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Joined</dt>
                        <dd>{new Date(selectedUser.createdAt).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Last Active</dt>
                        <dd>{new Date(selectedUser.lastActiveAt).toLocaleString()}</dd>
                      </div>
                      {selectedUser.notes && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <dt className="font-medium text-muted-foreground">Admin Notes</dt>
                          <dd>{selectedUser.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-8">
            {/* Event Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{eventStats.pending}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Approved Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{eventStats.approved}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rejected Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{eventStats.rejected}</div>
                </CardContent>
              </Card>
            </div>

            {/* Events Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Events</CardTitle>
                <CardDescription>
                  Manage event approvals and view all event information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No events found
                              </TableCell>
                            </TableRow>
                          ) : (
                            events.map((event) => (
                              <TableRow key={event.id}>
                                <TableCell className="font-medium">
                                  <Link href={`/events/${event.id}`} className="hover:underline">
                                    {event.name}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {event.creator.profileImage ? (
                                      <img
                                        src={event.creator.profileImage}
                                        alt={event.creator.name}
                                        className="h-8 w-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-xs">{event.creator.name.charAt(0)}</span>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{event.creator.name}</p>
                                      <p className="text-xs text-muted-foreground">{event.creator.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{event.location}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-sm">{new Date(event.startTime).toLocaleDateString()}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={event.isPublic ? 'default' : 'secondary'}>
                                    {event.isPublic ? 'Public' : 'Private'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      event.approvalStatus === 'APPROVED'
                                        ? 'default'
                                        : event.approvalStatus === 'REJECTED'
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                  >
                                    {event.approvalStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {event.approvalStatus === 'PENDING' ? (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleEventStatusChange(event.id, 'APPROVED')}
                                        disabled={updatingEvent === event.id}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleEventStatusChange(event.id, 'REJECTED')}
                                        disabled={updatingEvent === event.id}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  ) : (
                                    <Link href={`/events/${event.id}`}>
                                      <Button size="sm" variant="outline">
                                        View
                                      </Button>
                                    </Link>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
