from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "mg_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profiles: Mapped[list["MindProfile"]] = relationship(back_populates="user")
    results: Mapped[list["GameResult"]] = relationship(back_populates="user")


class MindProfile(Base):
    __tablename__ = "mg_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("mg_users.id"))
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mood: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    stress_level: Mapped[int] = mapped_column(Integer, default=5)
    support: Mapped[str | None] = mapped_column(Text, nullable=True)
    goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="profiles")


class GameResult(Base):
    __tablename__ = "mg_game_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("mg_users.id"))
    scenario: Mapped[str] = mapped_column(String(60))
    game_id: Mapped[str] = mapped_column(String(60))
    score: Mapped[int] = mapped_column(Integer)
    max_level: Mapped[int] = mapped_column(Integer)
    chopped: Mapped[int] = mapped_column(Integer, default=0)
    missed: Mapped[int] = mapped_column(Integer, default=0)
    mental_status: Mapped[str] = mapped_column(String(60))
    summary: Mapped[str] = mapped_column(Text)
    tip: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="results")
