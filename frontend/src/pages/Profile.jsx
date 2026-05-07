import { useEffect, useState } from 'react'
import { User, MapPin, Mail, Calendar, Shield, Save } from 'lucide-react'
import { getProfile, updateProfile } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', age: '', location: '' })
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getProfile()
      .then((p) => { setProfile(p); setForm({ name: p.name, age: p.age || '', location: p.location || '' }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const updated = await updateProfile({
        name: form.name || undefined,
        age: form.age ? Number(form.age) : undefined,
        location: form.location || undefined,
      })
      setProfile(updated)
      setEditing(false)
      setMsg({ type: 'success', text: 'Profile updated!' })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-96">
      <LoadingSpinner text="Loading profile..." />
    </div>
  )

  const initials = profile?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '-'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <User size={22} className="text-brand-400" /> My Profile
      </h1>

      {/* Avatar + header */}
      <div className="glass-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{profile?.name}</h2>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
            <Mail size={12} /> {profile?.email}
          </p>
          <p className="text-gray-600 text-xs flex items-center gap-1.5 mt-1">
            <Calendar size={11} /> Joined {joinDate}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Account Details</h3>
          <button onClick={() => setEditing((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${editing ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-brand-600/20 text-brand-300 border-brand-500/30'}`}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field icon={User} label="Name">
            {editing
              ? <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field py-1.5 text-sm" />
              : <span className="text-white">{profile?.name || '-'}</span>}
          </Field>
          <Field icon={MapPin} label="Location">
            {editing
              ? <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="input-field py-1.5 text-sm" placeholder="Your city" />
              : <span className="text-white">{profile?.location || 'Not set'}</span>}
          </Field>
          <Field icon={Shield} label="Age">
            {editing
              ? <input type="number" min="13" max="120" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} className="input-field py-1.5 text-sm w-28" />
              : <span className="text-white">{profile?.age || 'Not set'}</span>}
          </Field>
          <Field icon={Mail} label="Email">
            <span className="text-gray-400 text-sm">{profile?.email}</span>
          </Field>
        </div>

        {msg && (
          <div className={`text-sm px-3 py-2.5 rounded-xl border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {editing && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-gray-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}
