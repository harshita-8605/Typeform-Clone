"""add form ownership"""

from alembic import op
import sqlalchemy as sa

revision = "0001_add_owner_email"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if "owner_email" not in {column["name"] for column in inspector.get_columns("forms")}:
        op.add_column("forms", sa.Column("owner_email", sa.String(), nullable=True))
    if "ix_forms_owner_email" not in {index["name"] for index in inspector.get_indexes("forms")}:
        op.create_index("ix_forms_owner_email", "forms", ["owner_email"])


def downgrade():
    op.drop_index("ix_forms_owner_email", table_name="forms")
    op.drop_column("forms", "owner_email")
