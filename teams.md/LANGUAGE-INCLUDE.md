# Language-Specific Documentation System

This documentation system allows you to maintain a single source of truth for content that needs to appear across multiple programming languages (TypeScript, C#, Python), while supporting language-specific fragments within pages.

## Architecture Overview

```
src/pages/templates/    ← Templates with <LanguageInclude /> tags
     ↓ (generate-language-docs.ts - BUILD TIME PROCESSING)
src/components/include/ ← Language include files ({lang}.incl.md) with language-specific content
     ↓ (Processed and embedded during generation)
docs/main/{lang}/      ← Auto-generated files (fully resolved)
     ↓ (Docusaurus build)
Final rendered page    ← Shows only content for current language
```

## Components

### 1. Template Files (`src/pages/templates/*.mdx`)

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
```

**Usage Notes:**

- **Block-level**: Content is parsed as Markdown/MDX with full formatting support
- **Inline** (within text): Content is inserted as plain text (no Markdown parsing)
- **Frontmatter limitations**: LanguageInclude tags cannot be used within frontmatter (summary, title, etc.) - these must be language-agnostic or handled through separate template files
- Template files are NOT served directly - they generate files in `docs/main/{lang}/`

### 2. Fragment/Include Files (`src/components/include/**/{lang}.incl.md`)

These contain language-specific content organized by sections using HTML comments.

**Directory Structure:**

- **Category pages (README.mdx)**: `src/components/include/{category}/{lang}.incl.md`
- **Regular pages**: `src/components/include/{category}/{filename}/{lang}.incl.md`

**Example:** `src/components/include/getting-started/quickstart/typescript.incl.md`

````markdown
<!-- install -->

```bash
npm install @microsoft/teams-ai
```

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

**Section Rules:**

- `<!-- sectionName -->` marks the start of a section
- Content continues until the next section marker or end of file
- Use `N/A` or `not applicable` (case-insensitive) to intentionally skip a section
- Full Markdown/MDX supported for block sections (code blocks, lists, admonitions `:::info`)

### 3. Generation Script (`scripts/generate-language-docs.ts`)

Processes templates at build time and generates language-specific files.

**Commands:**

```bash
npm run generate:docs        # Generate all docs once
npm run generate:docs:watch  # Watch for changes
npm start                    # Full development with auto-regeneration
npm run start:simple         # Start Docusaurus without auto-generation
npm run build                # Build with automatic doc generation
```

**What it does:**

- Cleans up stale files in `docs/main/{lang}/`
- Processes `<LanguageInclude section="..." />` tags
- Extracts sections from `.incl.md` files using HTML comment markers
- Converts `README.mdx` templates to `index.mdx` (category pages)
- Copies `_category_.json` files to all language directories
- Adds auto-generation warning headers
- **Development mode**: Shows helpful error messages for missing content
- **Production mode**: Generates clean files without Language components (67% smaller)

### 4. Language Component (`src/components/Language.tsx`)

React component that conditionally renders content based on URL path. Uses `useLocation` to check if current path contains `/{language}/` and only renders matching content.

### 5. Language Constants (`src/constants/languages.ts`)

Single source of truth for language configuration:

```typescript
export const LANGUAGES = ['typescript', 'csharp', 'python'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES = { typescript: 'TypeScript', csharp: 'C#', python: 'Python' };
export const DEFAULT_LANGUAGE: Language = 'typescript';
```

## Workflow

### Creating New Documentation

1. **Create template** in `src/pages/templates/`:

   ```mdx
   ---
   title: My Guide
   ---

   # My Guide

   Common intro text.

   <LanguageInclude section="example" />
   ```

2. **Create fragment files**:

   ```bash
   mkdir -p src/components/include/my-guide
   # Add {lang}.incl.md files with sections
   ```

3. **Generate and start**:
   ```bash
   npm run generate:docs
   npm start
   ```

### Special Page Types

**Category Pages (README.mdx):**

- Template: `src/pages/templates/getting-started/README.mdx`
- Includes: `src/components/include/getting-started/{lang}.incl.md`
- Generates: `docs/main/{lang}/getting-started/index.mdx`

**Hidden Pages:**

- Template: `src/pages/templates/_LLMs.mdx` (prefix with underscore)
- Result: Accessible via URL but hidden from sidebar

**Regular Pages:**

- Template: `src/pages/templates/getting-started/quickstart.mdx`
- Includes: `src/components/include/getting-started/quickstart/{lang}.incl.md`

### Error Handling

- **Missing file**: Console warning with path
- **Missing section**: Console warning with section and language
- **N/A sections**: Silently skipped
- **Development**: Error messages visible in browser
- **Production**: Clean files without error content

## Directory Structure Example

```
src/pages/templates/
├── getting-started/
│   ├── README.mdx              # → index.mdx (category page)
│   ├── quickstart.mdx
│   └── _category_.json
└── essentials/
    └── api.mdx

src/components/include/
├── getting-started/            # For README.mdx
│   ├── typescript.incl.md
│   ├── csharp.incl.md
│   └── python.incl.md
├── quickstart/                 # For quickstart.mdx
│   ├── typescript.incl.md
│   ├── csharp.incl.md
│   └── python.incl.md
└── essentials/
    └── api/                    # For api.mdx
        ├── typescript.incl.md
        ├── csharp.incl.md
        └── python.incl.md

docs/main/{lang}/               # Auto-generated (DO NOT EDIT)
├── getting-started/
│   ├── index.mdx              # From README.mdx
│   └── quickstart.mdx
└── essentials/
    └── api.mdx
```

## Best Practices

1. **Never edit `docs/main/{lang}/` files** - they're auto-generated
2. **Keep section names consistent** across all fragment files
3. **Use `N/A` explicitly** in `*.incl.md` when equivalent section doesn't apply to a language
4. **Test all languages** before committing
5. **Use block-level tags for markdown content in `*.incl.md`** (code blocks, admonitions)
6. **Use inline tags for simple text** (package names, commands)
7. **Add `sidebar_label`** to frontmatter for proper capitalization
8. **Prefix utility pages with underscore** to hide from sidebar
9. **Place `_category_.json` with templates** for easier maintenance
10. **Use correct relative URLs**: No `.md` or `.mdx` extensions, relative to **generated file location**; no cross-language links

## Migrating Existing Documentation

1. **Analyze differences** between language versions
2. **Extract common content** → template
3. **Extract language-specific content** → include files
4. **Create template and includes** following directory structure
5. **Generate and test** all languages
6. **Remove old files** from `docs/{lang}/`

## Troubleshooting

**Translation Key Conflicts**: The generation script automatically adds unique keys to category files. Regenerate with `npm run generate:docs` if needed.

**Missing Sidebar Labels**: Add `sidebar_label: "Proper Name"` to template frontmatter.
