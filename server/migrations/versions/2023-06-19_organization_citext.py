"""organization.citext

Revision ID: 5588a206e38a
Revises: 3d5320d33431
Create Date: 2023-06-19 09:11:59.916750

"""
from alembic import op
import sqlalchemy as sa
import citext


# Polar Custom Imports
from polar.kit.extensions.sqlalchemy import PostgresUUID

# revision identifiers, used by Alembic.
revision = "5588a206e38a"
down_revision = "3d5320d33431"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    op.alter_column(
        "organizations",
        "name",
        existing_type=sa.VARCHAR(length=50),
        type_=citext.CIText(),
        existing_nullable=False,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "organizations",
        "name",
        existing_type=citext.CIText(),
        type_=sa.VARCHAR(length=50),
        existing_nullable=False,
    )
    # ### end Alembic commands ###