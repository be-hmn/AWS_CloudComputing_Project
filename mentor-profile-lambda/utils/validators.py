def validate_mentor_fields(mentor_fields: list) -> tuple[bool, str]:
    """
    멘토 전공 분야 검증
    - 리스트여야 함
    - 최소 1개 이상
    - 각 필드는 문자열
    - 각 필드는 2~50자
    """
    if not isinstance(mentor_fields, list):
        return False, "mentor_fields must be a list"

    if len(mentor_fields) == 0:
        return False, "mentor_fields must have at least one field"

    if len(mentor_fields) > 10:
        return False, "mentor_fields cannot have more than 10 fields"

    for field in mentor_fields:
        if not isinstance(field, str):
            return False, "Each field must be a string"

        if len(field.strip()) < 2 or len(field.strip()) > 50:
            return False, "Each field must be 2-50 characters"

    return True, "Valid"

def validate_availability_times(times: dict) -> tuple[bool, str]:
    """
    mentor 상담 가능 시간 검증
    Format: {
        "MON": {"start": 10, "end": 18},
        "TUE": {"start": 10, "end": 18},
        ...
    }
    """
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI']

    for day, time_slot in times.items():
        if day not in days:
            return False, f"Invalid day: {day}"

        if 'start' not in time_slot or 'end' not in time_slot:
            return False, f"Missing start or end time for {day}"

        start = time_slot['start']
        end = time_slot['end']

        if not isinstance(start, int) or not isinstance(end, int):
            return False, "Time must be integer (0-23)"

        if start < 0 or start > 23 or end < 0 or end > 23:
            return False, "Time must be between 0-23"

        if start >= end:
            return False, f"Start time must be before end time for {day}"

    return True, "Valid"