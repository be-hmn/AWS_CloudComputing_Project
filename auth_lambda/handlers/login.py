import json
from models.user import User
from utils.password_utils import verify_password
from utils.jwt_utils import create_access_token
from utils.response import success_response, error_response

def handle_login(event: dict) -> dict:
    """로그인 핸들러"""
    try:
        body = json.loads(event.get('body', '{}'))

        # 필수 필드
        nickname = body.get('nickname', '').strip()
        password = body.get('password', '').strip()

        if not nickname or not password:
            return error_response(400, 'MISSING_FIELDS', 'nickname and password are required')

        # 닉네임으로 사용자 조회
        user = User.get_user_by_nickname(nickname)
        if not user:
            return error_response(401, 'INVALID_CREDENTIALS', 'Invalid nickname or password')

        # 비밀번호 검증
        if not verify_password(password, user['password_hash']):
            return error_response(401, 'INVALID_CREDENTIALS', 'Invalid nickname or password')

        # JWT 토큰 생성
        access_token = create_access_token(user['user_id'], user['nickname'], user['role'])

        # 응답 데이터
        response_data = {
            'access_token': access_token,
            'user': {
                'user_id': user['user_id'],
                'nickname': user['nickname'],
                'role': user['role']
            }
        }

        return success_response(200, response_data, 'Login successful')

    except Exception as e:
        print(f"Login error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')