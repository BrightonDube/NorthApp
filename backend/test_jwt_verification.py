"""
Test script to verify JWT token verification with ES256 algorithm
"""
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError
import sys

# Supabase configuration
SUPABASE_URL = "https://pigtshfobiwuwaionxpo.supabase.co"
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

def test_jwt_verification(token: str):
    """Test JWT verification with JWKS"""
    print("=" * 80)
    print("Testing JWT Verification with ES256")
    print("=" * 80)
    
    try:
        # Initialize JWKS client
        print(f"\n1. Fetching JWKS from: {JWKS_URL}")
        jwks_client = PyJWKClient(JWKS_URL)
        
        # Get signing key from JWT header
        print("\n2. Extracting signing key from JWT header...")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        print(f"   ✓ Found signing key with kid: {signing_key.key_id}")
        
        # Decode and verify token
        print("\n3. Verifying token with ES256 algorithm...")
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
            }
        )
        
        print("   ✓ Token verified successfully!")
        
        # Display payload
        print("\n4. Token Payload:")
        print(f"   - User ID (sub): {payload.get('sub')}")
        print(f"   - Email: {payload.get('email')}")
        print(f"   - Role: {payload.get('role')}")
        print(f"   - Audience (aud): {payload.get('aud')}")
        print(f"   - Issuer (iss): {payload.get('iss')}")
        print(f"   - Issued At (iat): {payload.get('iat')}")
        print(f"   - Expires At (exp): {payload.get('exp')}")
        
        print("\n" + "=" * 80)
        print("✓ JWT VERIFICATION SUCCESSFUL")
        print("=" * 80)
        return True
        
    except jwt.ExpiredSignatureError:
        print("\n✗ ERROR: Token has expired")
        return False
        
    except jwt.InvalidAudienceError:
        print("\n✗ ERROR: Invalid audience (expected 'authenticated')")
        return False
        
    except InvalidTokenError as e:
        print(f"\n✗ ERROR: JWT Verification Failed - {str(e)}")
        print("\nPossible causes:")
        print("  - Algorithm mismatch (expected ES256)")
        print("  - Invalid signature")
        print("  - Malformed token")
        return False
        
    except Exception as e:
        print(f"\n✗ ERROR: Unexpected error - {str(e)}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_jwt_verification.py <JWT_TOKEN>")
        print("\nTo get a JWT token:")
        print("1. Open the North mobile app")
        print("2. Login to your account")
        print("3. Add this to chatStore.ts line 520:")
        print("   console.log('Token:', session.access_token)")
        print("4. Send a message and copy the token from logs")
        sys.exit(1)
    
    token = sys.argv[1]
    success = test_jwt_verification(token)
    sys.exit(0 if success else 1)
