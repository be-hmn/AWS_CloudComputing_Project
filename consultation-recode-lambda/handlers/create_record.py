import json
from utils.db import get_request_by_id, create_record
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response
from utils.validators import validate_create_record_input

def handle_create_record(event: dict) -> dict:
    """POST /records - 상담 기록 작성"""
    try:
        # MENTOR 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id or role != 'mentor':
            return error_response(403, 'FORBIDDEN', 'Only MENTOR can create records')

        body = json.loads(event.get('body', '{}'))

        request_id = body.get('request_id', '').strip()
        summary = body.get('summary', '').strip()
        follow_up_task = body.get('follow_up_task', '').strip()
        needs_next_consultation = body.get('needs_next_consultation')

        # 필수 필드 확인
        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        # 입력값 검증
        valid, msg = validate_create_record_input(summary, follow_up_task, needs_next_consultation)
        if not valid:
            return error_response(400, 'INVALID_INPUT', msg)

        # 1. request_id로 MentoringRequests 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 2. JWT의 user_id와 mentor_user_id가 일치하는지 확인
        mentor_user_id = request_item.get('mentor_user_id')
        if user_id != mentor_user_id:
            return error_response(403, 'FORBIDDEN', 'You are not the assigned mentor for this request')

        # 3. status가 COMPLETED인지 확인 (상담완료 상태에서만 기록 작성 가능)
        status = request_item.get('status')
        if status != 'COMPLETED':
            return error_response(400, 'INVALID_STATUS', f'Request status must be COMPLETED, but is {status}')

        # 4-5. record 저장 및 status를 COMPLETED로 변경
        updated_request = create_record(
            request_id=request_id,
            summary=summary,
            follow_up_task=follow_up_task,
            needs_next_consultation=needs_next_consultation
        )

        response_data = {
            'request_id': updated_request.get('request_id'),
            'status': updated_request.get('status'),
            'record': updated_request.get('record')
        }

        return success_response(200, response_data, 'Record created successfully')

    except Exception as e:
        print(f"Create record error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')