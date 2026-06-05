from utils.db import get_request_by_id, get_schedule_from_request
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_get_schedule(event: dict) -> dict:
    """GET /requests/{request_id}/schedule - 상담 일정 조회"""
    try:
        # 권한 확인 (ADMIN, MENTOR, MENTEE)
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id or role not in ['admin', 'mentor', 'mentee']:
            return error_response(403, 'FORBIDDEN', 'Only ADMIN, MENTOR, or MENTEE can view schedules')

        # 경로에서 request_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        # request_id로 상담 신청 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # schedule 조회
        schedule = request_item.get('schedule')

        if not schedule:
            return error_response(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found for this request')

        return success_response(200, schedule, 'Schedule retrieved successfully')

    except Exception as e:
        print(f"Get schedule error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')