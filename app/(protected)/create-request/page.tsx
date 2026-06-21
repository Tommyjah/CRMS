import CreateRequestForm from '@/components/CreateRequestForm'
import { getUserProfile } from '@/app/actions'
import Link from 'next/link'

export default async function CreateRequestPage() {
  const { data: userProfile } = await getUserProfile()
  
  // Strict authorization: Only INITIATOR and REQUESTER roles can create requests
  if (!userProfile || (userProfile.role !== 'INITIATOR' && userProfile.role !== 'REQUESTER')) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center p-8 max-w-md rounded-xl border border-rose-200/50 dark:border-rose-800/50 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex justify-center mb-4">
            <svg className="h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.375 0h18.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v5.625c0 .621.504 1.125 1.125 1.125zm9.375 0v3.75m-9.375 0v3.75m-9.375 0V15m18.75 0v-3.75M3.375 9v3.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-4">Access Denied</h1>
          <p className="text-slate-600 dark:text-zinc-400 mb-6">Unauthorized Access: Only designated Project Initiators possess the operational mandate to initialize new change requests for Ethio Telecom.</p>
          <Link href="/" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return <CreateRequestForm />
}
