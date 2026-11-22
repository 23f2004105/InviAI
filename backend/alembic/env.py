"""
Alembic environment.

The database URL comes from the app (DATABASE_URL in the environment or
backend/.env), so alembic.ini holds no credentials. Run from backend/:

    alembic revision --autogenerate -m "describe change"
    alembic upgrade head
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.database import Base, DATABASE_URL
import app.models  # noqa: F401  (registers all tables on Base.metadata)

config = context.config

# Skip when called from the running app (app.main.run_migrations): fileConfig
# would otherwise disable the app's existing loggers.
if config.config_file_name is not None and not config.attributes.get("skip_logging_config"):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Tables that exist in old local databases but are no longer modelled.
# Leave them alone instead of generating DROP TABLE.
IGNORED_TABLES = {"users"}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and compare_to is None and name in IGNORED_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
