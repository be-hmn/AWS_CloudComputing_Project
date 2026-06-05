import json
from utils.db import get_request_by_id, get_mentor_by_id, get_mentor_requests, update_schedule_request
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response, conflict_response
from utils.validators import validate_schedule_input
from utils.schedule_helper import check_schedule_conflict, calculate_end_time

def handle_update_schedule(event: dict) -> dict:
    """PUT /requests/{request_id}/schedule - 상담 일정 수정"""
    try:
        # 권한 확인 (ADMIN, MENTOR)
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id or role not in ['admin', 'mentor']:
            return error_response(403, 'FORBIDDEN', 'Only ADMIN or MENTOR can update schedules')

        # 경로에서 request_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        body = json.loads(event.get('body', '{}'))

        date = body.get('date', '').strip()
        start_time = body.get('start_time', '').strip()

        # 입력값 검증 (start_time만 받음, end_time은 +2시간 자동 계산)
        valid, msg = validate_schedule_input(date, start_time)
        if not valid:
            return error_response(400, 'INVALID_INPUT', msg)

        # end_time = start_time + 2시간 자동 계산
        end_time = calculate_end_time(start_time)

        # 1. request_id로 상담 신청 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 2. mentor_user_id 확인
        mentor_user_id = request_item.get('mentor_user_id')
        if not mentor_user_id:
            return error_response(400, 'MENTOR_NOT_ASSIGNED', 'Mentor is not assigned to this request')

        # 3. Users 조회
        mentor = get_mentor_by_id(mentor_user_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found')

        # 4. mentor_active 확인
        mentor_active = mentor.get('mentor_active', False)
        if not mentor_active:
            return conflict_response('mentor unavailable')

        # 일정 충돌 검사 (현재 request_id 제외, CONFIRMED 상태이고 일정 있는 것만)
        mentor_requests = get_mentor_requests(mentor_user_id)

        confirmed_requests = [
            req for req in mentor_requests
            if req.get('request_id') != request_id
            and req.get('status') == 'CONFIRMED'
            and req.get('schedule')
        ]

        # 충돌 확인
        has_conflict = check_schedule_conflict(confirmed_requests, date, start_time, end_time)
        if has_conflict:
            return conflict_response('schedule conflict')

        # 충돌 없으면 일정 수정
        updated_request = update_schedule_request(request_id, date, start_time, end_time)

        response_data = {
            'request_id': updated_request.get('request_id'),
            'schedule': updated_request.get('schedule')
        }

        return success_response(200, response_data, 'Schedule updated successfully')

    except Exception as e:
        print(f"Update schedule error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')