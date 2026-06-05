import json
from utils.db import get_mentor, update_mentor_active
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response

def handle_update_mentor_active(event: dict) -> dict:
    """PATCH /mentors/{mentor_id}/active - 멘토 활성화 상태 변경"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        # 본인만 변경 가능
        if user_id != mentor_id:
            return error_response(403, 'FORBIDDEN', 'You can only update your own status')

        body = json.loads(event.get('body', '{}'))
        active = body.get('mentor_active')

        if not isinstance(active, bool):
            return error_response(400, 'INVALID_INPUT', 'mentor_active must be a boolean')

        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found')

        updated = update_mentor_active(mentor_id, active)
        updated.pop('password_hash', None)

        return success_response(200, {
            'user_id': updated.get('user_id'),
            'mentor_active': updated.get('mentor_active'),
        }, f"멘토 상태가 {'활성' if active else '비활성'}으로 변경됐습니다.")

    except Exception as e:
        print(f"Update mentor active error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
