import json
from handlers.assign_mentor import handle_assign_mentor
from handlers.approve_assignment import handle_approve_assignment
from handlers.reject_assignment import handle_reject_assignment

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
        # POST /assignments
        if path == '/assignments' and http_method == 'POST':
            return handle_assign_mentor(event)

        # POST /assignments/{request_id}/approve
        elif path and path.endswith('/approve') and http_method == 'POST':
            return handle_approve_assignment(event)

        # POST /assignments/{request_id}/reject
        elif path and path.endswith('/reject') and http_method == 'POST':
            return handle_reject_assignment(event)

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
