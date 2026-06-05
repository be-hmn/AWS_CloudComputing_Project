from utils.db import get_all_mentors
from utils.auth import is_admin
from utils.response import success_response, error_response

def handle_get_all_mentors(event: dict) -> dict:
    """GET /admin/mentors - 전체 멘토 목록과 활성 상태 조회"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not is_admin(auth_header):
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        # query parameter로 active 상태 필터링 가능 (?active=true/false)
        query_params = event.get('queryStringParameters') or {}
        active_filter = query_params.get('active', '').lower()

        mentors = get_all_mentors(active_filter)

        response_data = {
            'count': len(mentors),
            'mentors': mentors,
        }

        return success_response(200, response_data, 'Mentor list retrieved successfully')

    except Exception as e:
        print(f"Get all mentors error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
