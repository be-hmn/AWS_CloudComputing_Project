"""
POST /mentors/{mentor_id}/verifications
멘토가 전문 분야 증빙 파일 업로드용 Presigned URL을 요청.
"""
import json
from utils.db import get_mentor, add_field_verification
from utils.s3_verification import generate_upload_presigned_url
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response


def handle_request_verification(event: dict) -> dict:
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        user_id = get_user_id_from_token(auth_header)
        if not user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        path_parameters = event.get('pathParameters') or {}
        mentor_id = path_parameters.get('mentor_id', '').strip()
        if not mentor_id:
            return error_response(400, 'MISSING_MENTOR_ID', 'mentor_id is required')

        if user_id != mentor_id:
            return error_response(403, 'FORBIDDEN', 'You can only submit your own verification')

        body = json.loads(event.get('body', '{}'))
        field        = body.get('field', '').strip()
        filename     = body.get('filename', '').strip()
        content_type = body.get('content_type', 'application/octet-stream').strip()

        if not field:
            return error_response(400, 'MISSING_FIELD', 'field is required')
        if not filename:
            return error_response(400, 'MISSING_FILENAME', 'filename is required')

        mentor = get_mentor(mentor_id)
        if not mentor:
            return error_response(404, 'MENTOR_NOT_FOUND', 'Mentor not found')

        # field가 mentor_fields에 있는지 확인
        if field not in mentor.get('mentor_fields', []):
            return error_response(400, 'INVALID_FIELD',
                f'"{field}" is not in your mentor_fields. Add the field first.')

        # Presigned URL 생성 (ContentType 포함)
        result = generate_upload_presigned_url(mentor_id, field, filename, content_type)

        # DynamoDB에 pending 증빙 기록
        add_field_verification(mentor_id, field, result['file_key'])

        return success_response(200, {
            'upload_url': result['upload_url'],
            'file_key':   result['file_key'],
            'field':      field,
            'expires_in': 900,
        }, 'Presigned URL generated. Upload your file within 15 minutes.')

    except Exception as e:
        print(f"Request verification error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
