<!-- hosted-image -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Schema;

teamsApp.OnMessage(async (context, cancellationToken) =>
{
    TeamsAttachment image = TeamsAttachment.CreateBuilder()
        .WithContentType(new AttachmentContentType("image/png"))
        .WithContentUrl(new Uri("https://contoso.com/charts/weekly.png"))
        .WithName("weekly.png")
        .Build();

    await context.SendAsync(
        new MessageActivityInput()
            .WithText("Here is the latest chart:")
            .AddAttachment(image),
        cancellationToken);
});
```

`AttachmentContentTypes` exposes constants for the card content types only, so an image type is constructed directly: `new AttachmentContentType("image/png")`.

<!-- inline-bytes -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Apps.Schema;

teamsApp.OnMessage(async (context, cancellationToken) =>
{
    byte[] bytes = await File.ReadAllBytesAsync("./charts/weekly.png", cancellationToken);
    string dataUri = $"data:image/png;base64,{Convert.ToBase64String(bytes)}";

    TeamsAttachment image = TeamsAttachment.CreateBuilder()
        .WithContentType(new AttachmentContentType("image/png"))
        .WithContentUrl(new Uri(dataUri))
        .WithName("weekly.png")
        .Build();

    await context.SendAsync(
        new MessageActivityInput()
            .WithText("Here is the latest chart:")
            .AddAttachment(image),
        cancellationToken);
});
```

:::note
`ContentUrl` is a `Uri`, not a `string`, so a data URI has to be wrapped in `new Uri(...)`. `data:` is a scheme `Uri` understands, and the base64 payload survives the round trip unchanged, including its `+`, `/`, and `=` characters.
:::

<!-- positioned-image -->

```csharp
using Microsoft.Teams.Apps;

teamsApp.OnMessage(async (context, cancellationToken) =>
{
    string encoded = Convert.ToBase64String(
        await File.ReadAllBytesAsync("charts/weekly.png", cancellationToken));

    await context.SendAsync(
        new MessageActivityInput()
            .WithText($"<div>Revenue is up.<img src=\"data:image/png;base64,{encoded}\"/>Questions?</div>")
            .WithTextFormat(TextFormats.Xml),
        cancellationToken);
});
```

<!-- attachment-table -->

| Property | Description |
|---|---|
| `ContentType` | Required. The image's MIME type (`image/png`, `image/jpeg`, or `image/gif`), as an `AttachmentContentType`. This is what makes Teams render the attachment as a picture, so it has to match the actual bytes. |
| `ContentUrl` | The image itself, as a `Uri`: either a reachable `https://` URL, or a `data:<mime>;base64,<encoded>` URI. |
| `Name` | Optional display name for the attachment (e.g. `weekly.png`). |
| `ThumbnailUrl` | Optional preview image. Rarely needed for an inline image, since the image is already its own preview. |
| `Content` | Embedded payload, used by card attachments. Leave it unset for an image. |

<!-- multiple-images -->

```csharp
await context.SendAsync(
    new MessageActivityInput()
        .WithText("This week at a glance:")
        .WithAttachmentLayout(AttachmentLayoutType.Carousel)
        .AddAttachment(salesChart, trafficChart),
    cancellationToken);
```

`AddAttachment()` takes `params TeamsAttachment[]` and appends, so calling it more than once builds the list up rather than replacing it. `AttachmentLayoutType` offers `List` (the default), `Carousel`, and `Grid`.

<!-- card-image -->

```csharp
using Microsoft.Teams.Apps;
using Microsoft.Teams.Cards;

AdaptiveCard card = new AdaptiveCard
{
    Body =
    [
        new Image("https://contoso.com/charts/weekly.png")
        {
            AltText = "Weekly sales chart",
            Size = Size.Large,
        }
    ],
};

await context.SendAsync(
    new MessageActivityInput().AddAdaptiveCardAttachment(card),
    cancellationToken);
```
