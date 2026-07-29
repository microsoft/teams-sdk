<!-- overview -->

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="csharp-sdk-version" defaultValue="core">
  <TabItem value="legacy" label="SDK 2.0 (Legacy)">

SDK 2.0 includes a built-in `app.AddTab(...)` helper for hosting static tab content from your bot host.

  </TabItem>
  <TabItem value="core" label="SDK 2.1 (current)" default>

SDK 2.1 does not expose a dedicated `AddTab` helper. Instead, host tab content with standard ASP.NET routes (for example `app.MapGet("/tabs/{name}/...")`) and keep using Teams SDK handlers for bot-side tab functions.

  </TabItem>
</Tabs>

<!-- additional-resources -->

### Additional resources

- [Static Pages](../server/static-pages)
- [TypeScript Tabs in-depth guide](../../../typescript/in-depth-guides/tabs)
