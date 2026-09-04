# Backend

FastAPI + SQLAlchemy (async) + Alembic migrations + Argon2 password hashing +
JWT auth delivered via httpOnly cookies.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) — installs the correct Python version automatically
- [Docker](https://docs.docker.com/get-docker/) — runs the local Postgres database

## Getting started (fresh clone)

```bash
# 1. clone the repo
git clone <repo-url>
cd odoo-final/backend

# 2. install dependencies (creates .venv from uv.lock, Python version included)
uv sync

# 3. create your local .env (it is gitignored)
cp .env.example .env

# 4. start the Postgres database
docker compose up -d

# 5. create the schema in your database (migration files are already in the repo)
uv run alembic upgrade head

# 6. run the API (auto-reloads on code changes)
uv run fastapi dev
```

Then open http://127.0.0.1:8000/docs for the Swagger UI.

## Commands

| Command | What it does |
|---------|--------------|
| `uv run fastapi dev` | run the API with auto-reload (dev server on http://127.0.0.1:8000) |
| `uv run fastapi run` | run the API in production mode (no reload) |
| `docker compose up -d` | start the Postgres container |
| `docker compose down` | stop the Postgres container |
| `uv run alembic upgrade head` | apply pending migrations |

## Environment modes

Set `APP_ENV` in `.env`:

- `development` — cookie is NOT marked `Secure` (works over plain HTTP on localhost)
- `production` — cookie is marked `Secure` (HTTPS only) automatically

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user (body: `name`, `email`, `password`) and sets the auth cookie |
| POST | `/auth/login` | Login (body: `email`, `password`) and sets the auth cookie |
| GET | `/auth/me` | Return the current authenticated user (reads the auth cookie) |
| POST | `/auth/logout` | Clear the auth cookie |

## Testing the email service

The email service (Resend) sends two emails: a **welcome email** and a **password
reset OTP** (6-digit code). Send them to yourself with the manual test script —
it uses the `RESEND_*` credentials from `.env`:

```bash
uv run python -m app.test_email                # send both emails
uv run python -m app.test_email welcome        # welcome email only
uv run python -m app.test_email reset          # password reset OTP only
uv run python -m app.test_email welcome you@example.com   # custom recipient
```

Templates live in `app/services/email/templates/`; the send functions are in
`app/services/email/service.py`. `APP_NAME` and `OTP_EXPIRE_MINUTES` in `.env`
control what the emails look like and how long the code stays valid.

## For maintainers: changing the schema

```bash
# after changing app/models/, generate a new migration file
uv run alembic revision --autogenerate -m "describe the change"

# apply it to your database
uv run alembic upgrade head
```

Commit the generated file in `migrations/versions/` — everyone else only ever needs
`uv run alembic upgrade head` to pick it up.
