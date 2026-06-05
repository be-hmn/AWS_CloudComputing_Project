from utils.db import get_request_by_id, cancel_request
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response

def handle_cancel_request(event: dict) -> dict:
    """PATCH /requests/{request_id}/cancel - 상담 신청 취소 (PENDING → CANCELED)"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 신청자 본인만 취소 가능
        mentee_user_id = request_item.get('mentee_user_id')
        if user_id != mentee_user_id:
            return error_response(403, 'FORBIDDEN', 'Only the requester can cancel this request')

        # PENDING 상태에서만 취소 가능
        status = request_item.get('status')
        if status != 'PENDING':
            return error_response(400, 'INVALID_STATUS', f'Only PENDING requests can be canceled, but status is {status}')

        updated_request = cancel_request(request_id)

        response_data = {
            'request_id': updated_request.get('request_id'),
            'status': updated_request.get('status'),
        }

        return success_response(200, response_data, 'Request canceled successfully')

    except Exception as e:
        print(f"Cancel request error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
