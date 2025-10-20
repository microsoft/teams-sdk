import * as fs from 'fs';
import * as path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import type { Root, RootContent, Paragraph, Text } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import { LANGUAGES, LANGUAGE_NAMES } from '../constants/languages';

// For sections in an *.mdx file that is applicable to one or two languages, but not all three.
// This is an intentional way of differentiating from missing sections in documentation that haven't been written yet.
const NOT_APPLICABLE_REGEX = /^(not applicable|n\/a)\s*$/i;

// Notation in *.incl.md files for sections to be added into the *.mdx
const SECTION_REGEX = (sectionName: string) =>
  new RegExp(`<!--\\s*${sectionName}\\s*-->\\s*([\\s\\S]*?)(?=<!--\\s*[\\w-]+\\s*-->|$)`, 'i');

interface PluginOptions {
  pagesRoot: string;
  languages?: string[];
}

// Interface for MDX ESM import nodes
interface MdxjsEsm {
  type: 'mdxjsEsm';
  value: string;
  data?: any;
}

// Type helpers for MDX JSX children - compatible with the MDX AST
type MdxJsxFlowChild = MdxJsxFlowElement['children'][number];
type MdxJsxTextChild = MdxJsxTextElement['children'][number];

// Helper function to create MdxJsxAttribute objects
function createMdxJsxAttribute(name: string, value: string): MdxJsxAttribute {
  return { type: 'mdxJsxAttribute', name, value };
}

// Type guard for checking if a value is a valid language key
function isValidLanguageKey(lang: string): lang is keyof typeof LANGUAGE_NAMES {
  return lang in LANGUAGE_NAMES;
}

// Type guard for MdxjsEsm nodes
function isMdxjsEsm(node: RootContent): node is MdxjsEsm {
  return node.type === 'mdxjsEsm';
}

// Helper function to safely cast AST children to MDX children
function toMdxFlowChildren(children: RootContent[]): MdxJsxFlowChild[] {
  // RootContent and MDX flow children have compatible structures
  return children as unknown as MdxJsxFlowChild[];
}

function toMdxTextChildren(children: Text[]): MdxJsxTextChild[] {
  // This is a safe cast for text-only children
  return children as unknown as MdxJsxTextChild[];
}

/**
 * Convert admonition syntax (:::info) to JSX elements
 * This runs on the parsed AST to transform paragraph nodes containing ::: into admonition components
 */
function convertAdmonitions(tree: Root): Root {
  const newChildren: RootContent[] = [];
  let i = 0;

  while (i < tree.children.length) {
    const node = tree.children[i];

    // Check if this is a paragraph starting with :::
    if (node.type === 'paragraph' && node.children && node.children[0]) {
      const firstChild = node.children[0];
      if (firstChild.type === 'text' && firstChild.value.startsWith(':::')) {
        // This is the start of an admonition
        const match = firstChild.value.match(/^:::(\w+)\s*/);
        if (match) {
          const admonitionType = match[1];
          const remainingText = firstChild.value.slice(match[0].length);

          // Collect all nodes until we find :::
          const admonitionChildren: RootContent[] = [];
          if (remainingText) {
            const paragraph: Paragraph = {
              type: 'paragraph',
              children: [{ type: 'text', value: remainingText }],
            };
            admonitionChildren.push(paragraph);
          }

          i++;
          while (i < tree.children.length) {
            const currentNode = tree.children[i];

            // Check if this node contains ::: (check both first and last child)
            if (currentNode.type === 'paragraph' && currentNode.children) {
              // Check first child (for closing ::: at start of line)
              const firstChild = currentNode.children[0];
              if (
                firstChild &&
                firstChild.type === 'text' &&
                firstChild.value.trim().startsWith(':::')
              ) {
                // If there's content after :::, extract it
                const afterEnd = firstChild.value.split(':::')[1];
                if (afterEnd && afterEnd.trim()) {
                  const paragraph: Paragraph = {
                    type: 'paragraph',
                    children: [{ type: 'text', value: afterEnd.trim() }],
                  };
                  admonitionChildren.push(paragraph);
                }
                i++;
                break;
              }

              // Check last child (for closing ::: at end of line)
              const lastChild = currentNode.children[currentNode.children.length - 1];
              if (lastChild && lastChild.type === 'text' && lastChild.value.includes(':::')) {
                // Add content before ::: if any
                const beforeEnd = lastChild.value.split(':::')[0].trim();
                if (beforeEnd) {
                  const paragraph: Paragraph = {
                    type: 'paragraph',
                    children: [{ type: 'text', value: beforeEnd }],
                  };
                  admonitionChildren.push(paragraph);
                }
                i++;
                break;
              }
            }

            admonitionChildren.push(currentNode);
            i++;
          }

          // Create the admonition JSX element
          const admonitionElement: MdxJsxFlowElement = {
            type: 'mdxJsxFlowElement',
            name: 'admonition',
            attributes: [
              createMdxJsxAttribute('type', admonitionType),
            ],
            children: toMdxFlowChildren(admonitionChildren),
          };
          newChildren.push(admonitionElement);
          continue;
        }
      }
    }

    newChildren.push(node);
    i++;
  }

  tree.children = newChildren;
  return tree;
}

