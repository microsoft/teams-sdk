<!-- download-image -->

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Teams.Apps.Clients;
using Microsoft.Teams.Apps.Schema;

HttpClient imageClient = app.Services
    .GetRequiredService<IHttpClientFactory>()
    .CreateClient(nameof(ApiClient));

teams.OnMessage(async (context, cancellationToken) =>
{
    TeamsAttachment? image = context.Activity.Attachments?.FirstOrDefault(
        attachment =>
            attachment.ContentType.Value.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            && attachment.ContentUrl is not null);

    if (image?.ContentUrl is Uri contentUrl)
    {
        using HttpResponseMessage response = await imageClient.GetAsync(
            contentUrl,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        response.EnsureSuccessStatusCode();

        // Read the response body as raw image bytes.
        byte[] bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        string base64 = Convert.ToBase64String(bytes);

        // Pass bytes or base64 to your image-processing or model client.
    }
});
```
