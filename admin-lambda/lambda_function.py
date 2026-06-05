import json
from handlers.get_requests_by_status import handle_get_requests_by_status
from handlers.get_mentor_stats import handle_get_mentor_stats
from handlers.get_mentee_requests import handle_get_mentee_requests
from handlers.get_all_mentors import handle_get_all_mentors

def normalize_event(event: dict) -> tuple[str, str]:
    """Normalize an HTTP API payload v2 event for existing handlers."""
    request_context = event.get('requestContext', {})
    http_context = request_context.get('http', {})
    http_method = http_context.get('method')
    path = event.get('rawPath')

    headers = event.setdefault('headers', {})
    if 'Authorization' not in headers and headers.get('authorization'):
        headers['Authorization'] = headers['authorization']

    return http_method, path

def lambda_handler(event, context):
    """API Gateway에서 호출되는 메인 핸들러"""

    http_method, path = normalize_event(event)

    print(f"Method: {http_method}, Path: {path}")

    try:
        # GET /admin/requests
        if path == '/admin/requests' and http_method == 'GET':
            return handle_get_requests_by_status(event)

        # GET /admin/mentors  (전체 멘토 목록 - stats보다 먼저 체크)
        elif path == '/admin/mentors' and http_method == 'GET':
            return handle_get_all_mentors(event)

        # GET /admin/mentors/{mentor_id}/stats
        elif path and path.startswith('/admin/mentors/') and path.endswith('/stats') and http_method == 'GET':
            return handle_get_mentor_stats(event)

        # GET /admin/mentees/{mentee_id}/requests
        elif path and path.startswith('/admin/mentees/') and path.endswith('/requests') and http_method == 'GET':
            return handle_get_mentee_requests(event)

        # 정의되지 않은 경로
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'statusCode': 404, 'error': 'NOT_FOUND', 'message': 'Endpoint not found'}, ensure_ascii=False),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            }

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'statusCode': 500, 'error': 'INTERNAL_ERROR', 'message': 'Internal server error'}, ensure_ascii=False),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
        }
