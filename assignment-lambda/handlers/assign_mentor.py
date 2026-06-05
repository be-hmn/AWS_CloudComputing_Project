import json
from utils.db import get_request_by_id, get_mentor_by_id, assign_mentor
from utils.auth import get_role_from_token
from utils.response import success_response, error_response
from utils.validators import validate_assign_mentor_input

def handle_assign_mentor(event: dict) -> dict:
    """POST /assignments - 멘토 배정"""
    try:
        # ADMIN 권한 확인
        auth_header = event.get('headers', {}).get('Authorization', '')
        role = get_role_from_token(auth_header)

        if role != 'admin':
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can assign mentors')

        body = json.loads(event.get('body', '{}'))

        request_id = body.get('request_id', '').strip()
        mentor_id = body.get('mentor_id', '').strip()

        # 입력값 검증
        valid, msg = validate_assign_mentor_input(request_id, mentor_id)
        if not valid:
            return error_response(400, 'INVALID_INPUT', msg)

        # 1. request_id로 상담 신청 조회
        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # 2. status가 PENDING인지 확인
        status = request_item.get('status')
        if status != 'PENDING':
            return error_response(400, 'INVALID_STATUS', f'Request status must be PENDING, but is {status}')

        # 3. mentor_id로 멘토 조회
        mentor = get_mentor_by_id(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found or user is not a mentor')

        # 5. MentoringRequests 업데이트
        updated_request = assign_mentor(request_id, mentor_id)

        response_data = {
            'request_id': updated_request.get('request_id'),
            'mentor_user_id': updated_request.get('mentor_user_id'),
            'status': updated_request.get('status')
        }

        return success_response(200, response_data, 'Mentor assigned successfully')

    except Exception as e:
        print(f"Assign mentor error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')