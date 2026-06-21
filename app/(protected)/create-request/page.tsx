import CreateRequestForm from '@/components/CreateRequestForm'
import { getUserProfile } from '@/app/actions'
import Link from 'next/link'

export default async function CreateRequestPage() {
  const { data: userProfile } = await getUserProfile()
  
  // Only Initiators can create requests
  if (!userProfile || userProfile.role !== 'INITIATOR' && userProfile.role !== 'REQUESTER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only Initiators can create new change requests.</p>
          <Link href="/" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }
  
  return <CreateRequestForm />
}
