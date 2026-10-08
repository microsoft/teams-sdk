<!-- hosted-image -->

```typescript
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ send }) => {
  await send(
    new MessageActivityInput('Here is the latest chart:').addAttachments({
      contentType: 'image/png',
      contentUrl: 'https://contoso.com/charts/weekly.png',
      name: 'weekly.png',
    })
  );
});
```

<!-- inline-bytes -->

```typescript
import { readFile } from 'node:fs/promises';
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ send }) => {
  const bytes = await readFile('./charts/weekly.png');

  await send(
    new MessageActivityInput('Here is the latest chart:').addAttachments({
      contentType: 'image/png',
      contentUrl: `data:image/png;base64,${bytes.toString('base64')}`,
      name: 'weekly.png',
    })
  );
});
```

<!-- positioned-image -->

```typescript
import { readFile } from 'node:fs/promises';
import { MessageActivityInput } from '@microsoft/teams.api';

app.on('message', async ({ send }) => {
  const bytes = await readFile('./charts/weekly.png');
  const encoded = bytes.toString('base64');

  await send(
    new MessageActivityInput(
      `<div>Revenue is up.<img src="data:image/png;base64,${encoded}"/>Questions?</div>`
    ).withTextFormat('xml')
  );
});
```

<!-- attachment-table -->

| Property | Description |
|---|---|
| `contentType` | Required. The image's MIME type (`image/png`, `image/jpeg`, or `image/gif`). This is what makes Teams render the attachment as a picture, so it has to match the actual bytes. |
| `contentUrl` | The image itself: either a reachable `https://` URL, or a `data:<mime>;base64,<encoded>` URI. |
| `name` | Optional display name for the attachment (e.g. `weekly.png`). |
| `thumbnailUrl` | Optional preview image. Rarely needed for an inline image, since the image is already its own preview. |
| `content` | Embedded payload, used by card attachments. Leave it unset for an image. |

<!-- multiple-images -->

```typescript
await send(
  new MessageActivityInput('This week at a glance:')
    .withAttachmentLayout('carousel')
    .addAttachments(
      {
        contentType: 'image/png',
        contentUrl: 'https://contoso.com/charts/sales.png',
        name: 'sales.png',
      },
      {
        contentType: 'image/png',
        contentUrl: 'https://contoso.com/charts/traffic.png',
        name: 'traffic.png',
      }
    )
);
```

`addAttachments()` is variadic and appends, so calling it more than once builds the list up rather than replacing it. `withAttachmentLayout()` takes `'list'` (the default) or `'carousel'`.

<!-- card-image -->

```typescript
import { AdaptiveCard, Image } from '@microsoft/teams.cards';

await send(
  new AdaptiveCard(
    new Image('https://contoso.com/charts/weekly.png', {
      altText: 'Weekly sales chart',
      size: 'Large',
    })
  )
);
```
