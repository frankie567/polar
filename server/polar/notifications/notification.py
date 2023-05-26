from abc import abstractmethod
from typing import Tuple
from jinja2.nativetypes import NativeEnvironment
from jinja2 import StrictUndefined

from polar.models.user import User
from pydantic import BaseModel


class NotificationBase(BaseModel):
    @abstractmethod
    def subject(self) -> str:
        pass

    @abstractmethod
    def body(self) -> str:
        pass

    def render(
        self,
        user: User,
    ) -> Tuple[str, str]:
        m: dict[str, str] = vars(self)
        m["username"] = user.username

        env = NativeEnvironment(undefined=StrictUndefined)

        subject = env.from_string(self.subject()).render(m).strip()
        body = env.from_string(self.body()).render(m).strip()

        return (subject, body)


class MaintainerPledgeCreatedNotification(NotificationBase):
    pledger_name: str
    pledge_amount: str
    issue_url: str
    issue_title: str
    issue_org_name: str
    issue_repo_name: str
    issue_number: int
    maintainer_has_stripe_account: bool

    def subject(self) -> str:
        return "New ${{pledge_amount}} pledge for {{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}"  # noqa: E501

    def body(self) -> str:
        return """Hi,<br><br>

Great news! You received a <strong>${{pledge_amount}}</strong> pledge for: <a href="{{issue_url}}">{{issue_org_name}}/{{issue_repo_name}}#{{issue_number}} - {{issue_title}}</a>.<br><br>

You&apos;ll receive the funds once {{issue_org_name}}/{{issue_repo_name}}#{{issue_number}} is completed and after a 14 day review period.

{% if not maintainer_has_stripe_account -%}
<br><br>Create a Stripe account with Polar today to avoid any delay with future transfers.<br>
<a href="https://dashboard.polar.sh/dashboard/{{issue_org_name}}">dashboard.polar.sh/dashboard/{{issue_org_name}}</a>
{% endif -%}
"""  # noqa: E501


class MaintainerPledgePendingNotification(NotificationBase):
    pledger_name: str
    pledge_amount: str
    issue_url: str
    issue_title: str
    issue_org_name: str
    issue_repo_name: str
    issue_number: int
    maintainer_has_stripe_account: bool

    def subject(self) -> str:
        return "You have ${{pledge_amount}} in pending pledges for {{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}!"  # noqa: E501

    def body(self) -> str:
        return """Hi,<br><br>

Your backers had pledged ${{pledge_amount}} behind <a href="{{issue_url}}">{{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}</a> which has now been completed - awesome work!<br><br>

We&apos;ve notified the backers and unless we receive any disputes within the next 14 days it will be transferred to your Stripe account.<br><br>

{% if not maintainer_has_stripe_account %}
Create a Stripe account with Polar today to ensure we can transfer the funds directly once the review period is completed.<br>
<a href="https://dashboard.polar.sh/dashboard/{{issue_org_name}}">dashboard.polar.sh/dashboard/{{issue_org_name}}</a>
{% endif %}
"""  # noqa: E501


class MaintainerPledgePaidNotification(NotificationBase):
    paid_out_amount: str
    issue_url: str
    issue_title: str
    issue_org_name: str
    issue_repo_name: str
    issue_number: int

    def subject(self) -> str:
        return "${{paid_out_amount}} transferred for {{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}"  # noqa: E501

    def body(self) -> str:
        return """Hi,<br><br>

We&apos;ve now transferred ${{paid_out_amount}} in approved pledges for your efforts on <a href="{{issue_url}}">{{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}</a>. It will arrive to your Stripe account that you have connected with Polar.<br><br>

Don&apos;t hesitate to reply here with any questions you might have.<br><br>

Best,<br>
Polar

"""  # noqa: E501


class PledgerPledgePendingNotification(NotificationBase):
    pledge_amount: str
    issue_url: str
    issue_title: str
    issue_number: int
    issue_org_name: str
    issue_repo_name: str
    pledge_date: str

    def subject(self) -> str:
        return "{{issue_org_name}}/{{issue_repo_name}}#{{issue_number}} is completed"

    def body(self) -> str:
        return """Hi,<br><br>

Good news: <a href="{{issue_url}}">{{issue_org_name}}/{{issue_repo_name}}#{{issue_number}}</a> has been completed! You pledged ${{pledge_amount}} behind it on {{pledge_date}}. It will be rewarded to the creators in 14 days unless you file a dispute via email or the Polar dashboard within the next 7 days.
"""  # noqa: E501