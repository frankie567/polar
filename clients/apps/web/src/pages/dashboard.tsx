import type { ReactElement } from 'react'
import type { NextPageWithLayout } from 'utils/next'
import dynamic from 'next/dynamic'
import { requireAuth } from 'polarkit/hooks'
import { useRouter } from 'next/router'

const Dashboard = dynamic(() => import('../dashboard'), {
  ssr: false,
})

const DashboardSPA: NextPageWithLayout = () => {
  const router = useRouter()
  const { authenticated, isChecking } = requireAuth()

  if (isChecking) return <p>Loading...</p>

  if (!authenticated) return <p>Not authenticated. Fix me (TODO).</p>

  return <Dashboard />
}

DashboardSPA.getLayout = (page: ReactElement) => {
  return <div>{page}</div>
}

export default DashboardSPA