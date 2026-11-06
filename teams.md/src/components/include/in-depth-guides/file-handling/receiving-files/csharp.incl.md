<!-- accessing-files -->

```csharp
teamsApp.OnMessage(async (context, cancellationToken) =>
{
    IList<IncomingFile> attached = await context.Files.ListAsync(cancellationToken);

    if (attached.Count == 0)
    {
        await context.ReplyAsync("Send me a file and I will read it.", cancellationToken);
        return;
    }

    string names = string.Join(", ", attached.Select(f => f.Name));
    await context.ReplyAsync($"You sent {attached.Count} file(s): {names}", cancellationToken);
});
```

<!-- first-file -->

```csharp
IncomingFile? file = await context.Files.FirstAsync(cancellationToken);

if (file is not null)
{
    await context.ReplyAsync($"Reading {file.Name}...", cancellationToken);
}
```

<!-- filter-by-style -->

```csharp
// Only files sent as file attachments
IList<IncomingFile> attachedFiles = await context.Files.ListAsync(
    new FileListOptions { AttachmentStyle = AttachmentStyle.File },
    cancellationToken);

// Only images pasted into the message
IList<IncomingFile> pastedImages = await context.Files.ListAsync(
    new FileListOptions { AttachmentStyle = AttachmentStyle.InlineImage },
    cancellationToken);
```

<!-- reading-download -->

```csharp
IncomingFile? file = await context.Files.FirstAsync(
    new FileListOptions { AttachmentStyle = AttachmentStyle.File },
    cancellationToken);

if (file is not null)
{
    DownloadedFile downloaded = await file.DownloadAsync(cancellationToken);

    await context.ReplyAsync($"Downloaded {downloaded.Filename} ({downloaded.Bytes.Length} bytes, {downloaded.ContentType})", cancellationToken);
}
```

<!-- reading-text -->

```csharp
IncomingFile? file = await context.Files.FirstAsync(
    new FileListOptions { AttachmentStyle = AttachmentStyle.File },
    cancellationToken);

if (file is not null)
{
    string contents = await file.TextAsync(cancellationToken: cancellationToken);
    await context.ReplyAsync($"The file starts with: {contents[..Math.Min(100, contents.Length)]}", cancellationToken);
}
```

<!-- saving-to-disk -->

```csharp
await file.SaveAsAsync("./downloads/report.pdf", cancellationToken);
```

<!-- streaming -->

```csharp
await using Stream stream = await file.StreamAsync(cancellationToken);

byte[] buffer = new byte[8192];
int read;
while ((read = await stream.ReadAsync(buffer, cancellationToken)) > 0)
{
    // process only the bytes read this iteration (e.g. pipe to a parser)
    ReadOnlyMemory<byte> chunk = buffer.AsMemory(0, read);
}
```

<!-- metadata-table -->

| Property | Description |
|---|---|
| `UniqueId` | The OneDrive/SharePoint drive-item id, when the platform provides it. Present only for files backed by ODSP storage. |
| `Name` | File name including its extension (e.g. `report.pdf`). |
| `Extension` | File extension without the dot (e.g. `pdf`), from the platform-supplied `fileType`. Absent when the platform omits it. |
| `AttachmentStyle` | How the file was attached: `AttachmentStyle.File` when sent as a file attachment, or `AttachmentStyle.InlineImage` when pasted into the message. |
| `ContentType` | The file's MIME type, when the source provides one. Always unset for file attachments received from a bot activity: the `file.download.info` attachment carries no MIME type, only the extension surfaced as `Extension`. To learn the type of the bytes you actually received, read `ContentType` on the downloaded file, which is resolved from the download response. For an inline image, see [Receiving Inline Images](./receiving-inline-images#how-pasted-images-are-named-and-typed). |
| `Scope` | The conversation scope the file arrived in (`personal`, `groupChat`, or `channel`). |
| `Source` | Where the SDK found the file. Currently always `botActivity`. |
| `ContentUrl` | A browsable link to the file in OneDrive/SharePoint, when known. Not a fetchable download URL. For an inline image, it is the image's Bot API location. |
| `Raw` | The original wire attachment (the metadata object, not the bytes) — see [Access the raw attachment](#access-the-raw-attachment). |

<!-- reusing-downloaded-file -->

```csharp
DownloadedFile downloaded = await file.DownloadAsync(cancellationToken);

string text = downloaded.Text();                               // decode as UTF-8
byte[] bytes = downloaded.Bytes;                               // the raw bytes
await downloaded.SaveAsAsync("./copy.bin", cancellationToken); // write to disk, no re-fetch
```

<!-- downloaded-table -->

| Property / method | Description |
|---|---|
| `Bytes` | The buffered file bytes as a `byte[]`. |
| `ContentType` | MIME type resolved from the download response header, or the incoming file's metadata type if the response omits one. Falls back to `application/octet-stream` when neither provides a type, so this is never empty. |
| `Filename` | The resolved file name. |
| `SourceUrl` | The URL the bytes were fetched from. |
| `Text(encoding?)` | Decode the bytes as UTF-8 (or a given encoding). Lossy; never throws. |
| `SaveAsAsync(path)` | Write the buffered bytes to a local path (no re-fetch). |

<!-- errors-import -->

```csharp
using Microsoft.Teams.Apps.Files;
```

<!-- errors-handling -->

```csharp
try
{
    DownloadedFile downloaded = await file.DownloadAsync(cancellationToken);
    // ...
}
catch (FileUrlExpiredException err) when (err.Reason == FileUrlExpiredReason.FirstFetch)
{
    await context.ReplyAsync("That file link has expired before it could be read.", cancellationToken);
}
catch (FileCredentialException err)
{
    await context.ReplyAsync($"Could not read that file as {err.Actor?.ToString() ?? "the identity used"}: no Graph credential was available.", cancellationToken);
}
catch (FileAccessException err)
{
    await context.ReplyAsync($"Could not read that file as {err.Actor?.ToString() ?? "the identity used"}: the service returned {err.Status}.", cancellationToken);
}
catch (InlineImageTransformationException)
{
    await context.ReplyAsync("That pasted image cannot be downloaded. Try sending it as a file attachment instead.", cancellationToken);
}
catch (InlineImageAccessException err)
{
    await context.ReplyAsync($"Could not read that pasted image as {err.Actor?.ToString() ?? "the identity used"}: the service returned {err.Status}.", cancellationToken);
}
catch (FileScopeNotSupportedException err)
{
    await context.ReplyAsync($"Downloading files from {err.Scope} conversations is not supported yet.", cancellationToken);
}
catch (FileException)
{
    // Any future inbound-file failure lands here rather than escaping unhandled.
    await context.ReplyAsync("That file could not be read.", cancellationToken);
}
```

<!-- raw-attachment -->

```csharp
using System.Text.Json;

IncomingFile? file = await context.Files.FirstAsync(cancellationToken);

if (file is not null)
{
    // `Raw` is the untyped wire attachment: the escape hatch when you need a
    // field the typed surface does not expose. Here we serialize the whole
    // attachment to inspect exactly what the platform sent.
    string wire = JsonSerializer.Serialize(file.Raw);
    await context.ReplyAsync($"raw attachment: {wire}", cancellationToken);
}
```
