from datetime import datetime
from typing import Optional, Any, Literal, List
from pydantic import BaseModel, ConfigDict

from app.schemas.question import Question

FormStatus = Literal["draft", "published"]


class FormBase(BaseModel):
    title: Optional[str] = "Untitled form"
    slug: Optional[str] = None
    status: Optional[FormStatus] = "draft"
    theme_json: Optional[Any] = None
    thank_you_text: Optional[str] = "Thanks for completing this form!"


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[FormStatus] = None
    theme_json: Optional[Any] = None
    thank_you_text: Optional[str] = None


class Form(FormBase):
    id: int
    created_at: datetime
    updated_at: datetime
    response_count: Optional[int] = None
    questions: List[Question] = []

    model_config = ConfigDict(from_attributes=True)


class FormListItem(BaseModel):
    id: int
    title: str
    slug: Optional[str]
    status: str
    updated_at: datetime
    response_count: int
