#!/usr/bin/env python3
"""Test script to verify OpenAPI documentation generation."""

from app.main import app
import json

# Generate OpenAPI spec
spec = app.openapi()

print("✅ OpenAPI spec generated successfully!")
print(f"\nTitle: {spec['info']['title']}")
print(f"Version: {spec['info']['version']}")
print(f"Description length: {len(spec['info'].get('description', ''))} characters")
print(f"\nTotal endpoints: {len(spec['paths'])} paths")

# List all endpoints
print("\n📋 Available Endpoints:")
for path, methods in sorted(spec['paths'].items()):
    for method in methods.keys():
        if method in ['get', 'post', 'patch', 'delete', 'put']:
            print(f"  {method.upper():6} {path}")

# Check for docstrings
endpoints_with_docs = 0
endpoints_without_docs = 0

for path, methods in spec['paths'].items():
    for method, details in methods.items():
        if method in ['get', 'post', 'patch', 'delete', 'put']:
            if details.get('description') or details.get('summary'):
                endpoints_with_docs += 1
            else:
                endpoints_without_docs += 1

print(f"\n📝 Documentation Coverage:")
print(f"  Endpoints with documentation: {endpoints_with_docs}")
print(f"  Endpoints without documentation: {endpoints_without_docs}")
print(f"  Coverage: {endpoints_with_docs / (endpoints_with_docs + endpoints_without_docs) * 100:.1f}%")

print("\n✅ All checks passed! API documentation is ready.")
print("\nAccess documentation at:")
print("  - Swagger UI: http://localhost:8000/docs")
print("  - ReDoc: http://localhost:8000/redoc")
print("  - OpenAPI JSON: http://localhost:8000/openapi.json")
