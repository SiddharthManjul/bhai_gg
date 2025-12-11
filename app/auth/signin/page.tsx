"use client"

import { usePrivy } from '@privy-io/react-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function SignInPage() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()
  const redirectingRef = useRef(false)

  useEffect(() => {
    if (authenticated && pathname === '/auth/signin' && !redirectingRef.current) {
      redirectingRef.current = true
      // Check for saved redirect URL, otherwise go to profile
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectUrl)
      } else {
        router.push('/profile')
      }
    }
  }, [authenticated, pathname, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (authenticated) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to Bhai.gg</CardTitle>
          <CardDescription>
            Sign in with your email to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={login}
            className="w-full"
            size="lg"
          >
            Sign In with Email
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <p>
              We&apos;ll send you a verification code to sign in
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
