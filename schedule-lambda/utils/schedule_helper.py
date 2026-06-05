from datetime import datetime, timedelta
from typing import List, Dict, Any

MENTORING_DURATION_HOURS = 2    # 기본 멘토링 시간
MENTORING_BUFFER_MINUTES = 30   # 연장 대비 버퍼 (다음 상담과의 최소 간격)
# 충돌 검사 기준: 2시간 + 30분 버퍼 = 150분
MENTORING_BLOCK_MINUTES = MENTORING_DURATION_HOURS * 60 + MENTORING_BUFFER_MINUTES


def add_minutes_to_time(time_str: str, minutes: int) -> str:
    """HH:MM 시간에 분을 더해 HH:MM 반환. 24시간 초과 시 다음날로 wrap-around."""
    try:
        h, m = map(int, time_str.split(':'))
        total_minutes = h * 60 + m + minutes
        total_minutes = total_minutes % (24 * 60)
        return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    except Exception:
        return time_str


def time_string_to_minutes(time_str: str) -> int:
    """시간 문자열(HH:MM)을 분 단위로 변환"""
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except Exception:
        return -1


def add_hours_to_time(time_str: str, hours: int) -> str:
    """HH:MM 시간에 시간을 더해 HH:MM 반환. 24시간 초과 시 다음날로 wrap-around."""
    return add_minutes_to_time(time_str, hours * 60)


def calculate_end_time(start_time: str) -> str:
    """start_time 기준으로 실제 상담 종료 시간 계산 (2시간, 버퍼 미포함)."""
    return add_minutes_to_time(start_time, MENTORING_DURATION_HOURS * 60)


def calculate_block_end_time(start_time: str) -> str:
    """충돌 검사용 블록 종료 시간 계산 (2시간 + 30분 버퍼 = 150분)."""
    return add_minutes_to_time(start_time, MENTORING_BLOCK_MINUTES)


def next_date(date_str: str) -> str:
    """YYYY-MM-DD 날짜에서 하루 뒤 날짜 반환"""
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d') + timedelta(days=1)
        return d.strftime('%Y-%m-%d')
    except Exception:
        return date_str


def is_overnight(start_time: str, end_time: str) -> bool:
    """end_time이 start_time보다 작으면 자정을 넘긴 일정"""
    return time_string_to_minutes(end_time) <= time_string_to_minutes(start_time)


def check_schedule_conflict(
    mentor_requests: List[Dict[str, Any]],
    new_date: str,
    new_start_time: str,
    new_end_time: str,
) -> bool:
    """
    새 일정과 기존 일정이 충돌하는지 확인.
    충돌 검사는 실제 end_time이 아닌 블록 end_time(+버퍼)으로 수행해
    상담 연장 및 다음 상담과의 간격을 보장.

    반환:
    - True: 충돌 있음
    - False: 충돌 없음
    """
    # 신규 일정: 충돌 검사는 블록 end_time 기준
    new_block_end = calculate_block_end_time(new_start_time)
    new_overnight = is_overnight(new_start_time, new_block_end)
    new_dates = {new_date}
    if new_overnight:
        new_dates.add(next_date(new_date))

    for request in mentor_requests:
        schedule = request.get('schedule')
        if not schedule:
            continue

        existing_date = schedule.get('date')
        existing_start = schedule.get('start_time')
        existing_end = schedule.get('end_time')

        if not all([existing_date, existing_start, existing_end]):
            continue

        existing_overnight = is_overnight(existing_start, existing_end)
        # 기존 일정도 블록 end_time으로 검사
        existing_block_end = calculate_block_end_time(existing_start)
        existing_block_overnight = is_overnight(existing_start, existing_block_end)
        existing_dates = {existing_date}
        if existing_block_overnight:
            existing_dates.add(next_date(existing_date))

        if not new_dates & existing_dates:
            continue

        base_date = min(new_date, existing_date)

        def abs_minutes(date_str: str, time_str: str) -> int:
            offset = 1440 if date_str != base_date else 0
            return time_string_to_minutes(time_str) + offset

        new_abs_start = abs_minutes(new_date, new_start_time)
        new_abs_end   = abs_minutes(
            next_date(new_date) if new_overnight else new_date,
            new_block_end
        )
        ex_abs_start  = abs_minutes(existing_date, existing_start)
        ex_abs_end    = abs_minutes(
            next_date(existing_date) if existing_block_overnight else existing_date,
            existing_block_end
        )

        if ex_abs_start < new_abs_end and new_abs_start < ex_abs_end:
            return True

    return False


def is_date_overlapping(existing_date: str, new_date: str) -> bool:
    """날짜가 같은지 확인 (단순 비교용, check_schedule_conflict 내부에서는 미사용)"""
    return existing_date == new_date


def validate_time_format(time_str: str) -> bool:
    """시간 형식 검증 (HH:MM)"""
    try:
        parts = time_str.split(':')
        if len(parts) != 2:
            return False
        hours = int(parts[0])
        minutes = int(parts[1])
        return 0 <= hours <= 23 and 0 <= minutes <= 59
    except Exception:
        return False


def validate_date_format(date_str: str) -> bool:
    """날짜 형식 검증 (YYYY-MM-DD)"""
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except Exception:
        return False