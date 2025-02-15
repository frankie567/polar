import Dashboard, { DefaultFilters } from '@/components/Dashboard'
import Gatekeeper from '@/components/Dashboard/Gatekeeper/Gatekeeper'
import DashboardSidebarLayout from '@/components/Layout/DashboardSidebarLayout'
import OnboardingConnectReposToGetStarted from '@/components/Onboarding/OnboardingConnectReposToGetStarted'
import type { NextLayoutComponentType } from 'next'
import { useRouter } from 'next/router'
import { useListOrganizations, useListPersonalPledges } from 'polarkit/hooks'
import { ReactElement, useEffect } from 'react'
import { useCurrentOrgAndRepoFromURL } from '../../hooks'

const Page: NextLayoutComponentType = () => {
  const { isLoaded, haveOrgs } = useCurrentOrgAndRepoFromURL()

  const listOrganizationsQuery = useListOrganizations()
  const personalPledges = useListPersonalPledges()

  const router = useRouter()

  useEffect(() => {
    const havePersonalPledges =
      (personalPledges?.data && personalPledges?.data.length > 0) || false

    // Show personal dashboard
    if (!haveOrgs && havePersonalPledges) {
      router.push(`/dashboard/personal`)
      return
    }

    // redirect to first org
    if (
      haveOrgs &&
      listOrganizationsQuery?.data &&
      listOrganizationsQuery.data.length > 0
    ) {
      const gotoOrg = listOrganizationsQuery.data[0]
      router.push(`/dashboard/${gotoOrg.name}`)
      return
    }
  })

  if (!isLoaded) {
    return <></>
  }

  if (!haveOrgs) {
    return (
      <DashboardSidebarLayout
        showSidebar={false}
        isPersonalDashboard={false}
        filters={DefaultFilters}
        onSetFilters={() => {}}
      >
        <OnboardingConnectReposToGetStarted />
      </DashboardSidebarLayout>
    )
  }

  return (
    <Dashboard
      key="dashboard-root"
      org={undefined}
      repo={undefined}
      isPersonal={false}
    />
  )
}

Page.getLayout = (page: ReactElement) => {
  return <Gatekeeper>{page}</Gatekeeper>
}

export default Page
