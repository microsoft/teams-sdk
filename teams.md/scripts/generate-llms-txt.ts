#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { collectFiles, getHierarchicalFiles } from './lib/file-collector';
import { processContent } from './lib/content-processor';
import { FrontmatterParser } from './lib/frontmatter-parser';
import { LANGUAGES, Language, LANGUAGE_NAMES } from '../src/constants/languages';

const LANGUAGE_SPECIFIC_TIPS: Record<Language, string[]> = {
    typescript: [
        "It's a good idea to build the application using `npm run build` and fix compile time errors to help ensure the app works as expected.",
        "The library uses typescript to help you make the right decisions when using the APIs. You may check type definitions and type checkers to make sure your code is correct."
    ],
    python: [
        "It's a good idea to run `uv run typecheck` to make sure the code is correctly typed and fix any type errors.",
    ],
    csharp: [
        "It's a good idea to build the application and fix compile time errors to help ensure the app works as expected.",
        "It is helpful to inspect NuGet packages folder to get exact types for a given namesapce"
    ]
};

const COMMON_OVERALL_SUMMARY = (language: Language) => {
    const langName = LANGUAGE_NAMES[language];
    const tips = LANGUAGE_SPECIFIC_TIPS[language];
    const formattedTips = tips.map(tip => `- ${tip}`).join('\n');

    return `> Microsoft Teams AI Library (v2) - A comprehensive framework for building AI-powered Teams applications using ${langName}. Using this Library, you can easily build and integrate a variety of features in Microsoft Teams by building Agents or Tools. The documentation here helps by giving background information and code samples on how best to do this.

IMPORTANT THINGS TO REMEMBER:
- This Library is NOT based off of BotFramework (which the _previous_ version of the Teams AI Library was based on). This Library is a completely new framework. Use this guide to find snippets to drive your decisions.
- When scaffolding new applications, using the CLI is a lot simpler and preferred than doing it all by yourself. See the Quickstart guide for that.
${formattedTips}

YOU MUST FOLLOW THE ABOVE GUIDANCE.`;
};

interface DocusaurusConfig {
    url: string;
    baseUrl: string;
}

interface ProcessedFile {
    title: string;
    content: string;
    frontmatter: { [key: string]: any };
    filePath: string;
    sidebarPosition: number;
    relativeUrl: string;
}

interface FileInfo {
    name: string;
    title: string;
    path: string;
    order: number;
}

interface FolderStructure {
    title: string;
    order: number;
    path: string;
    files: FileInfo[];
    children: { [key: string]: FolderStructure };
}

/**
 * Reads Docusaurus config to get base URL
 * @param baseDir - Base directory path
 * @returns Config object with url and baseUrl
 */
function getDocusaurusConfig(baseDir: string): DocusaurusConfig {
    try {
        // Read the docusaurus.config.ts file
        const configPath = path.join(baseDir, 'docusaurus.config.ts');
        const configContent = fs.readFileSync(configPath, 'utf8');

        // Extract URL and baseUrl using regex (simple approach)
        const urlMatch = configContent.match(/url:\s*['"]([^'"]+)['"]/);
        const baseUrlMatch =
            configContent.match(/baseUrl\s*=\s*['"]([^'"]+)['"]/) ||
            configContent.match(/baseUrl:\s*['"]([^'"]+)['"]/);

        const url = urlMatch ? urlMatch[1] : 'https://microsoft.github.io';
        const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '/teams-ai/';

        return { url, baseUrl };
    } catch (error) {
        console.warn('⚠️ Could not read Docusaurus config, using defaults');
        return { url: 'https://microsoft.github.io', baseUrl: '/teams-ai/' };
    }
}

/**
 * Generates llms.txt files for Teams AI documentation
 * Creates both small and full versions for TypeScript and C# docs
 */
