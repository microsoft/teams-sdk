<!-- accessing-files -->

```typescript
app.on('message', async ({ files, send }) => {
  const attached = await files.list();

  if (attached.length === 0) {
    await send('Send me a file and I will read it.');
    return;
  }

  await send(`You sent ${attached.length} file(s): ${attached.map((f) => f.name).join(', ')}`);
});
```

<!-- first-file -->

```typescript
const file = await files.first();

if (file) {
  await send(`Reading ${file.name}...`);
}
```

<!-- reading-download -->

```typescript
const file = await files.first();

if (file) {
  const downloaded = await file.download();

  await send(`Downloaded ${downloaded.filename} (${downloaded.bytes.length} bytes, ${downloaded.contentType})`);
}
```

<!-- reading-text -->

```typescript
const file = await files.first();

if (file) {
  const contents = await file.text();
  await send(`The file starts with: ${contents.slice(0, 100)}`);
}
```

<!-- saving-to-disk -->

```typescript
await file.saveAs('./downloads/report.pdf');
```

<!-- streaming -->

```typescript
const stream = await file.stream();

for await (const chunk of stream) {
  // process each chunk (e.g. pipe to a parser)
}
```

<!-- metadata-table -->

| Property | Description |
|---|---|
| `uniqueId` | The OneDrive/SharePoint drive-item id, when the platform provides it. Present only for files backed by ODSP storage. |
| `name` | File name including its extension (e.g. `report.pdf`). |
| `extension` | File extension without the dot (e.g. `pdf`), from the platform-supplied `fileType`. Absent when the platform omits it. |
| `contentType` | The file's MIME type, when the source provides one. Always unset for files received from a bot activity (every file today): the `file.download.info` attachment carries no MIME type, only the extension surfaced as `extension`. To learn the type of the bytes you actually received, read `contentType` on the downloaded file, which is resolved from the download response. |
| `scope` | The conversation scope the file arrived in (`personal`, `groupChat`, or `channel`). |
| `source` | Where the SDK found the file. Currently always `botActivity`. |
| `webUrl` | A browsable link to the file in OneDrive/SharePoint, when known. Not a fetchable download URL. |
| `raw` | The original wire attachment (the metadata object, not the bytes) — see [Access the raw attachment](#access-the-raw-attachment). |

<!-- reusing-downloaded-file -->

```typescript
const downloaded = await file.download();

const text = downloaded.text();          // decode as UTF-8
const buffer = downloaded.arrayBuffer(); // the raw bytes
await downloaded.saveAs('./copy.bin');   // write to disk, no re-fetch
```

<!-- downloaded-table -->

| Property / method | Description |
|---|---|
| `bytes` | The buffered file bytes as a `Uint8Array`. |
| `contentType` | MIME type resolved from the download response header, or the incoming file's metadata type if the response omits one. Falls back to `application/octet-stream` when neither provides a type, so this is never empty. |
| `filename` | The resolved file name. |
| `sourceUrl` | The URL the bytes were fetched from. |
| `text(encoding?)` | Decode the bytes as UTF-8 (or a given encoding). Lossy; never throws. |
| `arrayBuffer()` | Return the bytes as an `ArrayBuffer`. |
| `saveAs(path)` | Write the buffered bytes to a local path (no re-fetch). |

<!-- errors-import -->

```typescript
import { FileScopeNotSupportedError, FileUrlExpiredError } from '@microsoft/teams.apps';
```

<!-- errors-handling -->

```typescript
try {
  const downloaded = await file.download();
  // ...
} catch (err) {
  if (err instanceof FileUrlExpiredError && err.reason === 'firstFetch') {
    await send('That file link has expired before it could be read.');
  } else if (err instanceof FileScopeNotSupportedError) {
    await send(`Downloading files from ${err.scope} conversations is not supported yet.`);
  }
}
```

<!-- raw-attachment -->

```typescript
const file = await files.first();

if (file) {
  // `raw` is the untyped wire attachment: the escape hatch when you need a
  // field the typed surface does not expose. Here we log the whole attachment
  // to inspect exactly what the platform sent.
  log.debug('raw file attachment', file.raw);
}
```
