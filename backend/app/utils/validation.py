import re
from typing import Any, Optional


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_email_format(email: str) -> bool:
    if not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email))


def validate_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, (int, float))


def validate_option_value(
    question_options: Optional[dict],
    submitted_option_label_or_id: Any,
) -> bool:
    if not question_options or not isinstance(question_options, dict):
        return False

    options = question_options.get("options", [])
    if not isinstance(options, list):
        return False

    submitted = str(submitted_option_label_or_id)
    for opt in options:
        if not isinstance(opt, dict):
            continue
        option_id = opt.get("id")
        option_label = opt.get("label")
        if option_id == submitted or (
            isinstance(option_label, str)
            and option_label.casefold() == submitted.casefold()
        ):
            return True

    return False
