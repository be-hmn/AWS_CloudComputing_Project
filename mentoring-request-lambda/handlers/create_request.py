import json
from utils.db import create_request
from utils.auth import get_user_id_from_token
from utils.response import success_response, error_response
from utils.validators import validate_create_request

def handle_create_request(event: dict) -> dict:
    """POST /requests - 상담 신청 생성"""
    try:
        # JWT 토큰에서 mentee_user_id 추출
        auth_header = event.get('headers', {}).get('Authorization', '')
        mentee_user_id = get_user_id_from_token(auth_header)

        if not mentee_user_id:
            return error_response(401, 'UNAUTHORIZED', 'Invalid or missing token')

        body = json.loads(event.get('body', '{}'))

        # 입력값
        interest_field = body.get('interest_field', '').strip()
        topic = body.get('topic', '').strip()
        message = body.get('message', '').strip()
        preferred_date = body.get('preferred_date', '').strip()   # 선택: YYYY-MM-DD
        preferred_time = body.get('preferred_time', '').strip()   # 선택: HH:MM (시작 시간)

        # 검증
        valid, msg = validate_create_request(interest_field, topic, message)
        if not valid:
            return error_response(400, 'INVALID_INPUT', msg)

        # 상담 신청 생성
        request_item = create_request(
            mentee_user_id=mentee_user_id,
            interest_field=interest_field,
            topic=topic,
            message=message,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
        )

        return success_response(201, request_item, 'Request created successfully')

    except Exception as e:
        print(f"Create request error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')