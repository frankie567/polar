"""org and repo columns on issue dependencies

Revision ID: 81a8b7f69d1f
Revises: d67af495a760
Create Date: 2023-04-03 11:27:37.739975

"""
from alembic import op
import sqlalchemy as sa


# Polar Custom Imports

# revision identifiers, used by Alembic.
revision = "81a8b7f69d1f"
down_revision = "d67af495a760"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "issue_dependencies", sa.Column("organization_id", sa.UUID(), nullable=False)
    )
    op.add_column(
        "issue_dependencies", sa.Column("repository_id", sa.UUID(), nullable=False)
    )
    op.create_foreign_key(
        op.f("issue_dependencies_organization_id_fkey"),
        "issue_dependencies",
        "organizations",
        ["organization_id"],
        ["id"],
    )
    op.create_foreign_key(
        op.f("issue_dependencies_repository_id_fkey"),
        "issue_dependencies",
        "repositories",
        ["repository_id"],
        ["id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(
        op.f("issue_dependencies_repository_id_fkey"),
        "issue_dependencies",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("issue_dependencies_organization_id_fkey"),
        "issue_dependencies",
        type_="foreignkey",
    )
    op.drop_column("issue_dependencies", "repository_id")
    op.drop_column("issue_dependencies", "organization_id")
    # ### end Alembic commands ###
