from utils.db import get_mentor_stats
from utils.auth import is_admin
from utils.response import success_response, error_response

def handle_get_mentor_stats(event: dict) -> dict:
    """GET /admin/mentors/{mentor_id}/stats - 멘토별 배정 건수와 상담 완료 건수 조회"""
    try:
        # ADMIN 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not is_admin(auth_header):
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        # 경로에서 mentor_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        # 멘토 통계 조회
        stats = get_mentor_stats(mentor_id)

        return success_response(200, stats, 'Mentor statistics retrieved successfully')

    except Exception as e:
        print(f"Get mentor stats error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')