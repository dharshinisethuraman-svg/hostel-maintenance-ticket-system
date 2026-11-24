import os
import warnings
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Environment Mode
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

MIN_PRODUCTION_SECRET_LENGTH = 32

# Known development fallback strings
_DEV_FALLBACK_JWT_SECRET = "hostel_ticket_system_super_secure_jwt_secret_key_2026_change_in_production"
_DEV_FALLBACK_ADMIN_KEY = "hostel-admin-secret-key-2026"
_KNOWN_INSECURE_SECRETS = {
    _DEV_FALLBACK_JWT_SECRET.lower(),
    _DEV_FALLBACK_ADMIN_KEY.lower(),
    "change_this_to_a_random_secure_secret_in_production",
    "change_this_admin_key_in_production",
    "your_jwt_secret_key_here",
    "your_admin_setup_key_here",
    "secret",
    "password",
    "admin",
}
_INSECURE_SUBSTRINGS = (
    "change_this",
    "changeme",
    "change_me",
    "placeholder",
    "example",
    "default",
)


def _validate_production_secret(name: str, value: str) -> None:
    """Validates that a secret meets production strength and complexity requirements."""
    if not value or len(value) < MIN_PRODUCTION_SECRET_LENGTH:
        raise RuntimeError(
            f"CRITICAL SECURITY CONFIGURATION ERROR: {name} must be explicitly configured "
            f"with at least {MIN_PRODUCTION_SECRET_LENGTH} characters in production mode. Refusing to start."
        )
    val_lower = value.lower()
    if val_lower in _KNOWN_INSECURE_SECRETS or any(sub in val_lower for sub in _INSECURE_SUBSTRINGS):
        raise RuntimeError(
            f"CRITICAL SECURITY CONFIGURATION ERROR: {name} is set to a known placeholder or insecure default value. "
            f"Please generate a secure, random secret in production mode. Refusing to start."
        )


_raw_jwt_key = (os.getenv("JWT_SECRET_KEY") or "").strip()
_raw_admin_key = (os.getenv("ADMIN_SETUP_KEY") or "").strip()

if ENVIRONMENT == "production":
    _validate_production_secret("JWT_SECRET_KEY", _raw_jwt_key)
    _validate_production_secret("ADMIN_SETUP_KEY", _raw_admin_key)
    SECRET_KEY = _raw_jwt_key
    ADMIN_SETUP_KEY = _raw_admin_key
else:
    # Development mode: allow convenient defaults with a warning if missing
    if not _raw_jwt_key:
        warnings.warn(
            "Security Notice: JWT_SECRET_KEY is not set in environment. Using development default. "
            "Do NOT use this in production!",
            UserWarning,
            stacklevel=2,
        )
        SECRET_KEY = _DEV_FALLBACK_JWT_SECRET
    else:
        SECRET_KEY = _raw_jwt_key

    if not _raw_admin_key:
        warnings.warn(
            "Security Notice: ADMIN_SETUP_KEY is not set in environment. Using development default. "
            "Do NOT use this in production!",
            UserWarning,
            stacklevel=2,
        )
        ADMIN_SETUP_KEY = _DEV_FALLBACK_ADMIN_KEY
    else:
        ADMIN_SETUP_KEY = _raw_admin_key

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Role Constants
ROLE_STUDENT = "student"
ROLE_ADMIN = "admin"
ROLE_STAFF = "staff"
VALID_ROLES = [ROLE_STUDENT, ROLE_ADMIN, ROLE_STAFF]


def hash_password(password: str) -> str:
    """Hashes a plain-text password using bcrypt with a salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JSON Web Token (JWT) with expiration time."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token. Returns None if invalid or expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
