"""
PATCH /admin/verifications/{mentor_id}
운영자가 증빙을 승인(approve) 또는 거절(reject).
"""
import json
from utils.db import approve_field_verification, reject_field_verification
from utils.auth import get_role_from_token
from utils.response import success_response, error_response


def handle_review_verification(event: dict) -> dict:
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        role = get_role_from_token(auth_header)
        if role != 'admin':
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can review verifications')

        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()
        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        body   = json.loads(event.get('body', '{}'))
        action = body.get('action', '').strip()   # 'approve' | 'reject'
        field  = body.get('field', '').strip()
        reject_reason = body.get('reject_reason', '').strip()

        if not field:
            return error_response(400, 'MISSING_FIELD', 'field is required')
        if action not in ('approve', 'reject'):
            return error_response(400, 'INVALID_ACTION', 'action must be "approve" or "reject"')
        if action == 'reject' and not reject_reason:
            return error_response(400, 'MISSING_REASON', 'reject_reason is required for rejection')

        if action == 'approve':
            updated = approve_field_verification(mentor_id, field)
            msg = f'Field "{field}" has been verified.'
        else:
            updated = reject_field_verification(mentor_id, field, reject_reason)
            msg = f'Field "{field}" verification rejected.'

        return success_response(200, {
            'mentor_id':       mentor_id,
            'field':           field,
            'action':          action,
            'verified_fields': updated.get('verified_fields', []),
        }, msg)

    except ValueError as e:
        return error_response(404, 'NOT_FOUND', str(e))
    except Exception as e:
        print(f"Review verification error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
