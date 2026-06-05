from utils.db import get_mentee_requests
from utils.auth import is_admin
from utils.response import success_response, error_response

def handle_get_mentee_requests(event: dict) -> dict:
    """GET /admin/mentees/{mentee_id}/requests - 특정 멘티의 신청 이력 조회"""
    try:
        # ADMIN 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not is_admin(auth_header):
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        # 경로에서 mentee_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        mentee_id = path_parameters.get('mentee_id', '').strip()

        if not mentee_id:
            return error_response(400, 'MISSING_MENTEE_ID', 'mentee_id is required')

        # 멘티 신청 이력 조회
        requests = get_mentee_requests(mentee_id)

        response_data = {
            'mentee_id': mentee_id,
            'count': len(requests),
            'requests': requests
        }

        return success_response(200, response_data, 'Mentee requests retrieved successfully')

    except Exception as e:
        print(f"Get mentee requests error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')