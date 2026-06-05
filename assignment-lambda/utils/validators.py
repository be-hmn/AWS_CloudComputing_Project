def validate_assign_mentor_input(request_id: str, mentor_id: str) -> tuple[bool, str]:
    """배정 입력 검증"""
    if not request_id or not isinstance(request_id, str):
        return False, "request_id must be a non-empty string"

    if not mentor_id or not isinstance(mentor_id, str):
        return False, "mentor_id must be a non-empty string"

    return True, "Valid"

def validate_reject_reason(reject_reason: str) -> tuple[bool, str]:
    """거절 사유 검증"""
    if not reject_reason or not isinstance(reject_reason, str):
        return False, "reject_reason must be a non-empty string"

    if len(reject_reason.strip()) < 2 or len(reject_reason.strip()) > 500:
        return False, "reject_reason must be 2-500 characters"

    return True, "Valid"