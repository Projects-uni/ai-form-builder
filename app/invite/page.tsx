import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyInviteToken } from '@/lib/inviteToken'
import { AcceptInviteClient } from './AcceptInviteClient'
import { Sparkles, Users, XCircle } from 'lucide-react'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function InvitePage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    redirect('/')
  }

  const payload = verifyInviteToken(token)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 w-full h-32 bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900"></div>
        
        <div className="px-8 pt-24 pb-8 relative z-10 flex flex-col items-center text-center">
          
          <div className="flex size-20 items-center justify-center rounded-3xl bg-white shadow-lg border-4 border-slate-50 mb-6 absolute -top-10">
            <Sparkles className="h-10 w-10 text-indigo-600" strokeWidth={2.5} />
          </div>

          {!payload ? (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4 mt-8">
                <XCircle size={32} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">Invalid Invite Link</h1>
              <p className="text-base font-medium text-slate-500 mb-8 max-w-sm">
                This invitation link has expired, was malformed, or has been revoked. Please ask the workspace owner for a new link.
              </p>
              <Link href="/" className="w-full">
                <button className="w-full rounded-xl bg-slate-100 py-3 text-base font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                  Go to Homepage
                </button>
              </Link>
            </>
          ) : (
            <>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 mt-8">
                <Users size={32} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">You've Been Invited!</h1>
              <p className="text-base font-medium text-slate-500 mb-8 max-w-sm leading-relaxed">
                You have been invited to join a workspace as a <strong>{payload.role}</strong>. Accept the invitation below to get started.
              </p>
              
              <AcceptInviteClient token={token} role={payload.role} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}
