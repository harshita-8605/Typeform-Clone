from typing import Optional, Any, Literal
from pydantic import BaseModel, ConfigDict, model_validator

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


class QuestionUpsert(BaseModel):
    id: Optional[int] = None
    title: str = ""
    description: Optional[str] = ""
    required: bool = False
    type: QuestionType
    order_index: int
    options_json: Optional[Any] = None

    @model_validator(mode="after")
    def validate_options(self):
        if self.type in ("multiple_choice", "dropdown"):
            options = self.options_json
            if not isinstance(options, dict) or not isinstance(options.get("options"), list):
                raise ValueError("Choice questions require an options list")
            if any(
                not isinstance(option, dict)
                or not isinstance(option.get("id"), str)
                or not option.get("id").strip()
                or not isinstance(option.get("label"), str)
                or not option.get("label").strip()
                for option in options["options"]
            ):
                raise ValueError("Each choice option requires a non-empty id and label")
        if self.type == "rating":
            options = self.options_json or {}
            if not isinstance(options, dict) or not isinstance(options.get("min"), (int, float)) or not isinstance(options.get("max"), (int, float)) or options["min"] >= options["max"]:
                raise ValueError("Rating questions require valid min and max values")
        if self.type == "number" and self.options_json is not None:
            options = self.options_json
            if not isinstance(options, dict):
                raise ValueError("Number settings must be an object")
            if options.get("min") is not None and not isinstance(options["min"], (int, float)):
                raise ValueError("Number min must be numeric")
            if options.get("max") is not None and not isinstance(options["max"], (int, float)):
                raise ValueError("Number max must be numeric")
            if options.get("min") is not None and options.get("max") is not None and options["min"] > options["max"]:
                raise ValueError("Number min cannot exceed max")
        return self


class QuestionUpdate(QuestionBase):
    title: Optional[str] = None
    type: Optional[QuestionType] = None
    order_index: Optional[int] = None


class Question(QuestionBase):
    id: int
    form_id: int

    model_config = ConfigDict(from_attributes=True)
