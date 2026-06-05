import json
from utils.db import get_mentor
from utils.response import success_response, error_response

def handle_get_mentor(event: dict) -> dict:
    """멘토 정보 조회 핸들러"""
    try:
        # 경로에서 mentor_id 추출 (API Gateway pathParameters)
        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        # 멘토 조회
        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found or user is not a mentor')

        # 민감한 정보 제거
        mentor.pop('password_hash', None)

        # mentor 필드만 반환 (verified_fields, field_verifications 포함)
        mentor_data = {
            'user_id':             mentor.get('user_id'),
            'nickname':            mentor.get('nickname'),
            'role':                mentor.get('role'),
            'mentor_fields':       mentor.get('mentor_fields', []),
            'available_times':     mentor.get('available_times', {}),
            'intro':               mentor.get('intro', ''),
            'mentor_active':       mentor.get('mentor_active', False),
            'verified_fields':     mentor.get('verified_fields', []),
            'field_verifications': mentor.get('field_verifications', []),
            'created_at':          mentor.get('created_at'),
            'updated_at':          mentor.get('updated_at'),
        }

        return success_response(200, mentor_data, 'Mentor retrieved successfully')

    except Exception as e:
        print(f"Get mentor error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')