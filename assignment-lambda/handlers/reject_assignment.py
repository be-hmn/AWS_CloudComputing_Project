import json
from utils.db import get_request_by_id, reject_assignment
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response
from utils.validators import validate_reject_reason

def handle_reject_assignment(event: dict) -> dict:
    """POST /assignments/{request_id}/reject - 배정 거절"""
    try:
        # MENTOR 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        # 경로에서 request_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        body = json.loads(event.get('body', '{}'))
        reject_reason = body.get('reject_reason', '').strip()

        # 입력값 검증
        valid, msg = validate_reject_reason(reject_reason)
        if not valid:
            return error_response(400, 'INVALID_INPUT', msg)

        # 1. request_id 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 2. JWT의 user_id와 mentor_user_id가 같은지 확인
        mentor_user_id = request_item.get('mentor_user_id')
        if user_id != mentor_user_id:
            return error_response(403, 'FORBIDDEN', 'You are not the assigned mentor for this request')

        # 3. status가 ASSIGNED인지 확인
        status = request_item.get('status')
        if status != 'ASSIGNED':
            return error_response(400, 'INVALID_STATUS', f'Request status must be ASSIGNED, but is {status}')

        # PENDING 상태로 복귀, mentor_user_id 제거, 반려 기록 저장
        updated_request = reject_assignment(request_id, reject_reason)

        response_data = {
            'request_id': updated_request.get('request_id'),
            'status': updated_request.get('status'),
            'record': updated_request.get('record')
        }

        return success_response(200, response_data, 'Assignment rejected successfully')

    except Exception as e:
        print(f"Reject assignment error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')