'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SetupAccountPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Missing invite token')
      setLoading(false)
      return
    }

    fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.error ?? 'Invite is invalid or expired')
        }
        return res.json()
      })
      .then((payload) => {
        setEmail(payload.email ?? '')
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error ?? 'Could not set password')
      return
    }

    setSuccess('Password set successfully. Redirecting to login...')
    setTimeout(() => router.push('/login'), 1200)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F0EBE3', marginBottom: 6 }}>Set up your account</h1>
        <p style={{ color: '#78726C', marginBottom: 20, fontSize: 13 }}>Create your password to access the admin panel.</p>

        {loading ? (
          <p style={{ color: '#78726C', fontSize: 13 }}>Validating invite...</p>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Email" value={email} disabled />
            <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            {error && <div style={{ fontSize: 12, color: '#C0392B' }}>{error}</div>}
            {success && <div style={{ fontSize: 12, color: '#2ECC71' }}>{success}</div>}
            <Button type="submit" disabled={saving || !token}>
              {saving ? 'Saving...' : 'Set Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
