def validate_create_request(interest_field: str, topic: str, message: str) -> tuple[bool, str]:
    """상담 신청 입력 검증"""
    if not interest_field or not isinstance(interest_field, str):
        return False, "interest_field must be a non-empty string"

    if len(interest_field.strip()) < 2 or len(interest_field.strip()) > 100:
        return False, "interest_field must be 2-100 characters"

    if not topic or not isinstance(topic, str):
        return False, "topic must be a non-empty string"

    if len(topic.strip()) < 3 or len(topic.strip()) > 200:
        return False, "topic must be 3-200 characters"

    if not message or not isinstance(message, str):
        return False, "message must be a non-empty string"

    if len(message.strip()) < 10 or len(message.strip()) > 2000:
        return False, "message must be 10-2000 characters"

    return True, "Valid"