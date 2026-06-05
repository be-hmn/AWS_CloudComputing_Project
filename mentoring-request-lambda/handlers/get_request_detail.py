from utils.db import get_request_by_id
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_get_request_detail(event: dict) -> dict:
    """GET /requests/{request_id} - 상담 신청 상세 조회"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 신청자 본인, 배정된 멘토, ADMIN만 조회 가능
        mentee_user_id = request_item.get('mentee_user_id')
        mentor_user_id = request_item.get('mentor_user_id')

        is_owner          = user_id == mentee_user_id
        is_assigned_mentor = user_id == mentor_user_id and mentor_user_id is not None
        is_admin          = role == 'admin'

        if not (is_owner or is_assigned_mentor or is_admin):
            return error_response(403, 'FORBIDDEN', 'You do not have permission to access this request')

        return success_response(200, request_item, 'Request retrieved successfully')

    except Exception as e:
        print(f"Get request detail error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')