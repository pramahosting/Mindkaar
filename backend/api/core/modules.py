from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware import Middleware
from typing import List

def make_middleware() -> List[Middleware]:
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],       # tighten this in production
            allow_methods=["*"],
            allow_headers=["*"],
        ),
        # Middleware(SQLAlchemyMiddleware),
    ]
    return middleware