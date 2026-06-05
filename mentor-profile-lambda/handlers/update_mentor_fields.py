import json
from utils.db import get_mentor, update_mentor_fields
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response
from utils.validators import validate_mentor_fields

def handle_update_mentor_fields(event: dict) -> dict:
    """멘토 전공 분야 수정 핸들러"""
    try:
        # 인증 확인 - 멘토 본인만 수정 가능
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        # 경로에서 mentor_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        # 본인 확인
        if user_id != mentor_id:
            return error_response(403, 'FORBIDDEN', 'You can only update your own profile')

        body = json.loads(event.get('body', '{}'))

        mentor_fields = body.get('mentor_fields', [])

        if not isinstance(mentor_fields, list):
            return error_response(400, 'INVALID_FIELDS', 'mentor_fields must be a list')

        # 전공 분야 검증
        valid, msg = validate_mentor_fields(mentor_fields)
        if not valid:
            return error_response(400, 'INVALID_FIELDS', msg)

        # 멘토 존재 확인
        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found or user is not a mentor')

        # 멘토 전공 분야 수정
        updated_mentor = update_mentor_fields(mentor_id, mentor_fields)

        # 민감한 정보 제거
        updated_mentor.pop('password_hash', None)

        # mentor 필드만 반환
        mentor_data = {
            'user_id': updated_mentor.get('user_id'),
            'nickname': updated_mentor.get('nickname'),
            'role': updated_mentor.get('role'),
            'mentor_fields': updated_mentor.get('mentor_fields', []),
            'available_times': updated_mentor.get('available_times', {}),
            'intro': updated_mentor.get('intro', ''),
            'created_at': updated_mentor.get('created_at'),
            'updated_at': updated_mentor.get('updated_at')
        }

        return success_response(200, mentor_data, 'Mentor fields updated successfully')

    except Exception as e:
        print(f"Update mentor fields error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')