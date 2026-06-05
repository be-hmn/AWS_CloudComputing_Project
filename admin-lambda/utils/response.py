import json
import decimal

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
}

class DecimalEncoder(json.JSONEncoder):
    """DynamoDB Decimal 타입을 int/float으로 변환"""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def _dumps(obj):
    return json.dumps(obj, ensure_ascii=False, cls=DecimalEncoder)

def success_response(status_code: int, body: dict = None, message: str = None):
    """성공 응답"""
    response_body = {
        'statusCode': status_code,
        'message': message or 'Success',
        'data': body
    }
    return {
        'statusCode': status_code,
        'body': _dumps(response_body),
        'headers': CORS_HEADERS
    }

def error_response(status_code: int, error_code: str, message: str):
    """에러 응답"""
    response_body = {
        'statusCode': status_code,
        'error': error_code,
        'message': message
    }
    return {
        'statusCode': status_code,
        'body': _dumps(response_body),
        'headers': CORS_HEADERS
    }
