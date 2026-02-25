"""
Core domain logic layer.

This package contains pure business logic with no external dependencies.
All code here should be testable without mocks.

WHY: Separating business logic from infrastructure makes code:
- Easier to test
- Easier to understand
- Easier to change
- Portable across frameworks

RULES:
- No database calls
- No API calls
- No framework dependencies
- Pure functions where possible
- Domain models only
"""
