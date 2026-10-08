from typing import Optional, Any, Literal
from pydantic import BaseModel, ConfigDict

QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]


class Option(BaseModel):
    id: str
    label: str


class QuestionBase(BaseModel):
    title: str = ""
    description: Optional[str] = ""
    required: bool = False
    type: QuestionType
    order_index: int
    options_json: Optional[Any] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(QuestionBase):
    title: Optional[str] = None
    type: Optional[QuestionType] = None
    order_index: Optional[int] = None


class Question(QuestionBase):
    id: int
    form_id: int

    model_config = ConfigDict(from_attributes=True)
