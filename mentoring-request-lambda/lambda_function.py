import json
from handlers.create_request import handle_create_request
from handlers.get_requests import handle_get_requests
from handlers.get_request_detail import handle_get_request_detail
from handlers.cancel_request import handle_cancel_request
from handlers.complete_request import handle_complete_request

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
        # POST /requests
        if path == '/requests' and http_method == 'POST':
            return handle_create_request(event)

        # GET /requests
        elif path == '/requests' and http_method == 'GET':
            return handle_get_requests(event)

        # PATCH /requests/{request_id}/cancel
        elif path and path.endswith('/cancel') and http_method == 'PATCH':
            return handle_cancel_request(event)

        # PATCH /requests/{request_id}/complete
        elif path and path.endswith('/complete') and http_method == 'PATCH':
            return handle_complete_request(event)

        # GET /requests/{request_id}
        elif path and path.startswith('/requests/') and http_method == 'GET':
            return handle_get_request_detail(event)

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
