def validate_create_record_input(
    summary: str,
    follow_up_task: str,
    needs_next_consultation: bool
) -> tuple[bool, str]:
    """상담 기록 입력 검증"""
    if not summary or not isinstance(summary, str):
        return False, "summary must be a non-empty string"

    if len(summary.strip()) < 5 or len(summary.strip()) > 1000:
        return False, "summary must be 5-1000 characters"

    if not follow_up_task or not isinstance(follow_up_task, str):
        return False, "follow_up_task must be a non-empty string"

    if len(follow_up_task.strip()) < 5 or len(follow_up_task.strip()) > 500:
        return False, "follow_up_task must be 5-500 characters"

    if not isinstance(needs_next_consultation, bool):
        return False, "needs_next_consultation must be a boolean"

    return True, "Valid"