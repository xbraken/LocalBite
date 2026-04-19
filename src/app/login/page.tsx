'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      {error && <div style={{ fontSize: 12, color: '#C0392B', padding: '8px 12px', background: 'rgba(192,57,43,0.1)', borderRadius: 6 }}>{error}</div>}
      <Button type="submit" disabled={loading} className="w-full mt-2">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: 36, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>🍽️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#F0EBE3' }}>TakeawayOS</div>
          <div style={{ fontSize: 12, color: '#4a4440', marginTop: 4 }}>Sign in to continue</div>
        </div>
        <Suspense fallback={<div style={{ color: '#78726C', fontSize: 12, textAlign: 'center' }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
