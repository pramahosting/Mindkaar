"""
Lightweight auto-migration.

This project doesn't use Alembic (kept simple on purpose), but that means
Base.metadata.create_all() only creates BRAND NEW tables - it never adds
columns to a table that already exists. Since this is actively iterated
on and columns get added over time, that would otherwise mean manually
dropping/recreating tables (and losing data) every time the schema
changes.

This runs once at startup, after create_all(): for every model, it
compares the columns SQLAlchemy expects against what actually exists in
the database, and issues `ALTER TABLE ... ADD COLUMN ...` for anything
missing. All new columns added this way must be nullable (no NOT NULL
without a default), which is true of every column added so far.

Works against both SQLite and Postgres/Neon.
"""

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.database import Base

logger = logging.getLogger("mindgym.migrate")


def run_lightweight_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                # Brand new table - create_all() already handled this.
                continue

            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}

            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}"
                logger.info("Migrating: %s", ddl)
                conn.execute(text(ddl))
