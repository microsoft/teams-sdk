<!-- list-inline-images -->

```csharp
using Microsoft.Teams.Apps.Files;

teamsApp.OnMessage(async (context, cancellationToken) =>
{
    IList<IncomingFile> pastedImages = await context.Files.ListAsync(
        new FileListOptions { AttachmentStyle = AttachmentStyle.InlineImage },
        cancellationToken);

    if (pastedImages.Count == 0)
    {
        await context.ReplyAsync("Paste an image into your message and I will read it.", cancellationToken);
        return;
    }

    await context.ReplyAsync($"You pasted {pastedImages.Count} image(s).", cancellationToken);
});
```

<!-- download-inline-image -->

```csharp
IncomingFile? image = await context.Files.FirstAsync(
    new FileListOptions { AttachmentStyle = AttachmentStyle.InlineImage },
    cancellationToken);

if (image is not null)
{
    DownloadedFile downloaded = await image.DownloadAsync(cancellationToken);
    string base64 = Convert.ToBase64String(downloaded.Bytes);

    // Pass downloaded.Bytes or base64, with downloaded.ContentType, to your image-processing or model client.
}
```

<!-- errors-handling -->

```csharp
using Microsoft.Teams.Apps.Files;

try
{
    DownloadedFile downloaded = await image.DownloadAsync(cancellationToken);
    // ...
}
catch (InlineImageTransformationException)
{
    await context.ReplyAsync("That pasted image cannot be downloaded. Try sending it as a file attachment instead.", cancellationToken);
}
```
