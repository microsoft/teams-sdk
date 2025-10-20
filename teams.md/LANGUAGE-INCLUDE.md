# Language-Specific Documentation System

This documentation system allows you to maintain a single source of truth for content that needs to appear across multiple programming languages (TypeScript, C#, Python), while supporting language-specific fragments within pages.

## Architecture Overview

```
src/pages/templates/    ← Templates of general content with <LanguageInclude /> tags
     ↓ (generate-language-docs.ts)
docs/main/{lang}/      ← Auto-generated files with language-specific insertions
     ↓ (Docusaurus build + language-include-plugin.ts)
src/components/include/ ← Language include / Fragment files ({lang}.incl.md) with language-specific 'fragments' content
     ↓ (Rendered by Language.tsx component at runtime)
Final rendered page    ← Shows only content for current language
```

## Components

### 1. Template Files

`src/pages/templates/*.mdx`

These are your source of truth. Write common content once with placeholders for language-specific sections.

**Example:** `src/pages/templates/getting-started.mdx`

```mdx
---
title: Getting Started
---

# Getting Started

This is common content that appears for all languages.

## Installation

<LanguageInclude section="install" />

## Usage

Here's how to use the library:

<LanguageInclude section="usage" />

You can also use inline: The package name is <LanguageInclude section="package-name" /> and works great.

## Conclusion

More common content here.
```

**Inline vs Block Usage:**

- **Block-level** (on its own line): Content is parsed as Markdown/MDX with full formatting support

  ```mdx
  <LanguageInclude section="code-example" />
  ```

- **Inline** (within text): Content is inserted as plain text **(no Markdown parsing)**
  ```mdx
  The command is <LanguageInclude section="cli-command" /> for installation.
  ```

Other notes:

- Template files are **NOT** served directly by Docusaurus, they are copied to `docs/main/{lang}/` by the generation script
- Use `<LanguageInclude section="sectionName" />` to insert language-specific fragments
- `<LanguageInclude>` tags can be used both **inline** (within text) or as **block elements** (on their own line)

### 2. Fragment/Include Files

`src/components/include/**/{lang}.incl.md`

These contain language-specific content organized by sections using HTML comments. Fragment files are organized in a directory structure that mirrors the template location, with each page having its own folder containing one file per language.

**Example structure:** `src/components/include/getting-started/quickstart/typescript.incl.md`

````markdown
<!-- install -->

```bash
npm install @microsoft/teams-ai
```
````

<!-- usage -->

Import the library in your TypeScript project:

```typescript
import { Application } from '@microsoft/teams-ai';
```

<!-- package-name -->

@microsoft/teams-ai

<!-- advanced -->

N/A

````

#### Section Markers:

- `<!-- sectionName -->` Marks the start of a section
- Content continues until the next section marker or end of file
- Use `N/A` or `not applicable` (case-insensitive) to intentionally skip a section for a language
- For inline sections, keep content simple (plain text, no complex formatting)
- For block sections, full Markdown/MDX is supported including code blocks, lists, admonitions (`:::info`), etc.

### 3. Generation Script

`scripts/generate-language-docs.ts` copies template files to language-specific directories with auto-generation headers.

#### Commands

```bash
npm run generate:docs        # Generate all docs once
npm run generate:docs:watch  # Watch for changes (runs with npm start)
````

#### What it does:

- **Cleans up stale files**: Deletes all existing `.mdx` files in `docs/main/{lang}/` to prevent orphaned files
- Reads all `*.mdx` templates from `src/pages/templates/` (including nested directories)
- Validates each template contains `<LanguageInclude />` tags (warns if missing)
- Copies to `docs/main/typescript/`, `docs/main/csharp/`, `docs/main/python/`
- **Copies category files**: Automatically finds `_category_.json` files in template directories and copies them to all language directories
- Adds warning header about auto-generation
- Preserves frontmatter and directory structure

### 4. Language Include Plugin

`src/plugins/language-include-plugin.ts`

A Remark plugin that processes generated MDX files during Docusaurus build.

#### What it does

- Finds `<LanguageInclude section="..." />` tags
  - For **block-level tags**: Parses content as Markdown/MDX (supports code blocks, lists, admonitions, etc.)
  - For **inline tags**: Inserts content as plain text (no Markdown parsing)
- Reads corresponding `.incl.md` files from `src/components/include/` and extracts the specified section using HTML comment markers
- Converts admonition syntax (`:::info`) to Docusaurus-compatible JSX (Docusaurus doesn't do it automatically anymore with these changes)
- Wraps content in `<Language language="{lang}" />` components
- Automatically injects `import Language from '@site/src/components/Language';` when needed
- Caches file reads for performance
- Shows helpful error messages in **development mode only** (hidden in production)

#### Error handling

- **Missing file**: `[Dev] Documentation file for {Language} not found: {relative-path}` (dev only)
- **Missing section**: `[Dev] Section "{section}" not found in {Language} documentation` (dev only)
- **N/A sections**: Silently skipped (no rendering) when content is `N/A` or `not applicable` (case-insensitive)
- **Production**: All error messages hidden (detected via `process.env.NODE_ENV === 'production'`), only valid content shown

#### Configuration:

(in `docusaurus.config.ts`)

```typescript
remarkPlugins: [
  [
    require('./src/plugins/language-include-plugin.ts').default,
    {
      pagesRoot: path.join(__dirname, 'src', 'components', 'include'),
      languages: 'typescript' | 'csharp' | 'python',
    },
  ],
];
```

### 5. Language React Component

`src/components/Language.tsx`

React component that conditionally renders content based on the URL path.

#### How it works:

- Uses `useLocation` hook from Docusaurus router to get current pathname
- Checks if current URL path contains `/{language}/`
- Only renders children if path matches the language
- Returns `null` (no rendering) if language doesn't match
- Allows single page to contain all three language versions

**Example:** At `/teams-ai/typescript/getting-started`:

```jsx
<Language language="typescript">TypeScript content</Language>  // ✓ Rendered
<Language language="csharp">C# content</Language>              // ✗ Hidden
<Language language="python">Python content</Language>          // ✗ Hidden
```

### 6. MDXComponents Theme Override

`src/theme/MDXComponents.tsx`

This file extends Docusaurus's MDX component system to make the LanguageInclude component available globally in all MDX files without requiring individual imports.

```tsx
import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import LanguageInclude from '../components/LanguageInclude';

export default {
  ...MDXComponents,
  LanguageInclude,
};
```

You can use `<LanguageInclude section="..." />` in templates without importing it.

### 7. LanguageInclude React Component

`src/components/LanguageInclude.tsx`

Placeholder component that gets replaced by the plugin at build time. This component is made available globally to all MDX files through the MDXComponents theme override.

### 8. Language Constants

`src/constants/languages.ts`

Single source of truth for all language-related configuration:

```typescript
export const LANGUAGES = ['typescript', 'csharp', 'python'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES = {
  typescript: 'TypeScript',
  csharp: 'C#',
  python: 'Python',
} as const;

export const DEFAULT_LANGUAGE: Language = 'typescript';
```

This file is imported by the generation script, plugin, and components to ensure consistency.

## Workflow

### Creating New Documentation

1. **Create a template** in `src/pages/templates/`:

   ```bash
   touch src/pages/templates/my-guide.mdx
   ```

2. **Write content with LanguageInclude tags:**

   ```mdx
   ---
   title: My Guide
   ---

   # My Guide

   Common intro text.

   <LanguageInclude section="example" />
   ```

3. **Create fragment directory and files:**

   ```bash
   mkdir -p src/components/include/my-guide
   ```

4. **Add language-specific content for each language:**

   `src/components/include/my-guide/typescript.incl.md`:

   ```markdown
   <!-- example -->

   TypeScript example code here
   ```

   `src/components/include/my-guide/csharp.incl.md`:

   ```markdown
   <!-- example -->

   C# example code here
   ```

   `src/components/include/my-guide/python.incl.md`:

   ```markdown
   <!-- example -->

   Python example code here
   ```

5. **(Optional) Add category file for sidebar organization:**

   If you need to customize the sidebar position or label, create a category file alongside your template:

   `src/pages/templates/my-guide/_category_.json`:

   ```json
   {
     "label": "My Guide",
     "position": 3,
     "collapsed": false
   }
   ```

   This will be automatically copied to all language directories during generation.

6. **Generate docs:**

   ```bash
   npm run generate:docs
   ```

   This creates:

   - `docs/main/typescript/my-guide.mdx`
   - `docs/main/csharp/my-guide.mdx`
   - `docs/main/python/my-guide.mdx`
   - Category files (if created) in each language directory

7. **Start development server:**

   ```bash
   npm start
   ```

   The watcher will automatically regenerate when you edit templates.

### Excluding Pages from Sidebar

To create pages that are accessible via direct URL but hidden from the sidebar (e.g., for LLMs.txt or utility pages):

1. **Prefix the template filename with underscore:**

   ```bash
   src/pages/templates/_LLMs.mdx
   ```

2. **Generate docs:**

   ```bash
   npm run generate:docs
   ```

   This creates files like `docs/main/typescript/_LLMs.mdx` which Docusaurus excludes from autogenerated sidebars.

3. **Access the page directly:**
   - URL: `/teams-ai/typescript/_LLMs`
   - Not visible in sidebar navigation
   - Still searchable and linkable

### Development Workflow

When running `npm start`, two processes run concurrently:

1. **Doc generator in watch mode** - Regenerates files when templates change
2. **Docusaurus dev server** - Serves the documentation with hot reload

Edit your templates and fragments, and changes will appear automatically.

### Handling Missing Content

**Scenario 1: Section not applicable for a language**

```markdown
<!-- install -->

N/A
```

Result: Section silently skipped (nothing rendered)

**Scenario 2: Section not written yet**

```markdown
<!-- install -->

npm install example

<!-- usage -->

(no "advanced" section)
```

Result (in dev mode): "[Dev] Section 'advanced' not found in TypeScript documentation"

**Scenario 3: Fragment file doesn't exist**
Result (in dev mode): "[Dev] Documentation file for TypeScript not found: src/components/include/my-guide/typescript.incl.md"

**Production behavior:** Error messages are hidden; only valid content is shown.

## Directory Structure

**Important:** Fragment files are organized by **page name**, with each page having a folder containing one `{lang}.incl.md` file per language.

```
teams.md/
├── src/
│   ├── pages/
│   │   └── templates/              # Templates (source of truth)
│   │       ├── getting-started/
│   │       │   ├── quickstart.mdx
│   │       │   ├── code-basics.mdx
│   │       │   ├── running-in-teams/
│   │       │   │   ├── deployment-guide.mdx
│   │       │   │   ├── running-in-teams.mdx
│   │       │   │   └── _category_.json    # Category file alongside templates
│   │       │   └── _category_.json        # Category file for getting-started
│   │       └── essentials/
│   │           ├── api.mdx
│   │           └── _category_.json        # Category file for essentials
│   ├── components/
│   │   ├── Language.tsx            # Runtime component
│   │   └── include/                # Language-specific fragments (organized by page)
│   │       ├── getting-started/
│   │       │   ├── quickstart/     # One folder per page
│   │       │   │   ├── typescript.incl.md
│   │       │   │   ├── csharp.incl.md
│   │       │   │   └── python.incl.md
│   │       │   └── code-basics/
│   │       │       ├── typescript.incl.md
│   │       │       ├── csharp.incl.md
│   │       │       └── python.incl.md
│   │       └── essentials/
│   │           └── api/
│   │               ├── typescript.incl.md
│   │               ├── csharp.incl.md
│   │               └── python.incl.md
│   └── plugins/
│       └── language-include-plugin.ts
├── docs/
│   └── main/
│       ├── typescript/     # Auto-generated files (DO NOT EDIT)
│       │   ├── getting-started/
│       │   │   ├── quickstart.mdx
│       │   │   └── code-basics.mdx
│       │   └── essentials/
│       │       └── api.mdx
│       ├── csharp/     # Auto-generated files (DO NOT EDIT)
│       │   ├── getting-started/
│       │   │   ├── quickstart.mdx
│       │   │   └── code-basics.mdx
│       │   └── essentials/
│       │       └── api.mdx
│       └── python/     # Auto-generated files (DO NOT EDIT)
│           ├── getting-started/
│           │   ├── quickstart.mdx
│           │   └── code-basics.mdx
│           └── essentials/
│               └── api.mdx
└── scripts/
    └── generate-language-docs.ts
```

## Best Practices

1. **Never edit files in `docs/main/{lang}/`** - They are auto-generated and will be overwritten
2. **Keep section names consistent** across all three fragment files
3. **Use meaningful section names** - They should describe the content (e.g., "installation", "usage", "configuration")
4. **Use `N/A` explicitly** when a section doesn't apply to a language
5. **Test all three languages** before committing
6. **Keep common content in templates** - Only put language-specific differences in fragments
7. **Use block-level tags for complex content** - Code blocks, lists, admonitions require block-level placement
8. **Use inline tags for simple text** - Package names, short commands, version numbers work well inline
9. **Prefix utility pages with underscore** - Use `_filename.mdx` for pages that shouldn't appear in sidebar
10. **Place category files with templates** - Keep `_category_.json` files in the same directory as their corresponding templates for easier maintenance
11. **Avoid file extensions in links** - Use `./my-page` instead of `./my-page.mdx` for Docusaurus compatibility
