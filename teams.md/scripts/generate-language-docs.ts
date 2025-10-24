#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { LANGUAGES, Language, LANGUAGE_NAMES } from '../src/constants/languages';

const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'pages', 'templates');
const FRAGMENTS_DIR = path.join(__dirname, '..', 'src', 'components', 'include');

const DOCS_BASE = path.join(__dirname, '..', 'docs', 'main');

// For sections in an *.mdx file that is applicable to one or two languages, but not all three.
// This is an intentional way of differentiating from missing sections in documentation that haven't been written yet.
const NOT_APPLICABLE_REGEX = /^(not applicable|n\/a)\s*$/i;

// Notation in *.incl.md files for sections to be added into the *.mdx
const SECTION_REGEX = (sectionName: string) =>
  new RegExp(`<!--\\s*${sectionName}\\s*-->\\s*([\\s\\S]*?)(?=<!--\\s*[\\w-]+\\s*-->|$)`, 'i');

// Regex to find LanguageInclude tags
const LANGUAGE_INCLUDE_REGEX = /<LanguageInclude\s+section="([^"]+)"\s*\/>/g;

/**
 * Extract a section from markdown content using HTML comment markers
 */
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
 * Process LanguageInclude tags in template content and replace with Language components or raw content
 * - Production mode + target language: generates clean files with only raw content for that language
 * - Development mode: generates Language components with helpful error messages for missing content
 */
function processLanguageIncludeTags(templateContent: string, templatePath: string, targetLanguage?: Language): string {
  const relativePath = path.relative(TEMPLATES_DIR, templatePath);
  const fileName = path.basename(templatePath, '.mdx');
  const dirPath = path.dirname(relativePath);

  let processedContent = templateContent;
  let hasLanguageInclude = false;

  const isProduction = process.env.NODE_ENV === 'production';

  // Replace all LanguageInclude tags
  processedContent = processedContent.replace(LANGUAGE_INCLUDE_REGEX, (match, sectionName, offset) => {
    hasLanguageInclude = true;

    // Determine if this is inline or block based on context
    const beforeMatch = templateContent.substring(0, offset);

    // Check if the tag is at the start of a line or after only whitespace (block)
    // vs. if it's within text content (inline)
    const lineStart = beforeMatch.lastIndexOf('\n');
    const textBeforeOnLine = beforeMatch.substring(lineStart + 1);
    const isBlock = /^\s*$/.test(textBeforeOnLine);

    // Production mode with target language: only generate for that language
    if (isProduction && targetLanguage) {
      // Determine include file path
      const inclPath = (fileName === 'index' || fileName === 'README')
        ? path.join(FRAGMENTS_DIR, dirPath, `${targetLanguage}.incl.md`)
        : path.join(FRAGMENTS_DIR, dirPath, fileName, `${targetLanguage}.incl.md`);

      if (!fs.existsSync(inclPath)) {
        // Skip missing content (prod)
        return '';
      }

      try {
        const fileContent = fs.readFileSync(inclPath, 'utf8');
        const sectionContent = extractSection(fileContent, sectionName);

        if (sectionContent === null || sectionContent === '') {
          // Skip missing sections (null) or intentional N/A content (empty string)
          return '';
        }

        return isBlock ? `${sectionContent}` : sectionContent;
      } catch (error) {
        console.warn(`generate-language-docs warning: Error reading ${inclPath}: ${error}`);
        return '';
      }
    }

    // Development mode or no target language: generate Language components for all languages
    // This allows dev-time rendering of messages indicating what include sections are missing.
    const languageComponents: string[] = [];
    const languagesToProcess = targetLanguage ? [targetLanguage] : LANGUAGES;

    for (const lang of languagesToProcess) {
      // Determine include file path
      const inclPath = (fileName === 'index' || fileName === 'README')
        ? path.join(FRAGMENTS_DIR, dirPath, `${lang}.incl.md`)
        : path.join(FRAGMENTS_DIR, dirPath, fileName, `${lang}.incl.md`);

      let sectionContent: string | null = null;

      if (!fs.existsSync(inclPath)) {
        // File doesn't exist - show error in development, skip in production
        if (!isProduction) {
          const errorMsg = `[DevMode] Documentation file for ${LANGUAGE_NAMES[lang]} not found: ${path.relative(process.cwd(), inclPath)}`;
          if (isBlock) {
            languageComponents.push(
              `<Language language="${lang}">\n\n${errorMsg}\n\n</Language>`
            );
          } else {
            languageComponents.push(`<Language language="${lang}">${errorMsg}</Language>`);
          }
        }
        continue;
      }

      try {
        const fileContent = fs.readFileSync(inclPath, 'utf8');
        sectionContent = extractSection(fileContent, sectionName);

        if (sectionContent === null) {
          // Section not found - show error in development, skip in production
          if (!isProduction) {
            const errorMsg = `[Dev] Section "${sectionName}" not found in ${LANGUAGE_NAMES[lang]} documentation`;
            if (isBlock) {
              languageComponents.push(
                `<Language language="${lang}">\n\n${errorMsg}\n\n</Language>`
              );
            } else {
              languageComponents.push(`<Language language="${lang}">${errorMsg}</Language>`);
            }
          }
          continue;
        }

        if (sectionContent === '') {
          // N/A section - intentionally skip any rendering
          continue;
        }

        // Valid content found
        if (isBlock) {
          // Block-level: full Language component with markdown processing
          languageComponents.push(
            `<Language language="${lang}">\n\n${sectionContent}\n\n</Language>`
          );
        } else {
          // Inline: single Language component with just the text content
          languageComponents.push(`<Language language="${lang}">${sectionContent}</Language>`);
        }
      } catch (error) {
        console.warn(`    Warning: Error reading ${inclPath}: ${error}`);
        // Generate error component in development
        if (!isProduction) {
          const errorMsg = `[Dev] Error reading file: ${error}`;
          if (isBlock) {
            languageComponents.push(
              `<Language language="${lang}">\n\n${errorMsg}\n\n</Language>`
            );
          } else {
            languageComponents.push(`<Language language="${lang}">${errorMsg}</Language>`);
          }
        }
      }
    }

    // Return joined Language components (or empty string if no components added)
    if (isBlock) {
      // Block: Each language on separate lines
      return languageComponents.join('\n\n');
    } else {
      // Inline: Return all language components without line breaks to preserve list structure
      return languageComponents.join('');
    }
  });

  // Add Language component import if we processed any LanguageInclude tags and need Language components
  const needsLanguageImport = hasLanguageInclude &&
    (!isProduction || !targetLanguage) &&
    !processedContent.includes("import Language from '@site/src/components/Language'");

  if (needsLanguageImport) {
    // Find where to insert the import (after frontmatter if it exists)
    const frontmatterMatch = processedContent.match(/^---\n[\s\S]*?\n---\n/);
    const insertPosition = frontmatterMatch ? frontmatterMatch[0].length : 0;

    const importStatement = "import Language from '@site/src/components/Language';\n\n";
    processedContent = processedContent.slice(0, insertPosition) + importStatement + processedContent.slice(insertPosition);
  }

  return processedContent;
}

