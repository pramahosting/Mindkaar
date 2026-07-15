from fastapi import APIRouter
from backend.rag.query import apiRequestOlama,askOllama
import json, re

from backend.api.endpoints.groq.model import Profile

ask = APIRouter()

@ask.get("/")
async def ask_llm():
    return {"msg": "LLM is working fine"}


@ask.post("/llm")
async def ask_llm(profile: Profile):
    print(profile)
    response = await apiRequestOlama(profile)
    return response

@ask.post("/olama")
async def ask_llm(profile: Profile):
    response = await askOllama(profile)
    return response
