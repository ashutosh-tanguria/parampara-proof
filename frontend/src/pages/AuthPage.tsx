import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../components/ui/basic'
import { FieldError, inputClass } from '../components/ui/extras'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/hooks'
import { ART_FORM_OPTIONS, type Role } from '../typesCraft'

export default function AuthPage({ initial = 'login' }: { initial?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(initial)
  usePageTitle(mode === 'login' ? 'Log in' : 'Sign up')
  const { user, login, signup } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : '/'
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('learner')
  const [artForm, setArtForm] = useState('')
  const [region, setRegion] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!username.trim() || !password) return setError('Please enter your username and password.')
    if (mode === 'signup') {
      if (displayName.trim().length < 2) return setError('Please enter a display name of at least 2 characters.')
      if (password.length < 8) return setError('Your password must be at least 8 characters.')
      if (role === 'craftsperson' && !artForm) return setError('Please choose your art form.')
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await signup({ username: username.trim(), display_name: displayName.trim(), password, role, art_form: role === 'craftsperson' ? artForm : null, region, bio })
      nav(next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page max-w-lg py-10">
      <h1 className="text-3xl font-semibold">{mode === 'login' ? 'Log in' : 'Create an account'}</h1>
      <p className="mt-1 text-muted">Browsing lessons, the marketplace and craftspeople videos is open to everyone. You need an account to post, upload or send messages.</p>
      <div role="tablist" aria-label="Account" className="mt-6 flex gap-1 border-b border-parchment-300">
        {(['login', 'signup'] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => { setMode(m); setError(null) }} className={`min-h-[44px] border-b-2 px-4 text-sm font-semibold ${mode === m ? 'border-terracotta text-terracotta-text' : 'border-transparent text-muted'}`}>
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>
      <Card className="mt-4 p-5">
        <form onSubmit={submit} noValidate className="space-y-4">
          {mode === 'signup' && (
            <>
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">I am a</legend>
                <div className="flex gap-3">
                  {([['learner', 'Learner'], ['craftsperson', 'Craftsperson']] as const).map(([v, l]) => (
                    <label key={v} className={`flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 rounded-control border px-3 ${role === v ? 'border-forest bg-forest/10' : 'border-parchment-400'}`}>
                      <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} /> {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="display" className="mb-1 block text-sm font-semibold">Display name</label>
                <input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} autoComplete="nickname" className={inputClass} />
              </div>
            </>
          )}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-semibold">Username (email-style)</label>
            <input id="username" type="email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="name@example.com" className={inputClass} />
            {mode === 'signup' && <p className="mt-1 text-xs text-muted">Used only to log in. It is never shown to other people. Do not enter a phone number or address.</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={inputClass} />
            {mode === 'signup' && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
          </div>
          {mode === 'signup' && role === 'craftsperson' && (
            <>
              <div>
                <label htmlFor="art" className="mb-1 block text-sm font-semibold">Art form</label>
                <select id="art" value={artForm} onChange={(e) => setArtForm(e.target.value)} className={inputClass}>
                  <option value="">Choose...</option>
                  {ART_FORM_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="region" className="mb-1 block text-sm font-semibold">Region (optional)</label>
                <input id="region" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={60} className={inputClass} />
              </div>
              <div>
                <label htmlFor="bio" className="mb-1 block text-sm font-semibold">Short bio (optional)</label>
                <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} className={inputClass} />
              </div>
              <p className="rounded-control bg-ochre-50 p-3 text-sm">Profiles are not verified in this demo.</p>
            </>
          )}
          <FieldError id="auth-error" text={error} />
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</Button>
        </form>
      </Card>
    </div>
  )
}