/** Extract section of content from markdown with <!-- ${sectionName} --> markers */
function extractSection(markdown: string, sectionName: string): string | null {
  if (!markdown) {
    return '';
  }

  const match = markdown.match(SECTION_REGEX(sectionName));

  // Section not found
  if (!match) {
    return null;
  }

  const content = match[1].trim();

  // Content not applicable
  if (NOT_APPLICABLE_REGEX.test(content)) {
    return '';
  }

  return content;
}

/**
 * Remark plugin that replaces <LanguageInclude sectionName="" /> with markdown fragments
 * Fragments exist in src/components/include/**\/*.incl.md files
 */
export default function languageInclude(options: PluginOptions = { pagesRoot: '' }) {
  const { pagesRoot, languages = LANGUAGES } = options;

  if (!pagesRoot) {
    throw new Error('languages-include-plugin: pagesRoot is required');
  }

  // Parser that supports Markdown and MDX
  const parser = unified().use(remarkParse).use(remarkMdx);

  // Cache for fragment file contents to avoid re-reading files
  const fileCache = new Map<string, string>();

  const isProduction = process.env.NODE_ENV === 'production';

  return function transformer(tree: Root, vfile: VFile) {
    let hasLanguageInclude = false;

    // Shared function to process LanguageInclude nodes (both block and inline)
    const processLanguageInclude = (
      node: MdxJsxFlowElement | MdxJsxTextElement,
      index: number | null,
      parent: { children: RootContent[] } | null,
      isInline = false
    ) => {
      if (node.name !== 'LanguageInclude') {
        return;
      }

      hasLanguageInclude = true;

      const sectionAttr = node.attributes?.find(
        (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === 'section'
      );

      if (!sectionAttr) {
        console.warn(`LanguageInclude: missing section attribute in ${vfile.path}`);
        return;
      }

      // Type guard ensures value is string (MDX attributes can be strings, expressions, or null)
      const section = typeof sectionAttr.value === 'string' ? sectionAttr.value : '';
      if (!section) {
        console.warn(`LanguageInclude: invalid section attribute value in ${vfile.path}`);
        return;
      }

      // Get page name from file being processed
      const fileName = path.basename(vfile.path!, path.extname(vfile.path!));

      const languageChildren: (MdxJsxFlowElement | MdxJsxTextElement)[] = [];

      const currentFilePath = vfile.path!;
      const detectedLanguage = languages.find((lang) =>
        currentFilePath.includes(`/docs/main/${lang}`)
      );

      if (!detectedLanguage) {
        console.warn(`Could not detect language for file: ${currentFilePath}`);
        return;
      }

      const docsMainLangDir = path.join(__dirname, '..', '..', 'docs', 'main', detectedLanguage);
      const relativePath = path.relative(docsMainLangDir, path.dirname(vfile.path!));

      // Process each language
      for (const lang of languages) {
        // Structure: include/{relativePath}/{fileName}/{lang}.incl.md
        const inclPath = path.join(pagesRoot, relativePath, fileName, `${lang}.incl.md`);

        let sectionContent: string | null = null;

        if (!fs.existsSync(inclPath)) {
          // File doesn't exist - only show error in development
          if (!isProduction) {
            let errorElement: MdxJsxFlowElement | MdxJsxTextElement;
            if (isInline) {
              errorElement = {
                type: 'mdxJsxTextElement',
                name: 'Language',
                attributes: [createMdxJsxAttribute('language', lang)],
                children: toMdxTextChildren([
                  {
                    type: 'text',
                    value: `[Dev] Documentation file for ${isValidLanguageKey(lang) ? LANGUAGE_NAMES[lang] : lang} not found: ${path.relative(process.cwd(), inclPath)}`,
                  },
                ]),
              };
            } else {
              errorElement = {
                type: 'mdxJsxFlowElement',
                name: 'Language',
                attributes: [createMdxJsxAttribute('language', lang)],
                children: toMdxFlowChildren([
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        value: `[Dev] Documentation file for ${isValidLanguageKey(lang) ? LANGUAGE_NAMES[lang] : lang} not found: ${path.relative(process.cwd(), inclPath)}`,
                      },
                    ],
                  },
                ]),
              };
            }
            languageChildren.push(errorElement);
          }
          continue;
        }

        // Read file from cache or filesystem
        let fileContent: string;
        if (fileCache.has(inclPath)) {
          fileContent = fileCache.get(inclPath)!;
        } else {
          fileContent = fs.readFileSync(inclPath, 'utf8');
          fileCache.set(inclPath, fileContent);
        }

        sectionContent = extractSection(fileContent, section);

        if (sectionContent === null) {
          // Section not found in file - only show error in development
          if (!isProduction) {
            let errorElement: MdxJsxFlowElement | MdxJsxTextElement;
            if (isInline) {
              errorElement = {
                type: 'mdxJsxTextElement',
                name: 'Language',
                attributes: [createMdxJsxAttribute('language', lang)],
                children: toMdxTextChildren([
                  {
                    type: 'text',
                    value: `[Dev] Section "${section}" not found in ${isValidLanguageKey(lang) ? LANGUAGE_NAMES[lang] : lang} documentation`,
                  },
                ]),
              };
            } else {
              errorElement = {
                type: 'mdxJsxFlowElement',
                name: 'Language',
                attributes: [createMdxJsxAttribute('language', lang)],
                children: toMdxFlowChildren([
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        value: `[Dev] Section "${section}" not found in ${isValidLanguageKey(lang) ? LANGUAGE_NAMES[lang] : lang} documentation`,
                      },
                    ],
                  },
                ]),
              };
            }
            languageChildren.push(errorElement);
          }
          continue;
        }

        if (sectionContent === '') {
          // N/A section - intentionally skip any rendering
          continue;
        }

        // For inline elements, just use the text content directly
        if (isInline) {
          const inlineElement: MdxJsxTextElement = {
            type: 'mdxJsxTextElement',
            name: 'Language',
            attributes: [
              createMdxJsxAttribute('language', lang),
            ],
            children: toMdxTextChildren([
              {
                type: 'text',
                value: sectionContent,
              },
            ]),
          };
          languageChildren.push(inlineElement);
        } else {
          // For block elements, parse the markdown
          const content = parser.parse(sectionContent);

          // Convert any admonitions (:::info) to JSX elements
          convertAdmonitions(content);

          const blockElement: MdxJsxFlowElement = {
            type: 'mdxJsxFlowElement',
            name: 'Language',
            attributes: [
              createMdxJsxAttribute('language', lang),
            ],
            children: toMdxFlowChildren(content.children),
          };
          languageChildren.push(blockElement);
        }
      }

      // Replace the LanguageInclude node with the Language components
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1, ...languageChildren);
      }
    };

    // Find all block-level <LanguageInclude /> nodes
    visit(
      tree,
      'mdxJsxFlowElement',
      (node: MdxJsxFlowElement, index: number | null, parent: { children: RootContent[] } | null) =>
        processLanguageInclude(node, index, parent, false)
    );

    // Find all inline <LanguageInclude /> nodes
    visit(
      tree,
      'mdxJsxTextElement',
      (node: MdxJsxTextElement, index: number | null, parent: { children: RootContent[] } | null) =>
        processLanguageInclude(node, index, parent, true)
    );

    // Add Language component import if we found any LanguageInclude nodes
    if (hasLanguageInclude) {
      const hasLanguageImport = tree.children.some(
        (node: RootContent) =>
          isMdxjsEsm(node) &&
          node.value?.includes("from '@site/src/components/Language'")
      );

      if (!hasLanguageImport) {
        // Find the position after frontmatter (frontmatter is always first if it exists)
        let insertIndex = 0;
        if (tree.children[0]?.type === 'yaml') {
          insertIndex = 1; // Insert after frontmatter
        }

        // Add import after frontmatter
        const importNode: MdxjsEsm = {
          type: 'mdxjsEsm',
          value: "import Language from '@site/src/components/Language';",
          data: {
            estree: {
              type: 'Program',
              sourceType: 'module',
              body: [
                {
                  type: 'ImportDeclaration',
                  specifiers: [
                    {
                      type: 'ImportDefaultSpecifier',
                      local: { type: 'Identifier', name: 'Language' },
                    },
                  ],
                  source: {
                    type: 'Literal',
                    value: '@site/src/components/Language',
                    raw: "'@site/src/components/Language'",
                  },
                },
              ],
            },
          },
        };

        tree.children.splice(insertIndex, 0, importNode);
      }
    }
  };
}
