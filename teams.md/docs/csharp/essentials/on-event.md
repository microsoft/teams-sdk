---
sidebar_position: 2
summary: Guide to handling and responding to events in C# Teams SDK applications, including user and server-originated events.
---

# Listening To Events

An **event** is a foundational concept in building agents — it represents something noteworthy happening either on Microsoft Teams or within your application. These events can originate from the user (e.g. installing or uninstalling your app, sending a message, submitting a form), or from your application server (e.g. startup, error in a handler).

```mermaid
flowchart LR
    Teams["Teams"]:::less-interesting
    Server["App Server"]:::interesting
    AppEventHandlers["Event Handler (app.OnEvent())"]:::interesting

    Teams --> |Activity| Server
    Teams --> |Signed In| Server
    Teams --> |...other<br/>incoming events| Server
    Server ---> |incoming<br/>events| AppEventHandlers
    Server ---> |outgoing<br/>events<br/>| AppEventHandlers


    linkStyle 0,1,2,3,4 stroke:#b1650f,stroke-width:1px
    classDef interesting fill:#b1650f,stroke:#333,stroke-width:4px;
```

The Teams SDK makes it easy to subscribe to these events and respond appropriately. You can register event handlers to take custom actions when specific events occur — such as logging errors, triggering workflows, or sending follow-up messages.

Here are the events that you can start building handlers for:

| **Event Name**      | **Description**                                                                |
| ------------------- | ------------------------------------------------------------------------------ |
| `start`             | Triggered when your application starts. Useful for setup or boot-time logging. |
| `signin`            | Triggered during a sign-in flow via Teams.                                     |
| `error`             | Triggered when an unhandled error occurs in your app. Great for diagnostics.   |
| `activity`          | A catch-all for incoming Teams activities (messages, commands, etc.).          |
| `activity.response` | Triggered when your app sends a response to an activity. Useful for logging.   |
| `activity.sent`     | Triggered when an activity is sent (not necessarily in response).              |

### Example 1

We can subscribe to errors that occur in the app.

```csharp
app.OnError((sender, @event) =>
{
    // do something with the error
    app.Logger.Info(@event.Exception.ToString());
});
```

### Example 2

When an activity is received, log its `JSON` payload.

```typescript
app.OnActivity((sender, @event) =>
{
    app.Logger.Info(@event.Activity.ToString());
});
```
