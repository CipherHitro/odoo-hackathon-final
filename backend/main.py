from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.redis import redis_client

from app.api.users.routes import router as users_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.ping()

    yield

    # Shutdown
    await redis_client.aclose()

app = FastAPI(
    title="One Final Shot at Odoo",
    lifespan=lifespan,
)


app.include_router(users_router)


@app.get("/")
async def root():
    return {
        "message": "API is running"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}