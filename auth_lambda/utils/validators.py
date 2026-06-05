import re

def validate_email(email: str) -> bool:
    """이메일 형식 검증"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, str]:
    """
    비밀번호 검증
    - 최소 8자 이상
    - 영문, 숫자, 특수문자 포함
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"

    if not re.search(r'[a-zA-Z]', password):
        return False, "Password must contain letters"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain numbers"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain special characters"

    return True, "Valid"

def validate_nickname(nickname: str) -> tuple[bool, str]:
    """
    닉네임 검증
    - 2~20자
    - 영문, 숫자, 언더스코어만 가능
    """
    if len(nickname) < 2 or len(nickname) > 20:
        return False, "Nickname must be 2-20 characters"

    if not re.match(r'^[a-zA-Z0-9_]+$', nickname):
        return False, "Nickname can only contain letters, numbers, and underscores"

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