async function generateLlmsTxt(): Promise<void> {
    console.log('🚀 Starting llms.txt generation...');

    const baseDir = path.join(__dirname, '..');
    const outputDir = path.join(baseDir, 'static', 'llms_docs');

    // Get Docusaurus configuration
    const config = getDocusaurusConfig(baseDir);
    const cleanUrl = config.url.replace(/\/$/, '');
    const cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
    console.log(`📍 Using base URL: ${cleanUrl}${cleanBaseUrl}`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Generate llms.txt files for all languages
        for (const language of LANGUAGES) {
            const langName = LANGUAGE_NAMES[language];
            console.log(`📝 Generating ${langName} llms.txt files...`);
            await generateLanguageFiles(language, baseDir, outputDir, config);
        }

        console.log('✅ Successfully generated all llms.txt files!');
    } catch (error) {
        console.error('❌ Error generating llms.txt files:', error);
        process.exit(1);
    }
}

/**
 * Generates llms.txt files for a specific language
 * @param language - 'typescript', 'python', or 'csharp'
 * @param baseDir - Base directory path
 * @param outputDir - Output directory path
 * @param config - Docusaurus config object
 */
async function generateLanguageFiles(language: Language, baseDir: string, outputDir: string, config: DocusaurusConfig): Promise<void> {
    // Collect all relevant files
    const mainFiles = collectFiles(path.join(baseDir, 'docs', 'main'));
    const langFiles = collectFiles(path.join(baseDir, 'docs', 'main', language));

    // Process all files to get metadata and file mapping
    const { processedFiles, fileMapping } = await processAllFiles(
        [...mainFiles, ...langFiles],
        baseDir
    );

    // Generate individual TXT files for each doc
    await generateIndividualTxtFiles(
        processedFiles,
        outputDir,
        language,
        baseDir,
        config,
        fileMapping
    );

    // Process content for small version (navigation index)
    const smallContent = await generateSmallVersionHierarchical(
        language,
        baseDir,
        config,
        fileMapping
    );

    // Process content for full version (all documentation)
    const fullContent = await generateFullVersion(language, processedFiles, baseDir);

    // Write main llms.txt files
    const smallPath = path.join(outputDir, `llms_${language}.txt`);
    const fullPath = path.join(outputDir, `llms_${language}_full.txt`);

    fs.writeFileSync(smallPath, smallContent, 'utf8');
    fs.writeFileSync(fullPath, fullContent, 'utf8');

    console.log(`  ✓ Generated ${path.basename(smallPath)} (${formatBytes(smallContent.length)})`);
    console.log(`  ✓ Generated ${path.basename(fullPath)} (${formatBytes(fullContent.length)})`);
    console.log(`  ✓ Generated ${processedFiles.length} individual .txt files`);
}

/**
 * Processes all files and returns structured data
 * @param allFiles - All file paths to process
 * @param baseDir - Base directory path
 * @returns Object with processedFiles array and fileMapping Map
 */
async function processAllFiles(allFiles: string[], baseDir: string): Promise<{ processedFiles: ProcessedFile[]; fileMapping: Map<string, string> }> {
    const processedFiles: ProcessedFile[] = [];

    // First pass: build file mapping
    const fileMapping = new Map<string, string>();
    for (const file of allFiles) {
        // Generate the same filename logic as used in generateIndividualTxtFiles
        const tempProcessed = await processContent(file, baseDir, false); // Quick pass for title
        if (tempProcessed) {
            // Only process files that aren't marked to ignore
            let fileName: string;
            if (path.basename(file) === 'README.md') {
                const parentDir = path.basename(path.dirname(file));
                fileName = generateSafeFileName(parentDir);
            } else {
                fileName = generateSafeFileName(tempProcessed.title || file);
            }
            fileMapping.set(file, fileName);
        }
    }

    // Second pass: process files with mapping for link resolution
    for (const file of allFiles) {
        const processed = await processContent(file, baseDir, true, fileMapping);
        if (processed && (processed.title || processed.content)) {
            processedFiles.push(processed);
        }
    }

    // Sort by sidebar position, then by title
    const sortedFiles = processedFiles.sort((a, b) => {
        const posA = a.sidebarPosition || 999;
        const posB = b.sidebarPosition || 999;

        if (posA !== posB) {
            return posA - posB;
        }

        return (a.title || '').localeCompare(b.title || '');
    });

    return { processedFiles: sortedFiles, fileMapping };
}

