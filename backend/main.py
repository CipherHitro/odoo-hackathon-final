from fastapi import FastAPI

from app.api.users.routes import router as users_router


app = FastAPI(
    title="One Final Shot at Odoo",
)


app.include_router(users_router)


@app.get("/")
async def root():
    return {
        "message": "API is running"
    }