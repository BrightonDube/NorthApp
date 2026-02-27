import requests
import json

# Fetch JWKS keys from Supabase
# Try multiple possible endpoints
urls = [
    "https://pigtshfobiwuwaionxpo.supabase.co/rest/v1/auth/keys",
    "https://pigtshfobiwuwaionxpo.supabase.co/auth/v1/jwks",
    "https://pigtshfobiwuwaionxpo.supabase.co/auth/v1/.well-known/jwks.json",
]
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZ3RzaGZvYml3dXdhaW9ueHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzMTgsImV4cCI6MjA4NTI4NDMxOH0.Y_r1qK2yiHtNYdnKjbv0c3MnKjG8MOwBEC78n39uZwU"

headers = {
    "apikey": anon_key
}

for url in urls:
    print(f"\nTrying: {url}")
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        try:
            print("\nJWKS Keys:")
            print(json.dumps(response.json(), indent=2))
            break
        except (ValueError, KeyError):
            print("Response text:", response.text[:200])
    else:
        print("Response:", response.text[:200])
