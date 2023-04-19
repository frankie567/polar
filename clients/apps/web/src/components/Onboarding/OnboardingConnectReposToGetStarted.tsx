import { PlusIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { PrimaryButton } from 'polarkit/components/ui'
import { CONFIG } from 'polarkit/config'
import screenshot from './Screenshot.png'

const OnboardingConnectReposToGetStarted = () => {
  return (
    <div className="flex flex-col items-center space-y-4 pt-24">
      <h2 className="text-2xl text-black">Connect repos to get started</h2>
      <p className="max-w-3xl text-center text-gray-500">
        Regardless of if you’re an open source maintainer seeking funding or a
        company looking to track issues you’re dependent on, the first step is
        to connect repositories.
      </p>
      <div>
        <PrimaryButton
          color="lightblue"
          onClick={() => {
            window.open(CONFIG.GITHUB_INSTALLATION_URL, '_blank')
          }}
        >
          <PlusIcon className="h-6 w-6" />
          <span>Connect a repository</span>
        </PrimaryButton>
      </div>
      <Image
        src={screenshot}
        alt="Sreenshot of the Polar dashboard with connected repositories"
      />
    </div>
  )
}

export default OnboardingConnectReposToGetStarted