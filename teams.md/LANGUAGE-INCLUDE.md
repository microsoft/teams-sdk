# Language-Specific Documentation System

This documentation system maintains a single source of truth for content across multiple programming languages (TypeScript, C#, Python), with language-specific fragments embedded within shared templates.

## Quick Start

1. **Create template**: `src/pages/templates/my-guide.mdx` with `<LanguageInclude section="example" />` tags
2. **Create fragments**: `src/components/include/my-guide/{lang}.incl.md` with `<!-- example -->` sections
3. **Generate**: `npm run generate:docs` or `npm start`

## Architecture

```
src/pages/templates/    ← Templates with <LanguageInclude /> tags
     ↓ (generate-language-docs.ts)
src/components/include/ ← Language-specific fragments ({lang}.incl.md)
     ↓ (Build-time processing)
docs/main/{lang}/      ← Auto-generated files (fully resolved)
     ↓ (Docusaurus)
Final rendered page    ← Language-specific content only
```

## Core Concepts

### Templates (`src/pages/templates/*.mdx`)

Your source of truth - write common content once with `<LanguageInclude />` placeholders:

```mdx
---
title: Getting Started
languages: ['typescript', 'python'] # Optional: restrict languages to render documentation for
---

# Getting Started

Shared content for all languages.

<LanguageInclude section="install" />  <!-- Block-level: full Markdown -->

The package name is <LanguageInclude section="package-name" />. <!-- Inline: plain text -->
```

### Fragments (`src/components/include/**/{lang}.incl.md`)

Language-specific content organized by HTML comment sections:

````markdown
<!-- install -->

```bash
npm install @microsoft/teams-ai
```

<!-- package-name -->

@microsoft/teams-ai

<!-- advanced -->

N/A
````

**Fragment Rules:**

- `<!-- sectionName -->` marks section start
- Content continues until next section or file end
- Use `N/A` to intentionally skip sections (e.g., when a section is necessary for one or two languages, but not all three)
- Full Markdown/MDX supported for block-level content

**Directory Mapping:**

- Category pages: `src/components/include/{category}/{lang}.incl.md`
- Regular pages: `src/components/include/{category}/{filename}/{lang}.incl.md`

## Commands

```bash
npm run generate:docs        # Generate once
npm run generate:docs:watch  # Watch mode
npm start                    # Full development
npm run start:simple         # Docusaurus only
npm run build                # Production build
```

## Language Filtering

Control which languages generate pages using frontmatter:

```mdx
---
title: TypeScript-only Feature
languages: ['typescript'] # Restrict rendering to specific languages. If all languages are supported, omit this field.
suppressLanguageIncludeWarning: true # Suppress warnings for static content
---
```

Useful for:

- Language-specific features
- Migration periods
- Framework-specific documentation

## Page Types

- **Category pages**: `README.mdx` → `index.mdx`
- **Regular pages**: `filename.mdx` → `filename.mdx`
- **Hidden pages**: `_filename.mdx` (accessible but hidden from sidebar)

## Directory Structure

```
src/pages/templates/
├── getting-started/
│   ├── README.mdx              # → index.mdx
│   ├── quickstart.mdx
│   └── _category_.json

src/components/include/
├── getting-started/            # For README.mdx
│   ├── typescript.incl.md
│   ├── csharp.incl.md
│   └── python.incl.md
└── getting-started/
    └── quickstart/             # For quickstart.mdx
        ├── typescript.incl.md
        ├── csharp.incl.md
        └── python.incl.md

docs/main/{lang}/               # Auto-generated (DO NOT EDIT)
├── getting-started/
│   ├── index.mdx
│   └── quickstart.mdx
```

## Workflow

1. **Create template**: `src/pages/templates/my-guide.mdx`
2. **Create fragments**: `src/components/include/my-guide/{lang}.incl.md`
3. **Generate**: `npm run generate:docs` and `npm start`

## Error Handling

- **Missing files/sections**: Console warnings (unless language-restricted)
- **N/A sections**: Silently skipped
- **Development**: Error messages in browser
- **Production**: Clean files without error content
- **Page availability**: Tracked in `static/missing-pages.json`

## Best Practices

1. **Never edit `docs/main/{lang}/` files** - they're auto-generated
2. **Use `languages: ['lang1', 'lang2']` frontmatter** for language-specific pages
3. **Add `suppressLanguageIncludeWarning: true`** for static content pages
4. **Keep section names consistent** across all fragment files
5. **Use `N/A` explicitly** when a section doesn't apply to a language
6. **Test all supported languages** before committing
7. **Use block-level tags for rich content**, inline tags for simple text
8. **Add `sidebar_label`** to frontmatter for proper capitalization
9. **Prefix utility pages with underscore** to hide from sidebar
10. **Use correct relative URLs** (no extensions, relative to generated location)
11. **Check `missing-pages.json`** after generation to verify restrictions

## Migration Guide

1. **Analyze differences** between existing language versions
2. **Extract common content** → template file
3. **Extract language-specific content** → include files
4. **Create template and includes** following directory structure
5. **Generate and test** all languages
6. **Remove old files** from `docs/{lang}/`

## Troubleshooting

- **Translation conflicts**: Regenerate with `npm run generate:docs`
- **Missing sidebar labels**: Add `sidebar_label: "Name"` to frontmatter
- **Language dropdown issues**: Ensure `missing-pages.json` exists
- **Banner not dismissing**: Check browser console for errors
- **Unexpected warnings**: Add `suppressLanguageIncludeWarning: true`
