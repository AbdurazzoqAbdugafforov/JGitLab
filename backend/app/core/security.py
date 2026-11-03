import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from app.core.config import settings

# Argon2 password context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Ensure encryption key is valid 32-byte urlsafe base64 for Fernet
def get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key or len(key) < 32:
        # Generate deterministic 32-byte key from SECRET_KEY
        raw = (settings.SECRET_KEY.ljust(32, "0"))[:32].encode("utf-8")
        key = base64.urlsafe_b64encode(raw).decode("utf-8")
    elif len(key) == 32:
        key = base64.urlsafe_b64encode(key.encode("utf-8")).decode("utf-8")
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    claims: Optional[dict] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    if claims:
        to_encode.update(claims)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def encrypt_secret(secret_text: str) -> str:
    """Encrypt sensitive string (API Key, OAuth Token) using Fernet"""
    if not secret_text:
        return ""
    f = get_fernet()
    return f.encrypt(secret_text.encode("utf-8")).decode("utf-8")

def decrypt_secret(encrypted_text: str) -> str:
    """Decrypt sensitive string using Fernet"""
    if not encrypted_text:
        return ""
    try:
        f = get_fernet()
        return f.decrypt(encrypted_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""

def mask_secret(secret_text: str) -> str:
    """Mask secret for safe display in UI/API responses, e.g. sk-12...98ab"""
    if not secret_text:
        return ""
    length = len(secret_text)
    if length <= 8:
        return "****"
    prefix_len = min(6, length // 4)
    suffix_len = min(4, length // 4)
    return f"{secret_text[:prefix_len]}...{secret_text[-suffix_len:]}"