/**
 * Generates individual .txt files for each documentation file
 * @param processedFiles - Array of processed file objects
 * @param outputDir - Output directory path
 * @param language - Language identifier
 * @param baseDir - Base directory path
 * @param config - Docusaurus config object
 * @param fileMapping - File mapping for link resolution
 */
async function generateIndividualTxtFiles(
    processedFiles: ProcessedFile[],
    outputDir: string,
    language: Language,
    baseDir: string,
    config: DocusaurusConfig,
    fileMapping: Map<string, string>
): Promise<void> {
    const docsDir = path.join(outputDir, `docs_${language}`);

    // Create docs directory
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
    }

    for (const file of processedFiles) {
        if (!file.content) continue;

        // Re-process the file with full URL generation for individual files
        const reprocessed = await processContent(
            file.filePath,
            baseDir,
            true,
            fileMapping,
            config,
            language
        );

        if (!reprocessed) continue;

        // Generate safe filename - use folder name for README.md files
        let fileName: string;
        if (path.basename(file.filePath) === 'README.md') {
            // Use parent folder name for README files
            const parentDir = path.basename(path.dirname(file.filePath));
            fileName = generateSafeFileName(parentDir);
        } else {
            fileName = generateSafeFileName(file.title || file.filePath);
        }

        const outputPath = path.join(docsDir, `${fileName}.txt`);

        // Use the reprocessed content directly without adding metadata header
        let txtContent = reprocessed.content || file.content; // Use reprocessed content with full URLs

        fs.writeFileSync(outputPath, txtContent, 'utf8');
    }
}

/**
 * Generates the small version of llms.txt (navigation index)
 * @param language - Language identifier
 * @param baseDir - Base directory path
 * @param config - Docusaurus config object
 * @param fileMapping - Mapping of source files to generated filenames
 * @returns Generated navigation content
 */
async function generateSmallVersionHierarchical(language: Language, baseDir: string, config: DocusaurusConfig, fileMapping: Map<string, string>): Promise<string> {
    const langName = LANGUAGE_NAMES[language];
    // Remove trailing slash from URL and ensure baseUrl starts with slash
    const cleanUrl = config.url.replace(/\/$/, '');
    const cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
    const fullBaseUrl = `${cleanUrl}${cleanBaseUrl}`;

    let content = `# Teams AI Library - ${langName} Documentation\n\n`;
    content += COMMON_OVERALL_SUMMARY(language) + '\n\n';

    // Get hierarchical structure
    const hierarchical = getHierarchicalFiles(baseDir, `main/${language}`);

    // Add Language-specific Documentation
    content += renderHierarchicalStructure(hierarchical.language, fullBaseUrl, language, fileMapping, 0);

    return content;
}

/**
 * Renders hierarchical structure with proper indentation
 * @param structure - Hierarchical structure object
 * @param baseUrl - Base URL for links
 * @param language - Language identifier
 * @param fileMapping - Mapping of source files to generated filenames
 * @param indentLevel - Current indentation level (0 = section headers, 1+ = bullet points)
 * @returns Rendered content with proper hierarchy
 */
