from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.database import SessionLocal
from app.schemas import Question as QuestionSchema, ResponseSubmission
from app.services import response_service

router = APIRouter(prefix="/api/public", tags=["public"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PublicFormOut(BaseModel):
    id: int
    title: str
    slug: str
    thank_you_text: str
    theme_json: Any = None
    questions: List[QuestionSchema] = []

    model_config = ConfigDict(from_attributes=True)


@router.get("/forms/{slug}", response_model=PublicFormOut)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    form = response_service.get_public_form_by_slug(db, slug)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")
    return form


@router.post("/forms/{slug}/responses", status_code=status.HTTP_201_CREATED)
def submit_response(
    slug: str,
    submission: ResponseSubmission,
    db: Session = Depends(get_db),
):
    response_id = response_service.create_response(db, slug, submission)
    return {"id": response_id}
