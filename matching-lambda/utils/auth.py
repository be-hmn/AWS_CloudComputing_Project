import os
import jwt
from typing import Dict, Any, Optional

JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET environment variable is not set')
JWT_ALGORITHM = 'HS256'

def verify_and_extract_token(authorization_header: str) -> Optional[Dict[str, Any]]:
    """Authorization 헤더에서 토큰 검증 및 추출"""
    try:
        if not authorization_header:
            return None

        parts = authorization_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

def get_role_from_token(authorization_header: str) -> Optional[str]:
    """토큰에서 role 추출"""
    payload = verify_and_extract_token(authorization_header)
    if payload:
        return payload.get('role')
    return None

def is_admin(authorization_header: str) -> bool:
    """ADMIN 권한 확인"""
    role = get_role_from_token(authorization_header)
    return role == 'admin'