<!-- middleware-example -->

```typescript
app.use(async ({ log, next }) => {
  const startedAt = new Date();
  await next();
  log.debug(new Date().getTime() - startedAt.getTime());
});
```
