import jwt
import os
from datetime import datetime, timedelta
from typing import Dict, Any

JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET environment variable is not set')

JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_HOURS = 1

def create_access_token(user_id: str, nickname: str, role: str) -> str:
    """액세스 토큰 생성"""
    payload = {
        'user_id': user_id,
        'nickname': nickname,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def verify_token(token: str) -> Dict[str, Any]:
    """토큰 검증 및 페이로드 추출"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")

def extract_token_from_header(authorization_header: str) -> str:
    """Authorization 헤더에서 토큰 추출"""
    if not authorization_header:
        raise Exception("Missing authorization header")

    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        raise Exception("Invalid authorization header format")

    return parts[1]