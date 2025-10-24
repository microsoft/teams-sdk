<!-- app-use-method -->

`app.use`

<!-- middleware-example -->

```python
@app.use
async def log_activity(ctx: ActivityContext[MessageActivity]):
    started_at = datetime.now()
    await ctx.next()
    ctx.logger.debug(f"{datetime.now() - started_at}")
```
