"""
Standalone Neon/Postgres connection diagnostic - NOT part of the app.

Run this directly to see exactly what backend/.env resolves to, BEFORE
it reaches Postgres. This bypasses FastAPI/uvicorn entirely so we can
isolate whether the problem is in how the .env value is being read, or
a genuine rejection from Neon.

Usage (from the backend folder, with your venv active):
    python check_db.py

Safe to share the output with support - it never prints your actual
password, only its length and first/last character.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

pg_host = os.getenv("PG_HOST", "")
pg_port = os.getenv("PG_PORT", "5432")
pg_user = os.getenv("PG_USER", "")
pg_password = os.getenv("PG_PASSWORD", "")
pg_database = os.getenv("PG_DATABASE", "")
pg_sslmode = os.getenv("PG_SSLMODE", "require")
pg_channel_binding = os.getenv("PG_CHANNEL_BINDING", "require")
database_url = os.getenv("DATABASE_URL", "")

print("=" * 60)
print("WHAT .env RESOLVED TO (password never shown in full)")
print("=" * 60)
print(f"PG_HOST            = {pg_host!r}")
print(f"PG_PORT             = {pg_port!r}")
print(f"PG_USER             = {pg_user!r}")
print(f"PG_DATABASE         = {pg_database!r}")
print(f"PG_SSLMODE          = {pg_sslmode!r}")
print(f"PG_CHANNEL_BINDING  = {pg_channel_binding!r}")

if pg_password:
    masked = pg_password[0] + "*" * max(len(pg_password) - 2, 0) + pg_password[-1]
    print(f"PG_PASSWORD         = {masked!r}  (length: {len(pg_password)})")
    if pg_password != pg_password.strip():
        print("  !! WARNING: password has leading/trailing whitespace - this will break auth.")
    if (pg_password.startswith('"') and pg_password.endswith('"')) or (
        pg_password.startswith("'") and pg_password.endswith("'")
    ):
        print("  !! WARNING: password appears to still have quote characters around it.")
else:
    print("PG_PASSWORD         = (EMPTY) !! This is almost certainly the problem if you meant to set it.")

print()
print(f"DATABASE_URL (raw)  = {database_url!r}")
print()

if not pg_host and not database_url:
    print("Neither PG_HOST nor DATABASE_URL is set - nothing to test. Exiting.")
    sys.exit(1)

print("=" * 60)
print("ATTEMPTING DIRECT psycopg2 CONNECTION (bypassing SQLAlchemy/FastAPI)")
print("=" * 60)

import psycopg2  # noqa: E402

try:
    if pg_host:
        print(f"Connecting via PG_* fields to {pg_host}:{pg_port}/{pg_database} as {pg_user} ...")
        conn = psycopg2.connect(
            host=pg_host,
            port=int(pg_port),
            user=pg_user,
            password=pg_password,
            dbname=pg_database,
            sslmode=pg_sslmode or "require",
        )
    else:
        print("Connecting via DATABASE_URL ...")
        conn = psycopg2.connect(database_url)

    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("SUCCESS! Connected. Server says:", cur.fetchone()[0])
    conn.close()

except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
    print()
    print("If this says 'password authentication failed' and the password shown")
    print("above looks right and has no whitespace/quote warnings, the password")
    print("value itself is wrong from Neon's perspective - try copying it fresh")
    print("from the Neon console's Connect panel right before running this again.")
