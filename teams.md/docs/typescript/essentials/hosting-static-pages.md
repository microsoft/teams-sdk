---
sidebar_position: 5
summary: Shows how to host web apps.
---

# Hosting Apps/Static Pages
The `App` class lets you host web apps in the agent. This can be used for an efficient inner loop when building a complex app using Microsoft 365 Agents Toolkit, as it lets you build, deploy, and sideload both an agent and a Tab app inside of Teams in a single step. It's also useful in production scenarios, as it makes it straight-forward to host a simple experience such as an agent configuration page or a Dialog.

To host a static tab web app, call the `app.tab()` function and provide an app name and a path to a folder containing an `index.html` file to be served up. 

```typescript
app.tab('myApp', path.resolve('dist/client'));
```

This registers a route that is hosted at `http://localhost:{PORT}/tabs/myApp` or `https://{BOT_DOMAIN}/tabs/myApp`.

## Additional resources
 - For more details about Tab apps, see the [Tabs](../in-depth-guides/tabs) in-depth guide. 
 - For an example of hosting a Dialog, see the [Creating Dialogs](../in-depth-guides/dialogs/creating-dialogs.md) in-depth guide.
