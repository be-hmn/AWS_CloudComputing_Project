import bcrypt

def hash_password(password: str) -> str:
    """비밀번호를 bcrypt로 해싱"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """입력된 비밀번호와 해시된 비밀번호 비교"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))