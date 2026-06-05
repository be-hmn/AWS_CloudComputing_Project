from utils.db import get_request_by_id, complete_request
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_complete_request(event: dict) -> dict:
    """PATCH /requests/{request_id}/complete - 상담 완료 처리 (CONFIRMED → COMPLETED)"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        # ADMIN 또는 배정된 MENTOR만 완료 처리 가능
        if role not in ['admin', 'mentor']:
            return error_response(403, 'FORBIDDEN', 'Only ADMIN or MENTOR can complete a request')

        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # MENTOR인 경우 본인에게 배정된 요청인지 확인
        if role == 'mentor':
            mentor_user_id = request_item.get('mentor_user_id')
            if user_id != mentor_user_id:
                return error_response(403, 'FORBIDDEN', 'You are not the assigned mentor for this request')

        # CONFIRMED 상태에서만 완료 처리 가능
        status = request_item.get('status')
        if status != 'CONFIRMED':
            return error_response(400, 'INVALID_STATUS', f'Request status must be CONFIRMED, but is {status}')

        updated_request = complete_request(request_id)

        response_data = {
            'request_id': updated_request.get('request_id'),
            'status': updated_request.get('status'),
        }

        return success_response(200, response_data, 'Request completed successfully')

    except Exception as e:
        print(f"Complete request error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
