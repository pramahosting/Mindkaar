from fastapi import FastAPI
from backend.api.core.modules import make_middleware
from backend.api.routers.main_router import router
app = FastAPI(
    title="Mental Health API",
    version="1.0.0",
    middleware=make_middleware(),
)

app.include_router(router)