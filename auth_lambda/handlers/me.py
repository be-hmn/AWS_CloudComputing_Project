import json
from models.user import User
from utils.jwt_utils import extract_token_from_header, verify_token
from utils.response import success_response, error_response

def handle_me(event: dict) -> dict:
    """현재 사용자 정보 조회 핸들러"""
    try:
        # Authorization 헤더에서 토큰 추출
        auth_header = event.get('headers', {}).get('Authorization', '')

        if not auth_header:
            return error_response(401, 'MISSING_TOKEN', 'Missing authorization header')

        try:
            token = extract_token_from_header(auth_header)
        except Exception as e:
            return error_response(401, 'INVALID_HEADER', str(e))

        # 토큰 검증
        try:
            payload = verify_token(token)
        except Exception as e:
            return error_response(401, 'INVALID_TOKEN', str(e))

        user_id = payload.get('user_id')

        # 사용자 조회
        user = User.get_user_by_id(user_id)
        if not user:
            return error_response(404, 'USER_NOT_FOUND', 'User not found')

        # 민감한 정보 제거
        user.pop('password_hash', None)

        return success_response(200, user, 'User info retrieved successfully')

    except Exception as e:
        print(f"Me error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')