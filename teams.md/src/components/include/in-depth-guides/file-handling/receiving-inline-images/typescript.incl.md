<!-- download-image -->

```typescript
app.on('message', async ({ activity }) => {
  const image = activity.attachments?.find(
    (attachment) => attachment.contentType?.startsWith('image/') && attachment.contentUrl
  );

  if (image?.contentUrl) {
    // Request binary data so the client does not decode the image as text or JSON.
    const res = await app.api.http.get<ArrayBuffer>(image.contentUrl, {
      responseType: 'arraybuffer',
    });

    const bytes = Buffer.from(res.data);
    const base64 = bytes.toString('base64');

    // Pass `bytes` or `base64` to your image-processing or model client.
  }
});
```
