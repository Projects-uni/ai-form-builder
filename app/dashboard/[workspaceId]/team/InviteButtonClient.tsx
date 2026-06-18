'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { InviteModal } from '@/app/components/ui/InviteModal'

interface InviteButtonClientProps {
  workspaceId: string
}

export function InviteButtonClient({ workspaceId }: InviteButtonClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button 
        size="lg" 
        leftIcon={<UserPlus size={20} strokeWidth={3} />}
        onClick={() => setIsModalOpen(true)}
      >
        Invite Member
      </Button>
      
      <InviteModal 
        workspaceId={workspaceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
