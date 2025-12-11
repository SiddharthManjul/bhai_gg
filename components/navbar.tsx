/* eslint-disable react-hooks/exhaustive-deps */
 
"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()
  const { authenticated, user, logout, getAccessToken } = usePrivy()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [hasEvents, setHasEvents] = useState(false)

  useEffect(() => {
    if (user?.email?.address) {
      checkIfAdmin()
      checkIfHasEvents()
    }
  }, [user])

  const checkIfAdmin = async () => {
    try {
      const res = await fetch(`/api/profile?email=${user?.email?.address}`)
      const data = await res.json()
      if (data.user?.role === 'ADMIN') {
        setIsAdmin(true)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
    }
  }

  const checkIfHasEvents = async () => {
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events?myEvents=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.events && data.events.length > 0) {
        setHasEvents(true)
      }
    } catch (error) {
      console.error('Error checking events:', error)
    }
  }

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth')) {
    return null
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  // Guest navigation (not authenticated)
  if (!authenticated) {
    return (
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold hover:opacity-80 transition-opacity"
            >
              Bhai.gg
            </Link>

            {/* Desktop Navigation - Guest */}
            <div className="hidden sm:flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Home</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>

            {/* Mobile Navigation - Guest */}
            <div className="flex sm:hidden items-center gap-3">
              <Button asChild size="sm">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // Authenticated navigation
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/events', label: 'Events' },
    { href: '/map', label: 'Map' },
    { href: '/directory', label: 'Directory' },
    { href: '/profile', label: 'Profile' },
  ]

  if (isAdmin) {
    navLinks.push({ href: '/admin', label: 'Admin' })
  }

  // Show Badges link for admins OR event creators
  if (isAdmin || hasEvents) {
    navLinks.push({ href: '/admin/badges', label: 'Badges' })
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold hover:opacity-80 transition-opacity"
            onClick={closeMobileMenu}
          >
            Bhai.gg
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 xl:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="ml-2"
            >
              Sign Out
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout()
                  closeMobileMenu()
                }}
                className="mx-4 mt-2"
              >
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
