'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'
import { acceptInvite } from '@/app/actions/invite'

interface Props {
  token: string
  role: string
}

export function AcceptInviteClient({ token, role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await acceptInvite(token)
      
      if (result.success) {
        router.push(result.redirectUrl!)
      } else if (result.error === 'unauthorized') {
        window.location.href = result.redirectUrl!
      } else {
        setError(result.error || 'Failed to accept invite.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 p-4 border border-rose-200">
          <p className="text-sm font-bold text-rose-600">{error}</p>
        </div>
      )}
      <Button 
        size="xl" 
        className="w-full text-lg shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all hover:-translate-y-1" 
        onClick={handleAccept}
        disabled={loading}
        leftIcon={<CheckCircle2 size={24} strokeWidth={3} />}
      >
        {loading ? 'Joining...' : `Join as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
      </Button>
    </div>
  )
}
