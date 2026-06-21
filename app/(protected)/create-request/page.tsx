import CreateRequestForm from '@/components/CreateRequestForm'
import { getUserProfile } from '@/app/actions'
import Link from 'next/link'

export default async function CreateRequestPage() {
  const { data: userProfile } = await getUserProfile()
  
  if (!userProfile || userProfile.role !== 'INITIATOR' && userProfile.role !== 'REQUESTER') {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-4">Access Denied</h1>
          <p className="text-slate-600 dark:text-zinc-400 mb-6">Only Initiators can create new change requests.</p>
          <Link href="/" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return <CreateRequestForm />
}