/**
 * Clean up stale generated files before regeneration
 * Removes all .mdx files from docs/main/{lang}/ directories
 */
function cleanGeneratedFiles(): void {
  console.log('Cleaning up stale generated files...');

  let deletedCount = 0;

  for (const lang of LANGUAGES) {
    const langDir = path.join(DOCS_BASE, lang);

    if (!fs.existsSync(langDir)) {
      continue;
    }

    // Also remove root-level category file for this language
    const rootCategoryPath = path.join(langDir, '_category_.json');
    if (fs.existsSync(rootCategoryPath)) {
      fs.unlinkSync(rootCategoryPath);
      deletedCount++;
    }

    // Recursively find and delete all .mdx and _category_.json files
    function deleteInDirectory(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          deleteInDirectory(fullPath);
          // Remove empty directories
          try {
            fs.rmdirSync(fullPath);
          } catch (e) {
            // Directory not empty and will be cleaned up later
          }
        } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
          fs.unlinkSync(fullPath);
          deletedCount++;
        } else if (entry.isFile() && entry.name === '_category_.json') {
          // Delete all category files - they will be regenerated from templates
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      }
    }

    deleteInDirectory(langDir);
  }

  if (deletedCount === 0) {
    console.log('No files to clean');
  } else {
    console.log(`  Cleaned up ${deletedCount} file(s)`);
  }
}

/**
 * Clean up generated files for a specific template
 * Removes the generated .mdx files for all languages
 */
