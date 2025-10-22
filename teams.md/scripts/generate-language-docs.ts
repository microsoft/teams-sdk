#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { LANGUAGES, Language, LANGUAGE_NAMES } from '../src/constants/languages';

const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'pages', 'templates');
const FRAGMENTS_DIR = path.join(__dirname, '..', 'src', 'components', 'include');

const DOCS_BASE = path.join(__dirname, '..', 'docs', 'main');

/**
 * Clean up stale generated files before regeneration
 * Removes all .mdx files from docs/main/{lang}/ directories
 */
function cleanGeneratedFiles(): void {
  console.log('\nCleaning up stale generated files...\n');

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
    console.log(`\nCleaned up ${deletedCount} file(s)\n`);
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
 * Preserves directory structure
 */
function generateDocsForTemplate(templatePath: string): void {
  // Calculate relative path from TEMPLATES_DIR to preserve nested structure
  const relativePath = path.relative(TEMPLATES_DIR, templatePath);
  const templateName = path.basename(templatePath);

  console.log(`Generating docs for template: ${relativePath}`);

  // Read template content
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Validate template contains LanguageInclude tags
  if (!templateContent.includes('<LanguageInclude')) {
    console.warn(`Warning: Template "${relativePath}" does not contain <LanguageInclude /> tags.`);
    console.warn(`This file will be duplicated but won't use language-specific fragments.`);
  }

  // Extract frontmatter if exists
  const frontmatterMatch = templateContent.match(/^---\n([\s\S]*?)\n---\n/);
  let frontmatter = '';
  let content = templateContent;

  if (frontmatterMatch) {
    frontmatter = frontmatterMatch[1];
    content = templateContent.slice(frontmatterMatch[0].length);
  }

  // Generate for each language
  for (const lang of LANGUAGES) {
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

    // Add content
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
  console.log('Copying category configuration files...');

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

        console.log(`Copied: ${currentRelativePath} -> all language directories`);
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
  console.log('Creating root-level language category files...');

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
    console.log(`  Created: docs/main/${lang}/_category_.json`);
  }
}

/**
 * Generate all docs
 */
function generateAll(): void {
  console.log('\nGenerating language-specific documentation...\n');

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

  const handleInclChange = (filePath: string): void => {
    // Parse fragment path to find matching template:
    // Fragment: src/components/include/{relativePath}/{fileName}/{lang}.incl.md
    // Template: src/pages/templates/{relativePath}/{fileName}.mdx
    const relativePath = path.relative(FRAGMENTS_DIR, filePath);
    const parts = relativePath.split(path.sep);

    // Remove the language file (e.g., typescript.incl.md)
    parts.pop();

    // Reconstruct path to template
    const templatePath = path.join(TEMPLATES_DIR, ...parts) + '.mdx';

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
