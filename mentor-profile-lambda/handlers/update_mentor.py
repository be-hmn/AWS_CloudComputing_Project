import json
from utils.db import get_mentor, update_mentor_info
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response

def handle_update_mentor(event: dict) -> dict:
    """멘토 기본 정보 수정 핸들러 (intro)"""
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

        # 업데이트할 필드
        intro = body.get('intro', '').strip()

        if 'intro' not in body:
            return error_response(400, 'MISSING_FIELDS', 'intro is required')

        if len(intro) > 500:
            return error_response(400, 'INVALID_INTRO', 'intro must be less than 500 characters')

        # 멘토 존재 확인
        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found or user is not a mentor')

        # 멘토 정보 수정
        updates = {'intro': intro}
        updated_mentor = update_mentor_info(mentor_id, updates)

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

        return success_response(200, mentor_data, 'Mentor updated successfully')

    except Exception as e:
        print(f"Update mentor error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')