function cleanGeneratedFilesForTemplate(templatePath: string): void {
  const relativePath = path.relative(TEMPLATES_DIR, templatePath);
  const templateName = path.basename(templatePath);

  for (const lang of LANGUAGES) {
    const outputDir = path.join(DOCS_BASE, lang, path.dirname(relativePath));
    // Handle both README.mdx -> index.mdx conversion and regular files
    const outputFileName = templateName === 'README.mdx' ? 'index.mdx' : templateName;
    const outputPath = path.join(outputDir, outputFileName);

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`  Removed: docs/main/${lang}/${path.dirname(relativePath)}/${outputFileName}`);
    }
  }
}

/**
 * Generate language-specific doc files from templates
 * Templates in src/components/ (with nested dirs) are copied to docs/main/{lang}/
 * Preserves directory structure and processes LanguageInclude tags
 */
function generateDocsForTemplate(templatePath: string): void {
  // Calculate relative path from TEMPLATES_DIR to preserve nested structure
  const relativePath = path.relative(TEMPLATES_DIR, templatePath);
  const templateName = path.basename(templatePath);

  // Read template content
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Validate template contained LanguageInclude tags
  if (!templateContent.includes('<LanguageInclude')) {
    console.warn(`\nWarning: Template "${relativePath}" does not contain <LanguageInclude /> tags.`);
    console.warn(`  If the file is intended to be identical for all languages, ignore this warning.`);
  }

  for (const lang of LANGUAGES) {
    const processedContent = processLanguageIncludeTags(templateContent, templatePath, lang);

    // Extract frontmatter if exists
    const frontmatterMatch = processedContent.match(/^---\n([\s\S]*?)\n---\n/);
    let frontmatter = '';
    let content = processedContent;

    if (frontmatterMatch) {
      frontmatter = frontmatterMatch[1];
      content = processedContent.slice(frontmatterMatch[0].length);
    }

    const outputDir = path.join(DOCS_BASE, lang, path.dirname(relativePath));
    // Convert README.mdx to index.mdx so it becomes the category page content
    const outputFileName = templateName === 'README.mdx' ? 'index.mdx' : templateName;
    const outputPath = path.join(outputDir, outputFileName);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build output content
    let output = '';

    // Add frontmatter first if it exists (must be at the very top)
    if (frontmatter) {
      output += `---\n${frontmatter}\n---\n\n`;
    }

    // Add auto-generation warning after frontmatter
    output += `<!--\n`;
    output += `  AUTO-GENERATED FILE - DO NOT EDIT\n`;
    output += `  This file is generated from: src/pages/templates/${relativePath}\n`;
    output += `  To make changes, edit the template file, then run: npm run generate:docs\n`;
    output += `-->\n\n`;

    // Add processed content (optimized for production, with Language components for development)
    output += content;

    // Write file
    fs.writeFileSync(outputPath, output, 'utf8');
  }
}

/**
 * Copy category configuration files to all language directories
 * Copies _category_.json files from template directories to docs/main/{lang}/
 * Preserves directory structure
 */
function copyCategoryFiles(): void {
  function copyDirectory(sourceDir: string, relativePath: string = ''): void {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const currentRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        copyDirectory(sourcePath, currentRelativePath);
      } else if (entry.isFile() && entry.name === '_category_.json') {
        // Copy category file to all language directories with unique keys
        const categoryContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

        for (const lang of LANGUAGES) {
          const targetDir = path.join(DOCS_BASE, lang, relativePath);
          const targetPath = path.join(targetDir, '_category_.json');

          // Ensure target directory exists
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          // Add unique key based on language and relative path
          const modifiedContent = {
            ...categoryContent,
            key: `${lang}-${relativePath.replace(/[/\\]/g, '-') || 'root'}`
          };

          fs.writeFileSync(targetPath, JSON.stringify(modifiedContent, null, 2) + '\n');
        }
      }
    }
  }

  copyDirectory(TEMPLATES_DIR);
}

/**
 * Find all template files in src/components recursively
 */
