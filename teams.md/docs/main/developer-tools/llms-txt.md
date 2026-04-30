---
sidebar_position: 3
summary: Documentation files optimized for AI coding assistants to give them context about the Teams SDK.
---

# llms.txt

The Teams SDK publishes [llms.txt](https://llmstxt.org) files, plain-text versions of the documentation optimized for AI coding assistants. Point your tool at the right file and it gets the context it needs to help you build Teams apps.

## Available files

### Root

High-level SDK overview with links to reference guides.

```
https://microsoft.github.io/teams-sdk/llms_docs/llms.txt
```

:::tip
Instead of manually providing URLs, you can install the [`teams-dev` agent skill](./agent-skills) which automatically gives your coding assistant the right context.
:::

### Per-language

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="typescript" label="TypeScript">

**Small** — navigation index, the assistant fetches individual pages as needed.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_typescript.txt
```

**Full** — complete documentation in a single file, best for tools with large context windows.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_typescript_full.txt
```

</TabItem>
<TabItem value="python" label="Python">

**Small** — navigation index, the assistant fetches individual pages as needed.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_python.txt
```

**Full** — complete documentation in a single file, best for tools with large context windows.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_python_full.txt
```

</TabItem>
<TabItem value="csharp" label="C#">

**Small** — navigation index, the assistant fetches individual pages as needed.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_csharp.txt
```

**Full** — complete documentation in a single file, best for tools with large context windows.
```
https://microsoft.github.io/teams-sdk/llms_docs/llms_csharp_full.txt
```

</TabItem>
</Tabs>
