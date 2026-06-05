from datetime import datetime, timedelta
from typing import List, Dict, Any

MENTORING_DURATION_HOURS = 2    # 기본 멘토링 시간
MENTORING_BUFFER_MINUTES = 30   # 연장 대비 버퍼
MENTORING_BLOCK_MINUTES = MENTORING_DURATION_HOURS * 60 + MENTORING_BUFFER_MINUTES


def time_string_to_minutes(time_str: str) -> int:
    """시간 문자열(HH:MM)을 분 단위로 변환"""
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except Exception:
        return -1


def add_minutes_to_time(time_str: str, minutes: int) -> str:
    """HH:MM 시간에 분을 더해 HH:MM 반환. 24시간 초과 시 다음날로 wrap-around."""
    try:
        h, m = map(int, time_str.split(':'))
        total_minutes = h * 60 + m + minutes
        total_minutes = total_minutes % (24 * 60)
        return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    except Exception:
        return time_str


def add_hours_to_time(time_str: str, hours: int) -> str:
    return add_minutes_to_time(time_str, hours * 60)


def calculate_end_time(start_time: str) -> str:
    """실제 상담 종료 시간 (2시간, 버퍼 미포함)."""
    return add_minutes_to_time(start_time, MENTORING_DURATION_HOURS * 60)


def calculate_block_end_time(start_time: str) -> str:
    """충돌 검사용 블록 종료 시간 (2시간 + 30분 버퍼)."""
    return add_minutes_to_time(start_time, MENTORING_BLOCK_MINUTES)


def next_date(date_str: str) -> str:
    """YYYY-MM-DD 날짜에서 하루 뒤 날짜 반환"""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=1)
        return d.strftime('%Y-%m-%d')
    except Exception:
        return date_str


def is_overnight(start_time: str, end_time: str) -> bool:
    """end_time이 start_time보다 작거나 같으면 자정을 넘긴 일정"""
    return time_string_to_minutes(end_time) <= time_string_to_minutes(start_time)


def has_schedule_conflict_on_date(
    mentor_confirmed_requests: List[Dict[str, Any]],
    preferred_date: str,
    preferred_start: str,
) -> bool:
    """
    멘티의 희망 시작 시간 기준 블록(2시간+버퍼)이
    멘토의 기존 CONFIRMED 일정 블록과 겹치는지 확인.
    """
    # 멘티 희망 블록 (버퍼 포함)
    preferred_block_end = calculate_block_end_time(preferred_start)
    preferred_overnight = is_overnight(preferred_start, preferred_block_end)
    preferred_dates = {preferred_date}
    if preferred_overnight:
        preferred_dates.add(next_date(preferred_date))

    for req in mentor_confirmed_requests:
        schedule = req.get('schedule')
        if not schedule:
            continue

        existing_date  = schedule.get('date')
        existing_start = schedule.get('start_time')

        if not all([existing_date, existing_start]):
            continue

        # 기존 일정도 블록 end_time으로 비교
        existing_block_end     = calculate_block_end_time(existing_start)
        existing_block_overnight = is_overnight(existing_start, existing_block_end)
        existing_dates = {existing_date}
        if existing_block_overnight:
            existing_dates.add(next_date(existing_date))

        if not preferred_dates & existing_dates:
            continue

        base_date = min(preferred_date, existing_date)

        def abs_minutes(date_str: str, time_str: str) -> int:
            offset = 1440 if date_str != base_date else 0
            return time_string_to_minutes(time_str) + offset

        pref_abs_start = abs_minutes(preferred_date, preferred_start)
        pref_abs_end   = abs_minutes(
            next_date(preferred_date) if preferred_overnight else preferred_date,
            preferred_block_end
        )
        ex_abs_start   = abs_minutes(existing_date, existing_start)
        ex_abs_end     = abs_minutes(
            next_date(existing_date) if existing_block_overnight else existing_date,
            existing_block_end
        )

        if ex_abs_start < pref_abs_end and pref_abs_start < ex_abs_end:
            return True

    return False
