from utils.db import get_mentor, get_mentor_assigned_requests
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_get_mentor_requests(event: dict) -> dict:
    """GET /mentors/{mentor_id}/requests - 멘토 본인의 배정 요청 목록 조회"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        # MENTOR는 본인 것만, ADMIN은 모든 멘토 조회 가능
        if role == 'mentor' and user_id != mentor_id:
            return error_response(403, 'FORBIDDEN', 'You can only view your own requests')

        if role not in ['mentor', 'admin']:
            return error_response(403, 'FORBIDDEN', 'Only MENTOR or ADMIN can access this endpoint')

        # 멘토 존재 확인
        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found')

        requests = get_mentor_assigned_requests(mentor_id)

        response_data = {
            'mentor_id': mentor_id,
            'count': len(requests),
            'requests': requests,
        }

        return success_response(200, response_data, 'Mentor requests retrieved successfully')

    except Exception as e:
        print(f"Get mentor requests error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
