# Blog Contributor Guide

> This guide is written for both human authors and coding agents. Every rule is explicit and unambiguous — no judgment calls required.

## Decision: local post vs. external redirect

| Situation | Type to create |
|---|---|
| Content lives in this repo | Local post (`.md`) |
| Content is published on devblogs.microsoft.com | External redirect (`.mdx`) |

---

## Creating a local post

### 1. Create the folder and file

```
teams.md/blog/YYYY-MM-DD-<slug>/index.md
```

- `YYYY-MM-DD` must match the `date:` field in frontmatter exactly.
- `<slug>` is lowercase kebab-case. It can be shorter than the title — the `slug:` frontmatter field controls the final URL, not the folder name.

### 2. Write the frontmatter

```md
---
slug: <slug>
title: "Your Post Title"
date: YYYY-MM-DD
authors:
  - name: Author Name
    title: Microsoft
    url: https://github.com/<handle>
    image_url: https://github.com/<handle>.png
tags: [tag1, tag2]
description: One sentence. Shown in search results and social previews.
---
```

**Required fields:** `slug`, `title`, `date`, `authors`, `tags`, `description`

**Author image:** Use `https://github.com/<handle>.png`. For team/org posts use `https://github.com/microsoft.png`.

**Tags:** Reuse existing tags where possible — they populate the sidebar filter. Current tags: `teams-sdk`, `copilot`, `teams-ai-library`, `mcp`, `model-context-protocol`, `agents`. New tags are fine; they appear automatically.

### 3. Write the body — truncate marker is required

```md
This paragraph is the excerpt shown on the blog listing page.

<!-- truncate -->

Everything below this line is only shown on the individual post page.
```

- `<!-- truncate -->` is **required**. Without it the build will emit a warning (`onUntruncatedBlogPosts`) and the entire post renders as the excerpt.
- Place it after 1–3 short intro paragraphs.

### 4. Co-locate assets

Images and other assets go inside the same folder as `index.md`:

```
blog/2026-05-01-my-post/
  index.md
  diagram.png
```

Reference them with a relative path: `![alt](./diagram.png)`

---

## Creating an external redirect (devblogs.microsoft.com)

### 1. Create the folder and file

```
teams.md/blog/YYYY-MM-DD-<slug>/index.mdx
```

The file **must** be `.mdx` (not `.md`) — it contains a JSX component.

### 2. Write the full file contents

```mdx
---
slug: <slug>
title: "Your Post Title"
external_url: <full URL to devblogs post>
date: YYYY-MM-DD
authors:
  - name: Microsoft 365 Dev
    title: Microsoft
tags: [tag1, tag2]
description: One sentence description.
---

import ExternalRedirect from '@site/src/components/ExternalRedirect';

<ExternalRedirect to="<full URL to devblogs post>" />
```

- The `external_url` frontmatter field is metadata only (used by the listing page).
- The `<ExternalRedirect>` component performs the actual redirect — it fires only when a visitor lands on the individual post page, not on the listing. The `to` prop must match `external_url`.
- No `<!-- truncate -->` needed. The `description:` field is used as the excerpt on the listing page.

---

## Verifying locally

```bash
# From the repo root
npm run docs:dev
```

Open http://localhost:3000/teams-sdk/blog — your post should appear in the listing.

- **New swizzle files** (anything under `src/theme/`) require a full server restart — hot reload won't pick them up.
- All other file changes (blog posts, components, CSS) hot-reload automatically.

---

## Checklist before submitting

- [ ] Folder name starts with `YYYY-MM-DD-` matching the `date:` field
- [ ] File is `index.md` for local posts, `index.mdx` for external redirects
- [ ] All required frontmatter fields are present
- [ ] Local posts have `<!-- truncate -->` in the body
- [ ] External redirects have `<ExternalRedirect to="..." />` and the URL matches `external_url:`
- [ ] Post appears correctly at http://localhost:3000/teams-sdk/blog
