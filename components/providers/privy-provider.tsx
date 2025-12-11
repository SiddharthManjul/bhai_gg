"use client"

import { PrivyProvider as Privy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#6366f1',
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
        // Explicitly disable wallet login methods
        supportedChains: [],
      }}
      onSuccess={() => {
        router.push('/profile')
      }}
    >
      {children}
    </Privy>
  )
}
