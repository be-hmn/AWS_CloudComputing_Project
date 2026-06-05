from utils.db import get_requests_by_status, get_all_requests
from utils.auth import is_admin
from utils.response import success_response, error_response

def handle_get_requests_by_status(event: dict) -> dict:
    """GET /admin/requests - 상태별 상담 신청 목록 조회"""
    try:
        # ADMIN 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not is_admin(auth_header):
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        # Query parameter에서 status 추출
        query_parameters = event.get('queryStringParameters', {})
        status = query_parameters.get('status', '').strip().upper() if query_parameters else ''

        # status가 지정되지 않으면 모든 신청 반환
        if not status:
            requests = get_all_requests()
            return success_response(200, {'requests': requests}, 'All requests retrieved successfully')

        # 유효한 status 값 확인
        valid_statuses = ['PENDING', 'ASSIGNED', 'CONFIRMED', 'COMPLETED', 'REJECTED']
        if status not in valid_statuses:
            return error_response(400, 'INVALID_STATUS', f'Valid statuses: {", ".join(valid_statuses)}')

        # 상태별 신청 조회
        requests = get_requests_by_status(status)

        response_data = {
            'status': status,
            'count': len(requests),
            'requests': requests
        }

        return success_response(200, response_data, f'Requests with status {status} retrieved successfully')

    except Exception as e:
        print(f"Get requests by status error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