function findTemplateFiles(): string[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`);
    return [];
  }

  const templates: string[] = [];

  function searchDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        searchDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        // Skip generation of underscore-prefixed files (utility/unlisted templates)
        if (entry.name.startsWith('_')) {
          continue;
        }
        templates.push(fullPath);
      }
    }
  }

  searchDirectory(TEMPLATES_DIR);
  return templates;
}

/**
 * Create root-level category files for each language directory
 * Creates _category_.json files in docs/main/{lang}/ with proper positioning
 */
function createLanguageRootCategories(): void {
  // Position values for each language for correct sidebar ordering
  const languagePositions = {
    typescript: 2.0,
    csharp: 2.1,
    python: 2.2,
  };

  for (const lang of LANGUAGES) {
    const langDir = path.join(DOCS_BASE, lang);
    const categoryPath = path.join(langDir, '_category_.json');

    // Ensure directory exists
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // Create category configuration
    const categoryConfig = {
      label: `${LANGUAGE_NAMES[lang]} Guide`,
      position: languagePositions[lang],
      collapsible: true,
      collapsed: false,
    };

    // Write the category file
    fs.writeFileSync(categoryPath, JSON.stringify(categoryConfig, null, 2), 'utf8');
  }
}

/**
 * Generate all docs
 */
function generateAll(): void {
  console.log('generate-language-docs.ts: Generating language-specific documentation...\n');

  // Clean up stale files first
  cleanGeneratedFiles();

  const templates = findTemplateFiles();

  if (templates.length === 0) {
    console.log('No template files found in src/pages/templates/');
    return;
  }

  templates.forEach(generateDocsForTemplate);

  // Copy category configuration files
  copyCategoryFiles();

  // Create root-level category files for language directories
  createLanguageRootCategories();

  console.log(`\nGenerated ${templates.length} template(s) for ${LANGUAGES.length} languages\n`);
}

/**
 * Watch mode for development
 */
function watch(): void {
  console.log('\nWatching for template and fragment changes...\n');

  // Watch templates
  const templateWatcher = chokidar.watch(path.join(TEMPLATES_DIR, '**/*.mdx'), {
    persistent: true,
    ignoreInitial: true,
  });

  templateWatcher.on('add', (filePath: string) => {
    generateDocsForTemplate(filePath);
  });

  templateWatcher.on('change', (filePath: string) => {
    generateDocsForTemplate(filePath);
  });

  templateWatcher.on('unlink', (filePath: string) => {
    cleanGeneratedFilesForTemplate(filePath);
  });

  // Watch Language Include/fragment files (*.incl.md)
  const inclWatcher = chokidar.watch(path.join(FRAGMENTS_DIR, '**/*.incl.md'), {
    persistent: true,
    ignoreInitial: true,
  });

  /**
   * Handle changes to include files and regenerate corresponding templates
   * Maps include file paths to their corresponding template files:
   * - Category pages: src/components/include/{path}/{lang}.incl.md → src/pages/templates/{path}/README.mdx
   * - Regular pages: src/components/include/{path}/{page}/{lang}.incl.md → src/pages/templates/{path}/{page}.mdx
   */
  const handleInclChange = (filePath: string): void => {
    const relativePath = path.relative(FRAGMENTS_DIR, filePath);
    const parts = relativePath.split(path.sep);

    const langFile = parts.pop();

    let templatePath: string;

    if (langFile && langFile.match(/^(typescript|csharp|python)\.incl\.md$/)) {
      templatePath = path.join(TEMPLATES_DIR, ...parts, 'README.mdx');

      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(TEMPLATES_DIR, ...parts) + '.mdx';
      }
    } else {
      templatePath = path.join(TEMPLATES_DIR, ...parts) + '.mdx';
    }

    if (fs.existsSync(templatePath)) {
      console.log(`\nFragment changed: ${relativePath}`);
      console.log(`Regenerating template: ${path.relative(TEMPLATES_DIR, templatePath)}`);
      generateDocsForTemplate(templatePath);
    } else {
      console.warn(`\nFragment changed but template not found: ${templatePath}`);
      console.warn('This might be an orphaned fragment file.');
    }
  };

  inclWatcher.on('change', handleInclChange);
  inclWatcher.on('add', handleInclChange);

  // Watch category configuration files in templates
  const categoryWatcher = chokidar.watch(path.join(TEMPLATES_DIR, '**/_category_.json'), {
    persistent: true,
    ignoreInitial: true,
  });

  categoryWatcher.on('change', () => {
    copyCategoryFiles();
  });

  categoryWatcher.on('add', () => {
    copyCategoryFiles();
  });
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch') || args.includes('-w');

  if (watchMode) {
    generateAll();
    watch();
  } else {
    generateAll();
  }
}

export { generateAll, generateDocsForTemplate };
