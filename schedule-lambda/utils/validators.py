from .schedule_helper import validate_time_format, validate_date_format

def validate_schedule_input(date: str, start_time: str) -> tuple[bool, str]:
    """일정 입력 검증 - start_time만 받고 end_time은 자동 계산(+2시간, 자정 넘기 허용)"""
    if not date or not isinstance(date, str):
        return False, "date must be a non-empty string (YYYY-MM-DD)"

    if not validate_date_format(date):
        return False, "date format must be YYYY-MM-DD"

    if not start_time or not isinstance(start_time, str):
        return False, "start_time must be a non-empty string (HH:MM)"

    if not validate_time_format(start_time):
        return False, "start_time format must be HH:MM"

    return True, "Valid"