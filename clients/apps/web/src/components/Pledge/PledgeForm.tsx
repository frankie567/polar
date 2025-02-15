import MoneyInput from '@/components/UI/MoneyInput'
import { useAuth } from '@/hooks/auth'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { Elements } from '@stripe/react-stripe-js'
import { PaymentIntent } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js/pure'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { api } from 'polarkit/api'
import {
  IssueRead,
  Organization,
  PledgeMutationResponse,
  Repository,
} from 'polarkit/api/client'
import { Checkbox, PrimaryButton } from 'polarkit/components/ui'
import { getCentsInDollarString } from 'polarkit/money'
import posthog from 'posthog-js'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import PaymentForm from './PaymentForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || '')

type PledgeSync = {
  amount: number
  email: string
  approvedTos: boolean
}

const generateRedirectURL = (
  organization: Organization,
  repository: Repository,
  issue: IssueRead,
  pledge: PledgeMutationResponse,
  gotoURL?: string,
  paymentIntent?: PaymentIntent,
) => {
  const redirectURL = new URL(
    window.location.origin + window.location.pathname + '/status',
  )

  if (gotoURL) {
    redirectURL.searchParams.append('goto_url', gotoURL)
  }

  if (pledge) {
    redirectURL.searchParams.append('pledge_id', pledge.id)
  }

  // Only in case we pass our redirect to Stripe which in turn will add it
  if (!paymentIntent) {
    return redirectURL.toString()
  }

  /*
   * Same location & query params as the serverside redirect from Stripe if required
   * by the payment method - easing the implementation.
   */
  redirectURL.searchParams.append('payment_intent_id', paymentIntent.id)
  if (paymentIntent.client_secret) {
    redirectURL.searchParams.append(
      'payment_intent_client_secret',
      paymentIntent.client_secret,
    )
  }
  redirectURL.searchParams.append('redirect_status', paymentIntent.status)
  return redirectURL.toString()
}

