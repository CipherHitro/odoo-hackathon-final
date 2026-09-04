# Backend

FastAPI + SQLAlchemy (async) + Alembic async migrations + Argon2 password hashing +
JWT auth delivered via httpOnly cookies.

## Setup

```bash
uv init
uv sync
```

## Run the database

```bash
docker compose up -d
```

## Run the server

```bash
uv run uvicorn main:app --reload
```

## Environment modes

Set `APP_ENV` in `.env`:

- `development` - cookie is NOT marked `Secure` (works over plain HTTP on localhost）。
- `production` - cookie is marked `Secure` (HTTPS only) automatically。

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new user (body: `name`, `email`, `password`) and sets the auth cookie |
| POST | `/auth/login` | Login (body: `email`, `password`) and sets the auth cookie |
| GET | `/auth/me` | Return the current authenticated user (reads the auth cookie） |
| POST | `/auth/logout` | Clear the auth cookie |

## Migrations

```bash
# after changing app/models/, generate a new migration
uv run alembic revision --autogenerate -m "describe the change"

# apply pending migrations
uv run alembic upgrade head
```
