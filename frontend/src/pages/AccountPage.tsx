import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui/basic'
import { FieldError, RequireLogin, inputClass } from '../components/ui/extras'
import { useToast } from '../components/ui/Toast'
import { ApiError, apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePageTitle } from '../lib/hooks'
import { jsonInit } from '../lib/upload'
import { ART_FORM_OPTIONS, type Me } from '../typesCraft'

function ProfileForm({ me }: { me: Me }) {
  const { setUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(me.display_name)
  const [bio, setBio] = useState(me.bio)
  const [art, setArt] = useState(me.art_form ?? '')
  const [region, setRegion] = useState(me.region)
  const [error, setError] = useState<string | null>(null)
  const craft = me.role === 'craftsperson'

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const r = await apiFetch<{ user: Me }>('/api/auth/profile', jsonInit('PUT', { display_name: name, bio, art_form: craft ? art : null, region }))
      setUser(r.user)
      toast('Profile saved.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.')
    }
  }

  return (
    <div className="container-page max-w-xl py-8">
      <h1 className="text-3xl font-semibold">My profile</h1>
      <p className="mt-1 text-muted">Signed in as {me.username} ({craft ? 'Craftsperson' : 'Learner'}). Your username is never shown to other people.</p>
      <Card className="mt-5 p-5">
        <form onSubmit={save} noValidate className="space-y-4">
          <div>
            <label htmlFor="p-name" className="mb-1 block text-sm font-semibold">Display name</label>
            <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
          </div>
          {craft && (
            <>
              <div>
                <label htmlFor="p-art" className="mb-1 block text-sm font-semibold">Art form</label>
                <select id="p-art" value={art} onChange={(e) => setArt(e.target.value)} className={inputClass}>
                  {ART_FORM_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="p-region" className="mb-1 block text-sm font-semibold">Region</label>
                <input id="p-region" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={60} className={inputClass} />
              </div>
              <div>
                <label htmlFor="p-bio" className="mb-1 block text-sm font-semibold">Short bio</label>
                <textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} className={inputClass} />
              </div>
              <p className="rounded-control bg-ochre-50 p-3 text-sm">Profiles are not verified in this demo.</p>
            </>
          )}
          <FieldError id="p-error" text={error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save</Button>
            {craft && <Link to={`/craftspeople/${me.id}`} className="inline-flex min-h-[44px] items-center rounded-control border border-terracotta-dark/50 px-5 text-sm font-semibold text-terracotta-dark">View my public page</Link>}
          </div>
        </form>
      </Card>
    </div>
  )
}

export default function AccountPage() {
  usePageTitle('My profile')
  const { user } = useAuth()
  return <RequireLogin what="edit your profile">{user && <ProfileForm key={user.id} me={user} />}</RequireLogin>
}
