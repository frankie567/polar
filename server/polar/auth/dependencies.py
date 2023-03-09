import uuid
from typing import AsyncGenerator

from fastapi import Depends
from fastapi_users import FastAPIUsers

from polar.auth.session import UserManager, auth_backend
from polar.models import OAuthAccount, User
from polar.user.service import UserDatabase
from polar.postgres import AsyncSession, get_db_session


async def get_user_db(
    session: AsyncSession = Depends(get_db_session),
) -> AsyncGenerator[UserDatabase, None]:
    yield UserDatabase(session, User, OAuthAccount)


async def get_user_manager(
    user_db: UserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)

__all__ = [
    "get_user_db",
    "get_user_manager",
    "fastapi_users",
    "current_active_user",
]