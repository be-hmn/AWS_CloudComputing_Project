"""
GET /mentors/{mentor_id}/verifications       - 멘토 본인 증빙 목록 조회
GET /admin/verifications                     - 운영자 전체 pending 증빙 조회 (admin-lambda에서 위임)
"""
import json
from utils.db import get_mentor, get_all_pending_verifications
from utils.s3_verification import generate_download_presigned_url
from utils.auth import get_user_id_from_token, get_role_from_token
from utils.response import success_response, error_response


def handle_get_mentor_verifications(event: dict) -> dict:
    """GET /mentors/{mentor_id}/verifications — 멘토 본인 증빙 목록"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        role    = get_role_from_token(auth_header)
        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()

        # 본인 또는 admin만 조회 가능
        if role != 'admin' and user_id != mentor_id:
            return error_response(403, 'FORBIDDEN', 'Access denied')

        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found')

        verifications  = mentor.get('field_verifications', [])
        verified_fields = mentor.get('verified_fields', [])

        # pending/approved 항목에 열람 URL 추가
        enriched = []
        for v in verifications:
            item = dict(v)
            if v.get('file_key'):
                try:
                    item['view_url'] = generate_download_presigned_url(v['file_key'])
                except Exception:
                    item['view_url'] = None
            enriched.append(item)

        return success_response(200, {
            'mentor_id':      mentor_id,
            'verified_fields': verified_fields,
            'verifications':  enriched,
        }, 'Verifications retrieved')

    except Exception as e:
        print(f"Get mentor verifications error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')


def handle_get_all_pending_verifications(event: dict) -> dict:
    """GET /admin/verifications — 운영자 전체 pending 증빙 목록"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        role = get_role_from_token(auth_header)
        if role != 'admin':
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        pending_list = get_all_pending_verifications()

        # 각 증빙에 열람 URL 추가
        for mentor_entry in pending_list:
            for v in mentor_entry.get('pending_verifications', []):
                if v.get('file_key'):
                    try:
                        v['view_url'] = generate_download_presigned_url(v['file_key'])
                    except Exception:
                        v['view_url'] = None

        return success_response(200, {
            'count':   len(pending_list),
            'pending': pending_list,
        }, 'Pending verifications retrieved')

    except Exception as e:
        print(f"Get all pending verifications error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
