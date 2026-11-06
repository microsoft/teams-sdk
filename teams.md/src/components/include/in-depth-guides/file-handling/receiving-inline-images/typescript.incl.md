<!-- list-inline-images -->

```typescript
app.on('message', async ({ files, send }) => {
  const pastedImages = await files.list({ attachmentStyle: 'inlineImage' });

  if (pastedImages.length === 0) {
    await send('Paste an image into your message and I will read it.');
    return;
  }

  await send(`You pasted ${pastedImages.length} image(s).`);
});
```

<!-- download-inline-image -->

```typescript
const image = await files.first({ attachmentStyle: 'inlineImage' });

if (image) {
  const downloaded = await image.download();
  const base64 = Buffer.from(downloaded.bytes).toString('base64');

  // Pass `downloaded.bytes` or `base64`, with `downloaded.contentType`, to your image-processing or model client.
}
```

<!-- errors-handling -->

```typescript
import { InlineImageTransformationError } from '@microsoft/teams.apps';

try {
  const downloaded = await image.download();
  // ...
} catch (err) {
  if (err instanceof InlineImageTransformationError) {
    await send('That pasted image cannot be downloaded. Try sending it as a file attachment instead.');
  } else {
    throw err;
  }
}
```
