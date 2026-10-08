<!-- custom-route-shared-secret-example -->

```typescript
// Express middleware: gate a custom route with a shared secret.
const requireWebhookAuth: express.RequestHandler = (req, res, next) => {
  const secret = process.env["WEBHOOK_SECRET"] ?? "";
  const expected = "Bearer " + secret;
  if (req.headers.authorization !== expected) {
    res.status(401).end();
    return;
  }
  next();
};
```
