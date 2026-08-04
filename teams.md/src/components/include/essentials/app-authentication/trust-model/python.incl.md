<!-- custom-route-shared-secret-example -->

```python
# FastAPI dependency: gate a custom route with a shared secret.
async def require_webhook_auth(request: Request) -> None:
    secret = os.environ.get("WEBHOOK_SECRET", "")
    expected = "Bearer " + secret
    if request.headers.get("authorization") != expected:
        raise HTTPException(status_code=401)
```
