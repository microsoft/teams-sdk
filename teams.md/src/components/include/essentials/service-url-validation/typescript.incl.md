<!-- adding-custom-domains -->

```typescript
const app = new App({
  additionalAllowedDomains: ['.my-custom-channel.com'],
});
```

<!-- disabling-validation -->

```typescript
const app = new App({
  additionalAllowedDomains: ['*'],
});
```
