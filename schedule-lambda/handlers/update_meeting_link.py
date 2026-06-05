import json
from utils.db import get_request_by_id, update_meeting_link
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response

def handle_update_meeting_link(event: dict) -> dict:
    """PATCH /requests/{request_id}/schedule/link - 화상 링크 등록/수정"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role = get_role_from_token(auth_header)

        if not user_id or role not in ['admin', 'mentor']:
            return error_response(403, 'FORBIDDEN', 'Only ADMIN or MENTOR can set meeting link')

        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        body = json.loads(event.get('body', '{}'))
        meeting_link = body.get('meeting_link', '').strip()

        if not meeting_link:
            return error_response(400, 'MISSING_LINK', 'meeting_link is required')

        # URL 기본 검증
        if not (meeting_link.startswith('http://') or meeting_link.startswith('https://')):
            return error_response(400, 'INVALID_LINK', 'meeting_link must be a valid URL starting with http:// or https://')

        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        # CONFIRMED 상태에서만 링크 등록 가능
        status = request_item.get('status')
        if status != 'CONFIRMED':
            return error_response(400, 'INVALID_STATUS', f'Meeting link can only be set for CONFIRMED requests, but status is {status}')

        # 멘토인 경우 본인 요청인지 확인
        if role == 'mentor':
            mentor_user_id = request_item.get('mentor_user_id')
            if user_id != mentor_user_id:
                return error_response(403, 'FORBIDDEN', 'You are not the assigned mentor for this request')

        # schedule이 없으면 링크 등록 불가
        if not request_item.get('schedule'):
            return error_response(400, 'SCHEDULE_NOT_SET', 'Schedule must be set before adding a meeting link')

        updated = update_meeting_link(request_id, meeting_link)

        return success_response(200, {
            'request_id': updated.get('request_id'),
            'schedule': updated.get('schedule'),
        }, 'Meeting link updated successfully')

    except Exception as e:
        print(f"Update meeting link error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
