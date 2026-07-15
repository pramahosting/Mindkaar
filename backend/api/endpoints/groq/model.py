from pydantic import BaseModel, EmailStr
from typing import Optional

class Profile(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: Optional[int] = None
    mood: Optional[str] = None
    sleepHours: Optional[float] = None
    stressLevel: int
    support: Optional[str] = None
    goals: Optional[str] = None