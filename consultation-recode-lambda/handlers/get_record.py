from utils.db import get_request_by_id
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_get_record(event: dict) -> dict:
    """GET /records/{request_id} - 상담 기록 조회"""
    try:
        # 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        # 경로에서 request_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        # 1. request_id 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 2. 접근 권한 확인
        mentee_user_id = request_item.get('mentee_user_id')
        mentor_user_id = request_item.get('mentor_user_id')

        is_mentee = user_id == mentee_user_id
        is_mentor = user_id == mentor_user_id
        is_admin = role == 'admin'

        if not (is_mentee or is_mentor or is_admin):
            return error_response(403, 'FORBIDDEN', 'You do not have permission to access this record')

        # 3. record 반환
        record = request_item.get('record')

        if not record:
            return error_response(404, 'RECORD_NOT_FOUND', 'Record not found for this request')

        response_data = {
            'request_id': request_item.get('request_id'),
            'status': request_item.get('status'),
            'record': record
        }

        return success_response(200, response_data, 'Record retrieved successfully')

    except Exception as e:
        print(f"Get record error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')