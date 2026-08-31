<!-- key-terms -->

- Activity: The Teams-specific payload that flows between the user and your app. Activities include things like messages, reactions, adaptive card actions, and installs.
- InvokeActivity: A specific kind of activity triggered by user interaction (like submitting a form), which may or may not require a response.
- Handler: The logic in your application that reacts to an activity. You register handlers (`OnMessage`, `OnMessageReaction`, `OnEvent`, …) that decide what to do, when, and how to respond.
