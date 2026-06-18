'use client'

import { useState } from 'react'
import { UserPlus, Send, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { sendInviteEmail } from '@/app/actions/invite'

interface InviteModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
}

export function InviteModal({ workspaceId, isOpen, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSend = async () => {
    if (!email) {
      setError('Please enter an email address.')
      return
    }

    try {
      setLoading(true)
      setError('')
      await sendInviteEmail(workspaceId, role, email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSent(false)
    setEmail('')
    setRole('viewer')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} strokeWidth={2.5} />
        </button>

        <div className="mb-8">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-100 mb-4">
            <UserPlus className="h-6 w-6 text-indigo-600" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Invite Team Member</h2>
          <p className="text-base font-medium text-slate-500 mt-2">
            Send an email invitation to collaborate on this workspace.
          </p>
        </div>

        {!sent ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input 
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base font-medium focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <p className="text-xs font-medium text-slate-500 mt-2">
                {role === 'editor' ? 'Editors can create and modify forms.' : 'Viewers can only see analytics and responses.'}
              </p>
            </div>

            {error && <p className="text-sm font-bold text-rose-500">{error}</p>}

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleSend} 
              disabled={loading}
              leftIcon={<Send size={20} strokeWidth={2.5} />}
            >
              {loading ? 'Sending...' : 'Send Invite Email'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" strokeWidth={2.5} />
              <p className="text-xl font-bold text-emerald-900 mb-2">Invitation Sent!</p>
              <p className="text-sm font-medium text-emerald-700">
                We've sent an email to <strong>{email}</strong> with instructions on how to join the workspace.
              </p>
            </div>

            <Button className="w-full" variant="outline" size="lg" onClick={handleReset}>
              Invite Another Member
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
