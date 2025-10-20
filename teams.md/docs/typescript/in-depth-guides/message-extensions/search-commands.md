---
sidebar_position: 2
summary: How to implement search commands in message extensions to allow users to search external systems and insert results as cards.
---

# 🔍 Search commands

Message extension search commands allow users to search external systems and insert the results of that search into a message in the form of a card.

## Search command invocation locations

There are two different areas search commands can be invoked from:

1. Compose Area
2. Compose Box

### Compose Area and Box

![compose area and box](/screenshots/compose-area.png)

## Setting up your Teams app manifest

To use search commands you have to define them in the Teams app manifest. Here is an example:


```json
"composeExtensions": [
    {
        "botId": "${{BOT_ID}}",
        "commands": [
            {
                "id": "searchQuery",
                "context": [
                    "compose",
                    "commandBox"
                ],
                "description": "Test command to run query",
                "title": "Search query",
                "type": "query",
                "parameters": [
                    {
                        "name": "searchQuery",
                        "title": "Search Query",
                        "description": "Your search query",
                        "inputType": "text"
                    }
                ]
            }
        ]
    }
]
```


Here we are defining the `searchQuery` search (or query) command.

## Handle submission

Handle opening adaptive card dialog when the `searchQuery` query is submitted.

```typescript
import { cardAttachment } from '@microsoft/teams.api';
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.ext.query', async ({ activity }) => {
  const { commandId } = activity.value;
  const searchQuery = activity.value.parameters![0].value;

  if (commandId == 'searchQuery') {
    const cards = await createDummyCards(searchQuery);
    const attachments = cards.map(({ card, thumbnail }) => {
      return {
        ...cardAttachment('adaptive', card), // expanded card in the compose box...
        preview: cardAttachment('thumbnail', thumbnail), // preview card in the compose box...
      };
    });

    return {
      composeExtension: {
        type: 'result',
        attachmentLayout: 'list',
        attachments: attachments,
      },
    };
  }

  return { status: 400 };
});
```

`createDummyCards()` function

```typescript
import { ThumbnailCard } from '@microsoft/teams.api';
import { AdaptiveCard, TextBlock } from '@microsoft/teams.cards';
// ...

export async function createDummyCards(searchQuery: string) {
  const dummyItems = [
    {
      title: 'Item 1',
      description: `This is the first item and this is your search query: ${searchQuery}`,
    },
    { title: 'Item 2', description: 'This is the second item' },
    { title: 'Item 3', description: 'This is the third item' },
    { title: 'Item 4', description: 'This is the fourth item' },
    { title: 'Item 5', description: 'This is the fifth item' },
  ];

  const cards = dummyItems.map((item) => {
    return {
      card: new AdaptiveCard(
        new TextBlock(item.title, {
          size: 'Large',
          weight: 'Bolder',
          color: 'Accent',
          style: 'heading',
        }),
        new TextBlock(item.description, {
          wrap: true,
          spacing: 'Medium',
        })
      ),
      thumbnail: {
        title: item.title,
        text: item.description,
        // When a user clicks on a list item in Teams:
        // - If the thumbnail has a `tap` property: Teams will trigger the `message.ext.select-item` activity
        // - If no `tap` property: Teams will insert the full adaptive card into the compose box
        // tap: {
        //   type: "invoke",
        //   title: item.title,
        //   value: {
        //     "option": index,
        //   },
        // },
      } satisfies ThumbnailCard,
    };
  });

  return cards;
}
```

The search results include both a full adaptive card and a preview card. The preview card appears as a list item in the search command area:

![Search command preview card](/screenshots/preview-card.png)

When a user clicks on a list item the dummy adaptive card is added to the compose box:

![Card in compose box](/screenshots/card-in-compose.png)

To implement custom actions when a user clicks on a search result item, you can add the `tap` property to the preview card. This allows you to handle the click event with custom logic:

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('message.ext.select-item', async ({ activity, send }) => {
  const { option } = activity.value;

  await send(`Selected item: ${option}`);

  return {
    status: 200,
  };
});
```

## Resources

- [Search command](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command?tabs=Teams-toolkit%2Cdotnet)
- [Just-In-Time Install](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/universal-actions-for-search-based-message-extensions#just-in-time-install)
