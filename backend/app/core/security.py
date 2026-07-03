from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import secrets
import base64

from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire, "type": "access", **(extra or {})}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": subject, "exp": expire, "type": "refresh", "jti": secrets.token_hex(16)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    try:
        payload = decode_token(token)
        if payload.get("type") != token_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None


def _get_aes_key() -> bytes:
    key = settings.ENCRYPTION_KEY.encode()
    # Ensure exactly 32 bytes for AES-256
    return key[:32].ljust(32, b"\x00")


def encrypt_content(plaintext: str) -> str:
    """AES-256-GCM encrypt. Returns base64(nonce + ciphertext)."""
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt_content(encrypted: str) -> str:
    """Decrypt AES-256-GCM content."""
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    data = base64.b64decode(encrypted)
    nonce, ct = data[:12], data[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
