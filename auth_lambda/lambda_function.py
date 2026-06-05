import json
from handlers.signup import handle_signup
from handlers.login import handle_login
from handlers.me import handle_me

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
        # 회원가입
        if path == '/auth/signup' and http_method == 'POST':
            return handle_signup(event)

        # 로그인
        elif path == '/auth/login' and http_method == 'POST':
            return handle_login(event)

        # 사용자 정보 조회
        elif path == '/auth/me' and http_method == 'GET':
            return handle_me(event)

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