const PledgeForm = ({
  organization,
  repository,
  issue,
  asOrg,
  gotoURL,
}: {
  issue: IssueRead
  organization: Organization
  repository: Repository
  asOrg?: string
  gotoURL?: string
}) => {
  const [pledge, setPledge] = useState<PledgeMutationResponse | null>(null)
  const [amount, setAmount] = useState(0)
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isSyncing, setSyncing] = useState(false)
  const [approvedTos, setApprovedTos] = useState(false)

  const { currentUser, reloadUser } = useAuth()

  const validateEmail = (email: string) => {
    return email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
  }

  // Redirect to personal dashboard if authenticated unless gotoURL is set
  if (!gotoURL && currentUser) {
    gotoURL = '/dashboard/personal?tab=dependencies'
  }

  useEffect(() => {
    if (currentUser && currentUser.email) {
      setEmail(currentUser.email)
    }
  }, [currentUser])

  const { resolvedTheme } = useTheme()

  const getOrganizationForPledge = (): string | undefined => {
    if (!asOrg) return undefined

    // Filter out personal organizations - use user instead
    if (currentUser && currentUser.id === asOrg) {
      return undefined
    }
    return asOrg
  }

  const createPledge = async (pledgeSync: PledgeSync) => {
    return await api.pledges.createPledge({
      platform: organization.platform,
      orgName: organization.name,
      repoName: repository.name,
      number: issue.number,
      requestBody: {
        issue_id: issue.id,
        amount: pledgeSync.amount,
        email: pledgeSync.email,
        pledge_as_org: getOrganizationForPledge(),
      },
    })
  }

  const updatePledge = async (pledgeSync: PledgeSync) => {
    if (!pledge) {
      throw new Error('no pledge to update')
    }

    return await api.pledges.updatePledge({
      platform: organization.platform,
      orgName: organization.name,
      repoName: repository.name,
      number: issue.number,
      pledgeId: pledge.id,
      requestBody: {
        amount: pledgeSync.amount,
        email: pledgeSync.email,
        pledge_as_org: getOrganizationForPledge(),
      },
    })
  }

  const shouldSynchronizePledge = (pledgeSync: PledgeSync) => {
    if (pledgeSync.amount < organization.pledge_minimum_amount) {
      return false
    }

    if (!validateEmail(pledgeSync.email)) {
      return false
    }

    if (!pledgeSync.approvedTos) {
      return false
    }

    // Sync if pledge is missing
    if (!pledge) {
      return true
    }

    // Sync if amount has chagned
    if (pledge && pledge.amount !== pledgeSync.amount) {
      return true
    }

    // Sync if email has changed
    if (pledge && pledge.email !== pledgeSync.email) {
      return true
    }

    return false
  }

  const synchronizePledge = async (pledgeSync: PledgeSync) => {
    if (!shouldSynchronizePledge(pledgeSync)) {
      return
    }

    setSyncing(true)
    let updatedPledge: PledgeMutationResponse
    if (!pledge) {
      updatedPledge = await createPledge(pledgeSync)
    } else {
      updatedPledge = await updatePledge(pledgeSync)
    }

    if (updatedPledge) {
      setPledge(updatedPledge)
    }
    setSyncing(false)
  }

  const onAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseInt(event.target.value)
    if (isNaN(newAmount)) {
      setErrorMessage('Please enter a valid amount')
      return
    }
    const amountInCents = newAmount * 100

    if (amountInCents < organization.pledge_minimum_amount) {
      setErrorMessage(
        `Minimum amount is $${getCentsInDollarString(
          organization.pledge_minimum_amount,
        )}`,
      )
      return
    }

    if (amount === 0) {
      posthog.capture('Pledge amount entered', {
        Amount: newAmount,
        'Organization ID': organization.id,
        'Organization Name': organization.name,
        'Repository ID': repository.id,
        'Repository Name': repository.name,
        'Issue ID': issue.id,
        'Issue Number': issue.number,
      })
    }

    setErrorMessage('')
    setAmount(amountInCents)
    debouncedSync({ amount: amountInCents, email, approvedTos })
  }

  type Timeout = ReturnType<typeof setTimeout>
  const syncTimeout = useRef<Timeout | null>(null)

  const debouncedSync = (pledgeSync: PledgeSync) => {
    syncTimeout.current && clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => synchronizePledge(pledgeSync), 500)
  }

  const onEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newEmail = event.target.value

    if (email === '') {
      posthog.capture('Pledge email entered', {
        'Organization ID': organization.id,
        'Organization Name': organization.name,
        'Repository ID': repository.id,
        'Repository Name': repository.name,
        'Issue ID': issue.id,
        'Issue Number': issue.number,
      })
    }

    setEmail(newEmail)
    debouncedSync({ amount, email: newEmail, approvedTos })
  }

  const router = useRouter()

  const onStripePaymentSuccess = async (paymentIntent: PaymentIntent) => {
    // If logged in, reload the user!
    // This pledge might have allowed them to use polar
    if (currentUser) {
      await reloadUser()
    }

    if (!pledge) {
      throw new Error('got payment success but no pledge')
    }

    const location = generateRedirectURL(
      organization,
      repository,
      issue,
      pledge,
      gotoURL,
      paymentIntent,
    )
    await router.push(location)
  }

  const onChangeAcceptTos = (e: ChangeEvent<HTMLInputElement>) => {
    const approvedTos = e.target.checked
    setApprovedTos(approvedTos)
    debouncedSync({ amount, email, approvedTos })
  }

  const showStripeForm = pledge && approvedTos

  return (
    <>
      <form className="flex flex-col">
        <label
          htmlFor="amount"
          className="text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          Choose amount to pledge
        </label>
        <div className="mt-2 flex flex-row items-center space-x-4">
          <MoneyInput
            id="amount"
            name="amount"
            onChange={onAmountChange}
            onBlur={onAmountChange}
            placeholder={organization.pledge_minimum_amount}
          />
          <p className="w-2/5 text-xs text-gray-500 dark:text-gray-400">
            Minimum is $
            {getCentsInDollarString(organization.pledge_minimum_amount)}
          </p>
        </div>

        <label
          htmlFor="email"
          className="mt-4 mb-2 text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          Contact details
        </label>
        <div className="relative">
          <input
            type="email"
            id="email"
            onChange={onEmailChange}
            onBlur={onEmailChange}
            value={email}
            className="block w-full rounded-lg border-gray-200 bg-transparent py-2.5 px-3 pl-10 text-sm shadow-sm focus:z-10 focus:border-blue-300 focus:ring-[3px] focus:ring-blue-100 dark:border-gray-600 dark:focus:border-blue-600 dark:focus:ring-blue-700/40"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center pl-3 text-lg">
            <span className="text-gray-500">
              <EnvelopeIcon className="h-6 w-6" />
            </span>
          </div>
        </div>

        <div className="mt-5 mb-2">
          <Checkbox
            id="accept_tos"
            value={approvedTos}
            onChange={onChangeAcceptTos}
          >
            I accept the{' '}
            <Link href="https://polar.sh/legal/terms" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="https://polar.sh/legal/privacy" className="underline">
              Privacy Policy
            </Link>
          </Checkbox>
        </div>

        {showStripeForm && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: pledge.client_secret,
              appearance: {
                rules: {
                  '.Label': {
                    color: resolvedTheme === 'dark' ? '#A3A3A3' : '#727374',
                    fontWeight: '500',
                    fontSize: '14px',
                    marginBottom: '8px',
                  },
                  '.Input': {
                    padding: '12px',
                    backgroundColor: 'transparent',
                    borderColor:
                      resolvedTheme === 'dark' ? '#505153' : '#E5E5E1',
                    color: resolvedTheme === 'dark' ? '#E5E5E1' : '#181A1F',
                  },
                  '.Input:focus': {
                    borderColor:
                      resolvedTheme === 'dark' ? '#4667CA' : '#A5C2EB',
                  },
                },
                variables: {
                  borderRadius: '8px',
                  fontFamily: '"Inter var", Inter, sans-serif',
                  fontSizeBase: '14px',
                  spacingGridRow: '18px',
                  colorDanger: resolvedTheme === 'dark' ? '#F17878' : '#E64D4D',
                },
              },
              fonts: [
                {
                  cssSrc:
                    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500',
                },
              ],
            }}
          >
            <PaymentForm
              pledge={pledge}
              issue={issue}
              organization={organization}
              repository={repository}
              isSyncing={isSyncing}
              setSyncing={setSyncing}
              setErrorMessage={setErrorMessage}
              onSuccess={onStripePaymentSuccess}
              redirectTo={generateRedirectURL(
                organization,
                repository,
                issue,
                pledge,
                gotoURL,
              )}
            />
          </Elements>
        )}

        {/*
         * Unfortunately, we need to have this button (disabled) by default and then
         * remove it once Stripe is initiated. Since we cannot (in an easy/nice way)
         * manage the submission outside of the Stripe Elements context.
         */}
        {!showStripeForm && (
          <div className="mt-6">
            <PrimaryButton
              disabled={true}
              loading={isSyncing}
              onClick={() => false}
            >
              Pledge ${amount > 0 && getCentsInDollarString(amount)}
              {amount === 0 &&
                getCentsInDollarString(organization.pledge_minimum_amount)}{' '}
              to {organization.pretty_name || organization.name}
            </PrimaryButton>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3.5 text-red-500 dark:text-red-400">
            {errorMessage}
          </div>
        )}
      </form>
    </>
  )
}
export default PledgeForm