function renderHierarchicalStructure(structure: { [key: string]: FolderStructure }, baseUrl: string, language: Language, fileMapping: Map<string, string>, indentLevel: number = 0): string {
    let content = '';

    // Helper function for folder name formatting
    function formatFolderName(name: string): string {
        return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Convert structure to sorted array
    const folders = Object.entries(structure)
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => {
            const orderA = a.order || 999;
            const orderB = b.order || 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.key.localeCompare(b.key);
        });

    for (const folder of folders) {
        // Check if this folder has any content (files or children)
        const hasFiles = folder.files && folder.files.length > 0;
        const hasChildren = folder.children && Object.keys(folder.children).length > 0;
        const hasContent = hasFiles || hasChildren;

        if (hasContent) {
            // Check if this folder has a README file to make the header clickable
            const readmeFile = hasFiles
                ? folder.files.find((f) => path.basename(f.path) === 'README.md')
                : null;
            const displayTitle =
                folder.title && folder.title !== folder.key ? folder.title : formatFolderName(folder.key);

            // Generate indent for nested folders (use spaces, 2 per level)
            const indent = '  '.repeat(indentLevel);

            if (readmeFile) {
                // Make folder header clickable by linking to the README
                let folderFileName: string;
                if (fileMapping && fileMapping.has(readmeFile.path)) {
                    folderFileName = fileMapping.get(readmeFile.path)!;
                } else {
                    folderFileName = generateSafeFileName(folder.key);
                }

                // Use ### header for top-level sections (indentLevel 0), bullet points for nested
                if (indentLevel === 0) {
                    content += `### [${displayTitle}](${baseUrl}llms_docs/docs_${language}/${folderFileName}.txt)\n\n`;
                } else {
                    content += `${indent}- [${displayTitle}](${baseUrl}llms_docs/docs_${language}/${folderFileName}.txt)`;
                }

                // Add summary from README if available
                try {
                    const readmeContent = fs.readFileSync(readmeFile.path, 'utf8');
                    const { frontmatter } = FrontmatterParser.extract(readmeContent);
                    const summary = frontmatter.summary;
                    if (summary) {
                        if (indentLevel === 0) {
                            content += `${summary}\n\n`;
                        } else {
                            content += `: ${summary}`;
                        }
                    }
                } catch (error) {
                    // Ignore errors reading README summary
                }

                if (indentLevel > 0) {
                    content += '\n';
                }
            } else {
                // No README
                if (indentLevel === 0) {
                    content += `### ${displayTitle}\n\n`;
                } else {
                    content += `${indent}- ${displayTitle}\n`;
                }
            }

            // Add files in this folder (sorted by order), excluding README
            if (hasFiles) {
                const sortedFiles = [...folder.files]
                    .filter((f) => path.basename(f.path) !== 'README.md') // Exclude README since it's now the header link
                    .sort((a, b) => {
                        const orderA = a.order || 999;
                        const orderB = b.order || 999;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.name.localeCompare(b.name);
                    });

                for (const file of sortedFiles) {
                    // Use file mapping to get the correct generated filename
                    let fileName: string;
                    if (fileMapping && fileMapping.has(file.path)) {
                        fileName = fileMapping.get(file.path)!;
                    } else {
                        fileName = generateSafeFileName(file.title || file.name);
                    }

                    const summary = extractSummaryFromFile(file.path);

                    // Files are always indented one level deeper than their parent folder
                    const fileIndent = '  '.repeat(indentLevel + 1);
                    content += `${fileIndent}- [${file.title}](${baseUrl}llms_docs/docs_${language}/${fileName}.txt)`;
                    if (summary) {
                        content += `: ${summary}`;
                    }
                    content += '\n';
                }
            }

            // Recursively render children with increased indent
            if (hasChildren) {
                content += renderHierarchicalStructure(folder.children, baseUrl, language, fileMapping, indentLevel + 1);
            }

            // Add spacing after top-level sections
            if (indentLevel === 0) {
                content += '\n';
            }
        }
    }

    return content;
}

/**
 * Extracts summary from a file (cached approach)
 * @param filePath - Path to the file
 * @returns File summary or empty string
 */
function extractSummaryFromFile(filePath: string): string {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // First check for summary in frontmatter
        const { frontmatter, content } = FrontmatterParser.extract(fileContent);
        const summary = frontmatter.summary;
        if (summary && typeof summary === 'string') {
            return summary;
        }

        // Fallback to extracting first meaningful paragraph if no summary in frontmatter
        const paragraphs = content.split('\n\n');
        for (const paragraph of paragraphs) {
            const clean = paragraph
                .replace(/#+\s*/g, '') // Remove headers
                .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                .replace(/\*(.+?)\*/g, '$1') // Remove italic
                .replace(/`(.+?)`/g, '$1') // Remove inline code
                .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
                .trim();

            if (clean.length > 20 && !clean.startsWith('```') && !clean.startsWith('import')) {
                return clean.length > 100 ? clean.substring(0, 100) + '...' : clean;
            }
        }
    } catch (error) {
        // Ignore file read errors
    }

    return '';
}

