from utils.db import get_requests_by_mentee
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response

def handle_get_requests(event: dict) -> dict:
    """GET /requests - 멘티의 모든 상담 신청 조회"""
    try:
        # JWT 토큰에서 mentee_user_id 추출
        auth_header = event.get('headers', {}).get('Authorization', '')
        mentee_user_id = get_user_id_from_token(auth_header)

        if not mentee_user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        # 상담 신청 조회
        requests = get_requests_by_mentee(mentee_user_id)

        return success_response(200, {'requests': requests}, 'Requests retrieved successfully')

    except Exception as e:
        print(f"Get requests error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')