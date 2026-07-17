"""
Database engine + session setup.

Defaults to a local SQLite file so the app runs with zero external setup.
To switch to your own Neon Postgres instance later, either set DATABASE_URL
in .env to your Neon connection string, or - if your password contains
characters like @ : / % # ? & that break inside a URL string - set the
separate PG_HOST / PG_USER / PG_PASSWORD / PG_DATABASE fields instead (see
.env.example). Nothing else in this file needs to change either way.
"""

from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()


def _normalize_database_url(raw_url: str) -> str:
    """Fixes two common copy-paste mistakes with Neon connection strings,
    since this project uses a synchronous SQLAlchemy engine (psycopg2),
    not an async one (asyncpg):

    1. Driver: "postgresql+asyncpg://" -> "postgresql+psycopg2://"
    2. SSL param name: asyncpg uses "?ssl=require", psycopg2 needs
       "?sslmode=require" instead - psycopg2 raises a fairly cryptic
       "invalid connection option \"ssl\"" error otherwise.

    Note: this can't fix a password containing @ : / % # ? & or a space -
    those characters are ambiguous once already embedded unescaped in a
    URL string (e.g. a "#" silently truncates everything after it). If
    that's the situation, use the separate PG_* fields instead - see
    _build_engine_url below.
    """
    if raw_url.startswith("sqlite"):
        return raw_url

    url = make_url(raw_url)

    if url.drivername == "postgresql+asyncpg":
        url = url.set(drivername="postgresql+psycopg2")

    if url.drivername.startswith("postgresql") and "ssl" in url.query and "sslmode" not in url.query:
        query = dict(url.query)
        ssl_value = str(query.pop("ssl")).lower()
        query["sslmode"] = "disable" if ssl_value in ("false", "0", "disable") else "require"
        url = url.set(query=query)

    # IMPORTANT: str(url) masks the password as "***" by default (a
    # SQLAlchemy safety feature to avoid accidentally logging credentials).
    # We need the real, usable password here, not a redacted one.
    return url.render_as_string(hide_password=False)


def _build_engine_url():
    """Prefers separate PG_* fields (if PG_HOST is set) since SQLAlchemy's
    URL.create() percent-encodes the username/password correctly no matter
    what characters they contain - avoiding the ambiguity of parsing an
    already-assembled URL string with unescaped special characters in it.
    Falls back to DATABASE_URL otherwise."""
    if settings.pg_host:
        query = {}
        if settings.pg_sslmode:
            query["sslmode"] = settings.pg_sslmode
        if settings.pg_channel_binding:
            query["channel_binding"] = settings.pg_channel_binding
        return URL.create(
            drivername="postgresql+psycopg2",
            username=settings.pg_user or None,
            password=settings.pg_password or None,
            host=settings.pg_host,
            port=settings.pg_port,
            database=settings.pg_database or None,
            query=query,
        )
    return _normalize_database_url(settings.database_url)


_database_url = _build_engine_url()
_is_sqlite = str(_database_url).startswith("sqlite")

_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    _database_url,
    connect_args=_connect_args,
    echo=False,
    future=True,
    # Validates each connection with a lightweight ping before using it,
    # and transparently reconnects if it's gone stale - this is what
    # fixes the classic "first request after the database has been idle
    # fails, then it works fine" symptom with serverless/autosuspending
    # Postgres providers like Neon, whose compute can suspend after
    # inactivity and silently drop pooled connections.
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