/**
 * Generates the full version of llms.txt (complete documentation)
 * @param language - Language identifier
 * @param processedFiles - Array of processed file objects
 * @param baseDir - Base directory path
 * @returns Generated content
 */
async function generateFullVersion(language: Language, processedFiles: ProcessedFile[], baseDir: string): Promise<string> {
    const langName = LANGUAGE_NAMES[language]
    let content = `# Teams AI Library - ${langName} Documentation (Complete)\n\n`;
    content += COMMON_OVERALL_SUMMARY(language) + '\n\n';

    // Group files by section
    const sections = groupFilesBySection(processedFiles, baseDir);

    // Process all sections
    for (const [sectionName, files] of Object.entries(sections)) {
        if (!files || files.length === 0) continue;

        content += `## ${formatSectionName(sectionName)}\n\n`;

        for (const file of files) {
            if (file.content) {
                content += `### ${file.title}\n\n${file.content}\n\n---\n\n`;
            }
        }
    }

    return content;
}

/**
 * Groups files by their section based on file path
 * @param processedFiles - Array of processed file objects
 * @param baseDir - Base directory path
 * @returns Grouped files by section
 */
function groupFilesBySection(processedFiles: ProcessedFile[], baseDir: string): { [key: string]: ProcessedFile[] } {
    const sections: { [key: string]: ProcessedFile[] } = {
        main: [],
        gettingStarted: [],
        essentials: [],
        inDepthGuides: [],
        migrations: [],
    };

    for (const file of processedFiles) {
        const relativePath = path.relative(path.join(baseDir, 'docs'), file.filePath);

        if (relativePath.startsWith('main/')) {
            sections.main.push(file);
        } else if (relativePath.includes('getting-started/')) {
            sections.gettingStarted.push(file);
        } else if (relativePath.includes('essentials/')) {
            sections.essentials.push(file);
        } else if (relativePath.includes('in-depth-guides/')) {
            sections.inDepthGuides.push(file);
        } else if (relativePath.includes('migrations/')) {
            sections.migrations.push(file);
        } else {
            // Create dynamic section based on directory
            const parts = relativePath.split('/');
            if (parts.length > 1) {
                const sectionKey = parts[1].replace(/[^a-zA-Z0-9]/g, '');
                if (!sections[sectionKey]) {
                    sections[sectionKey] = [];
                }
                sections[sectionKey].push(file);
            }
        }
    }

    // Sort files within each section by sidebar position
    for (const sectionFiles of Object.values(sections)) {
        sectionFiles.sort((a, b) => {
            const posA = a.sidebarPosition || 999;
            const posB = b.sidebarPosition || 999;

            if (posA !== posB) {
                return posA - posB;
            }

            return (a.title || '').localeCompare(b.title || '');
        });
    }

    return sections;
}

/**
 * Generates a safe filename from a title
 * @param title - Title to convert to filename
 * @returns Safe filename
 */
function generateSafeFileName(title: string): string {
    return (
        title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .substring(0, 50) || // Limit length
        'untitled'
    );
}

/**
 * Formats a section name for display
 * @param sectionName - Section name to format
 * @returns Formatted section name
 */
function formatSectionName(sectionName: string): string {
    const nameMap: { [key: string]: string } = {
        main: 'Main Documentation',
        gettingStarted: 'Getting Started',
        essentials: 'Essentials',
        inDepthGuides: 'In-Depth Guides',
        migrations: 'Migrations',
    };

    return (
        nameMap[sectionName] ||
        sectionName
            .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
            .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
            .trim()
    );
}

/**
 * Formats bytes into human-readable format
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run the generator if this file is executed directly
if (require.main === module) {
    generateLlmsTxt();
}

export { generateLlmsTxt };
