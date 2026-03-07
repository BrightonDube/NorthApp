"""
Infrastructure layer.

Contains adapters for external systems (AI providers, databases, caches).
All code here implements interfaces defined in core and handles:
- Retries
- Timeouts
- Error handling
- Logging
- Monitoring

WHY: Isolates external dependencies from business logic.
DESIGN: Adapter pattern with dependency injection.
"""
