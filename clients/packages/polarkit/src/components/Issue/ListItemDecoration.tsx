import {
  IssueReferenceRead,
  PledgeRead,
  PledgeState,
} from 'polarkit/api/client'
import { classNames, getCentsInDollarString } from 'polarkit/utils'
import IssuePledge from './IssuePledge'
import IssueReference from './Reference'

// When rendering in the Chrome Extension, the iframe needs to know it's expected height in pixels
export const getExpectedHeight = ({
  pledges,
  references,
}: {
  pledges: PledgeRead[]
  references: IssueReferenceRead[]
}): number => {
  const pledgeHeight = pledges.length > 0 ? 32 : 0
  const referenceHeight = 32 * references.length
  const inner = Math.max(pledgeHeight, referenceHeight)
  return inner + 24
}

const IssueListItemDecoration = ({
  orgName,
  repoName,
  pledges,
  references,
  showDisputeAction,
  onDispute,
}: {
  orgName: string
  repoName: string
  pledges: PledgeRead[]
  references: IssueReferenceRead[]
  showDisputeAction?: boolean
  onDispute?: (pledge: PledgeRead) => void
}) => {
  const showPledges = pledges && pledges.length > 0

  const ONE_DAY = 1000 * 60 * 60 * 24
  const now = new Date()

  const remainingDays = (pledge: PledgeRead) => {
    if (!pledge.scheduled_payout_at) {
      return -1
    }

    return Math.floor(
      (new Date(pledge.scheduled_payout_at).getTime() - now.getTime()) /
        ONE_DAY,
    )
  }

  const disputablePledges = pledges
    .filter(
      (p) =>
        p.authed_user_can_admin &&
        p.scheduled_payout_at &&
        p.state === PledgeState.PENDING &&
        remainingDays(p) >= 0,
    )
    .map((p) => {
      return {
        ...p,
        remaining_days: remainingDays(p),
      }
    })

  const pendingPayoutPledges = pledges.filter(
    (p) => p.scheduled_payout_at && remainingDays(p) < 0,
  )

  const disputedPledges = pledges.filter(
    (p) => p.state === PledgeState.DISPUTED,
  )

  const canDisputeAny =
    pledges &&
    pledges.find(
      (p) =>
        p.authed_user_can_admin &&
        p.scheduled_payout_at &&
        p.state === PledgeState.PENDING &&
        remainingDays(p) >= 0,
    )

  const pledgeStatusShowCount =
    disputablePledges.length +
    pendingPayoutPledges.length +
    disputedPledges.length

  const showPledgeStatusBox = pledgeStatusShowCount > 0
  const disputeBoxShowAmount = pledgeStatusShowCount > 1 || true

  const onClickDisputeButton = (pledge: PledgeRead) => {
    if (!canDisputeAny || !onDispute) {
      return
    }
    onDispute(pledge)
  }

  const haveReferences = references && references.length > 0

  return (
    <div>
      <div className="flex flex-row items-center px-4 py-3">
        {showPledges && (
          <div className="stretch mr-4 flex-none">
            <IssuePledge pledges={pledges} />
          </div>
        )}

        <div
          className={classNames(showPledges ? 'border-l pl-4' : '', 'flex-1')}
        >
          {haveReferences &&
            references.map((r: IssueReferenceRead) => {
              return (
                <IssueReference
                  orgName={orgName}
                  repoName={repoName}
                  reference={r}
                  key={r.id}
                />
              )
            })}

          {!haveReferences && (
            <p className="text-sm italic text-gray-400">Not picked up yet</p>
          )}
        </div>
      </div>
      {showDisputeAction && showPledgeStatusBox && (
        <div className="border-t-2 border-gray-100 bg-gray-50 px-4 py-1">
          {disputablePledges.map((p) => {
            return (
              <div key={p.id}>
                <span className="text-sm text-gray-500">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      onClickDisputeButton(p)
                    }}
                    className="text-blue-600"
                  >
                    Dispute
                  </a>{' '}
                  {p.remaining_days > 0 && (
                    <>
                      within {p.remaining_days}{' '}
                      {p.remaining_days === 1 ? 'day' : 'days'}
                    </>
                  )}
                  {p.remaining_days == 0 && <>today</>}{' '}
                  {disputeBoxShowAmount && (
                    <>(${getCentsInDollarString(p.amount)})</>
                  )}
                </span>
              </div>
            )
          })}

          {disputedPledges.map((p) => {
            return (
              <div key={p.id}>
                {p.authed_user_can_admin && (
                  <span className="text-sm text-gray-500">
                    You've disputed your pledge{' '}
                    {disputeBoxShowAmount && (
                      <>(${getCentsInDollarString(p.amount)})</>
                    )}
                  </span>
                )}

                {!p.authed_user_can_admin && (
                  <span className="text-sm text-gray-500">
                    {p.pledger_name} disputed their pledge{' '}
                    {disputeBoxShowAmount && (
                      <>(${getCentsInDollarString(p.amount)})</>
                    )}
                  </span>
                )}
              </div>
            )
          })}

          {pendingPayoutPledges.map((p) => {
            return (
              <div key={p.id}>
                <span className="text-sm text-gray-500">
                  Payout pending{' '}
                  {disputeBoxShowAmount && (
                    <>(${getCentsInDollarString(p.amount)})</>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IssueListItemDecoration
