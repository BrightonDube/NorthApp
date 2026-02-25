from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import httpx
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError
import logging

from app.config import get_settings, Settings

security = HTTPBearer()
logger = logging.getLogger(__name__)


class AuthUser(BaseModel):
    id: str
    email: str | None = None
    role: str | None = None


async def _verify_with_jwks(token: str, settings: Settings) -> AuthUser:
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"

    try:
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
            }
        )
        
        # Extract user information from payload
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthUser(
            id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWKS validation error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _verify_with_supabase_auth_api(token: str, settings: Settings) -> AuthUser:
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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    token = credentials.credentials
    try:
        return await _verify_with_jwks(token, settings)
    except HTTPException as jwks_error:
        logger.warning(
            "JWKS auth failed, trying Supabase user endpoint fallback: %s",
            jwks_error.detail,
        )
        try:
            return await _verify_with_supabase_auth_api(token, settings)
        except HTTPException:
            raise jwks_error
