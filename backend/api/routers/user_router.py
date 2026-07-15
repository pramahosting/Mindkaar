from fastapi import APIRouter
from backend.api.endpoints.olama.ask_olama import ask
user_router = APIRouter()

user_router.include_router( ask,
    prefix="/ask",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)