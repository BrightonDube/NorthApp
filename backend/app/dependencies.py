from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import httpx
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, InvalidKeyError
import logging

from app.config import get_settings, Settings

security = HTTPBearer()
logger = logging.getLogger(__name__)


class AuthUser(BaseModel):
    id: str
    email: str | None = None
    role: str | None = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    token = credentials.credentials

    # NEW: JWKS-based JWT verification with ES256
    # Supabase has migrated from HS256 (symmetric) to ES256 (asymmetric) signing
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    
    try:
        # Fetch public keys from JWKS endpoint
        jwks_client = PyJWKClient(jwks_url)
        
        # Get the signing key from the JWT header (kid)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Verify the token using ES256 algorithm
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],  # ECDSA with SHA-256 (NIST P-256 curve)
            audience="authenticated",  # Validate audience
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
            }
        )
        
        # Extract user information from payload
        user_id = payload.get("sub")
        if not user_id:
            logger.error("JWT Verification Failed: Missing 'sub' claim in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"JWT verified successfully for user: {user_id}")
        
        return AuthUser(
            id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
        )
        
    except InvalidKeyError as e:
        logger.error(f"JWT Verification Failed: Invalid Key - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT Verification Failed: Invalid signing key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except jwt.ExpiredSignatureError:
        logger.error("JWT Verification Failed: Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except jwt.InvalidAudienceError:
        logger.error("JWT Verification Failed: Invalid audience")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT Verification Failed: Invalid audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except InvalidTokenError as e:
        logger.error(f"JWT Verification Failed: Algorithm Mismatch or Invalid Token - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT Verification Failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except Exception as e:
        logger.error(f"JWT Verification Failed: Unexpected error - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_fallback(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    """
    Fallback method: Validate token via Supabase Auth API
    This works with both legacy JWT keys and new publishable keys
    Use this if JWKS verification fails
    """
    token = credentials.credentials

    auth_url = f"{settings.supabase_url}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                auth_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_key,
                },
            )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth service unreachable: {str(e)}",
        )

    if resp.status_code == 401 or resp.status_code == 403:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    data = resp.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )

    return AuthUser(
        id=user_id,
        email=data.get("email"),
        role=data.get("role"),
    )
