import json
from models.user import User
from utils.password_utils import hash_password
from utils.response import success_response, error_response
from utils.validators import validate_nickname, validate_password, validate_availability_times

def handle_signup(event: dict) -> dict:
    """회원가입 핸들러"""
    try:
        body = json.loads(event.get('body', '{}'))

        # 필수 필드
        nickname = body.get('nickname', '').strip()
        password = body.get('password', '').strip()
        role = body.get('role', '').strip()

        # 입력값 검증
        if not nickname or not password or not role:
            return error_response(400, 'MISSING_FIELDS', 'nickname, password, role are required')

        if role not in ['mentor', 'mentee']:
            return error_response(400, 'INVALID_ROLE', 'role must be "mentor" or "mentee"')

        # 닉네임 검증
        valid, msg = validate_nickname(nickname)
        if not valid:
            return error_response(400, 'INVALID_NICKNAME', msg)

        # 비밀번호 검증
        valid, msg = validate_password(password)
        if not valid:
            return error_response(400, 'INVALID_PASSWORD', msg)

        # 닉네임 중복 확인
        if User.nickname_exists(nickname):
            return error_response(409, 'NICKNAME_EXISTS', 'Nickname already exists')

        # mentor 추가 필드
        mentor_fields = None
        available_times = None
        intro = None

        if role == 'mentor':
            mentor_fields = body.get('mentor_fields', [])
            available_times = body.get('available_times', {})
            intro = body.get('intro', '').strip()

            if not mentor_fields:
                return error_response(400, 'MISSING_FIELDS', 'mentor_fields is required for mentor')

        # mentee 추가 필드
        major = None
        interest_fields = None

        if role == 'mentee':
            major = body.get('major', '').strip()
            interest_fields = body.get('interest_fields', [])

            if not major:
                return error_response(400, 'MISSING_FIELDS', 'major is required for mentee')

        # 비밀번호 해싱
        password_hash = hash_password(password)

        # 사용자 생성
        user = User.create_user(
            nickname=nickname,
            password_hash=password_hash,
            role=role,
            mentor_fields=mentor_fields,
            available_times=available_times,
            intro=intro,
            major=major,
            interest_fields=interest_fields
        )

        # 민감한 정보 제거
        user.pop('password_hash', None)

        return success_response(201, user, 'User created successfully')

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')