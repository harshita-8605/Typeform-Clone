from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import inspect, text

from app.database import SessionLocal, engine, Base
from app.routers import forms, public


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if "owner_email" not in {column["name"] for column in inspect(engine).get_columns("forms")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE forms ADD COLUMN owner_email VARCHAR"))
    yield


app = FastAPI(title="Typeform Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.include_router(forms.router)
app.include_router(public.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
