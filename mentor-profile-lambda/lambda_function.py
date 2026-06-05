import json
from handlers.get_mentor import handle_get_mentor
from handlers.update_mentor import handle_update_mentor
from handlers.update_mentor_fields import handle_update_mentor_fields
from handlers.update_mentor_times import handle_update_mentor_times
from handlers.get_mentor_requests import handle_get_mentor_requests
from handlers.update_mentor_active import handle_update_mentor_active
from handlers.request_verification import handle_request_verification
from handlers.get_verifications import (
    handle_get_mentor_verifications,
    handle_get_all_pending_verifications,
)
from handlers.review_verification import handle_review_verification


def normalize_event(event: dict) -> tuple[str, str]:
    request_context = event.get('requestContext', {})
    http_context    = request_context.get('http', {})
    http_method     = http_context.get('method')
    path            = event.get('rawPath')

    headers = event.setdefault('headers', {})
    if 'Authorization' not in headers and headers.get('authorization'):
        headers['Authorization'] = headers['authorization']

    return http_method, path


def lambda_handler(event, context):
    http_method, path = normalize_event(event)
    print(f"Method: {http_method}, Path: {path}")

    try:
        # ── 운영자 증빙 관련 ──────────────────────────────
        # GET  /admin/verifications
        if path == '/admin/verifications' and http_method == 'GET':
            return handle_get_all_pending_verifications(event)

        # PATCH /admin/verifications/{mentor_id}
        elif path and path.startswith('/admin/verifications/') and http_method == 'PATCH':
            return handle_review_verification(event)

        # ── 멘토 증빙 관련 ────────────────────────────────
        # POST /mentors/{mentor_id}/verifications
        elif path and path.endswith('/verifications') and http_method == 'POST':
            return handle_request_verification(event)

        # GET /mentors/{mentor_id}/verifications
        elif path and path.endswith('/verifications') and http_method == 'GET':
            return handle_get_mentor_verifications(event)

        # ── 기존 라우트 ───────────────────────────────────
        # GET /mentors/{mentor_id}/requests
        elif path and path.endswith('/requests') and http_method == 'GET':
            return handle_get_mentor_requests(event)

        # PATCH /mentors/{mentor_id}/active
        elif path and path.endswith('/active') and http_method == 'PATCH':
            return handle_update_mentor_active(event)

        # PUT /mentors/{mentor_id}/fields
        elif path and path.endswith('/fields') and http_method == 'PUT':
            return handle_update_mentor_fields(event)

        # PUT /mentors/{mentor_id}/times
        elif path and path.endswith('/times') and http_method == 'PUT':
            return handle_update_mentor_times(event)

        # GET /mentors/{mentor_id}
        elif path and path.startswith('/mentors/') and http_method == 'GET':
            return handle_get_mentor(event)

        # PUT /mentors/{mentor_id}
        elif path and path.startswith('/mentors/') and http_method == 'PUT':
            return handle_update_mentor(event)

        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'statusCode': 404, 'error': 'NOT_FOUND', 'message': 'Endpoint not found'}, ensure_ascii=False),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            }

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'statusCode': 500, 'error': 'INTERNAL_ERROR', 'message': 'Internal server error'}, ensure_ascii=False),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        }
