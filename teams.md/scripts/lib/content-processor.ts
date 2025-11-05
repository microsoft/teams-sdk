import * as fs from 'fs';
import * as path from 'path';

import { FrontmatterParser } from './frontmatter-parser';
import readFileUtf8Normalized from '../../src/utils/readFileUtf8Normalized';

interface ProcessedContent {
    title: string;
    content: string;
    frontmatter: { [key: string]: any };
    filePath: string;
    sidebarPosition: number;
    relativeUrl: string;
}

interface ParsedMarkdown {
    title: string;
    content: string;
    frontmatter: { [key: string]: any };
}

interface DocusaurusConfig {
    url: string;
    baseUrl: string;
}

/**
 * Checks if a file should be ignored based on section-wide README filtering
 * @param filePath - Path to the file to check
 * @returns True if file should be ignored due to section filtering
 */
export function shouldIgnoreFileBySection(filePath: string): boolean {
    // Get the directory path
    let currentDir = path.dirname(filePath);

    // Walk up the directory tree looking for README.md files
    while (currentDir && currentDir !== path.dirname(currentDir)) {
        const readmePath = path.join(currentDir, 'README.md');

        if (fs.existsSync(readmePath)) {
            try {
                const readmeContent = readFileUtf8Normalized(readmePath);
                const readmeFrontmatter = FrontmatterParser.extract(readmeContent).frontmatter;
                // Only ignore entire section if README has 'llms: ignore' (not 'ignore-file')
                if (readmeFrontmatter.llms === 'ignore' || readmeFrontmatter.llms === false) {
                    return true;
                }
            } catch (error) {
                // Ignore errors reading README
            }
        }

        // Move up one directory
        currentDir = path.dirname(currentDir);
    }

    return false;
}

/**
 * Processes a markdown/MDX file and extracts its content
 * @param filePath - Path to the file to process
 * @param baseDir - Base directory for resolving relative paths
 * @param includeCodeBlocks - Whether to include FileCodeBlock content
 * @param fileMapping - Optional mapping of source files to generated filenames
 * @param config - Optional Docusaurus config for full URL generation
 * @param language - Optional language identifier for URL generation
 * @returns Processed content with title, content, and metadata
 */
export async function processContent(
    filePath: string,
    baseDir: string,
    includeCodeBlocks: boolean = false,
    fileMapping: Map<string, string> | null = null,
    config: DocusaurusConfig | null = null,
    language: string | null = null
): Promise<ProcessedContent | null> {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ File not found: ${filePath}`);
            return { title: '', content: '', frontmatter: {}, filePath, sidebarPosition: 999, relativeUrl: '' };
        }

    const rawContent = readFileUtf8Normalized(filePath);

        // Check if this file should be excluded from LLM output
        if (FrontmatterParser.shouldIgnore(rawContent)) {
            return null; // Return null to indicate this file should be skipped
        }

        const { title, content, frontmatter } = await parseMarkdownContent(rawContent, baseDir, includeCodeBlocks, filePath, fileMapping, config, language);

        // Check if this file should be ignored due to section-wide filtering
        if (shouldIgnoreFileBySection(filePath)) {
            return null; // Return null to indicate this file should be skipped
        }

        return {
            title: title,
            content: content || '',
            frontmatter: frontmatter || {},
            filePath,
            sidebarPosition: (frontmatter.sidebar_position as number) || 999,
            relativeUrl: generateRelativeUrl(filePath, baseDir)
        };
    } catch (error) {
        console.error(`❌ Error processing file ${filePath}:`, (error as Error).message);
        throw error; // Re-throw to fail the build
    }
}

/**
 * Parses markdown/MDX content and extracts title and content
 * @param rawContent - Raw file content
 * @param baseDir - Base directory for resolving paths
 * @param includeCodeBlocks - Whether to process FileCodeBlocks
 * @param filePath - Current file path for resolving relative links
 * @param fileMapping - Optional mapping of source files to generated filenames
 * @param config - Optional Docusaurus config for full URL generation
 * @param language - Optional language identifier for URL generation
 * @returns Parsed title, content, and frontmatter
 */
async function parseMarkdownContent(
    rawContent: string,
    baseDir: string,
    includeCodeBlocks: boolean,
    filePath: string,
    fileMapping: Map<string, string> | null,
    config: DocusaurusConfig | null,
    language: string | null
): Promise<ParsedMarkdown> {
    // Extract and remove frontmatter using enhanced parser with js-yaml
    const { frontmatter, content: contentWithoutFrontmatter } = FrontmatterParser.extract(rawContent);
    let content = contentWithoutFrontmatter;

    // Extract title from first H1 (always required)
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (!h1Match) {
        throw new Error(`No # header found in file: ${filePath}`);
    }
    const title = h1Match[1].trim();

    // Remove import statements
    content = content.replace(/^import\s+.*$/gm, '');

    // Process FileCodeBlock components if requested
    if (includeCodeBlocks) {
        content = await processFileCodeBlocks(content, baseDir);
    } else {
        // Remove FileCodeBlock components for small version
        content = content.replace(/<FileCodeBlock[\s\S]*?\/>/g, '[Code example removed for brevity]');
    }

    // Clean up MDX-specific syntax while preserving markdown
    content = cleanMdxSyntax(content);

    // Fix internal relative links
    content = fixInternalLinks(content, filePath, fileMapping, config, language);

    // Remove excessive whitespace
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return { title, content, frontmatter };
}

/**
 * Processes FileCodeBlock components and includes the referenced code
 * @param content - Content containing FileCodeBlock components
 * @param baseDir - Base directory for resolving paths
 * @returns Content with FileCodeBlocks replaced by actual code
 */
async function processFileCodeBlocks(content: string, baseDir: string): Promise<string> {
    const fileCodeBlockRegex = /<FileCodeBlock\s+([^>]+)\/>/g;
    let processedContent = content;
    let match;

    while ((match = fileCodeBlockRegex.exec(content)) !== null) {
        const attributes = parseAttributes(match[1]);
        const { src, lang } = attributes;

        if (src) {
            try {
                const codeContent = await loadCodeFile(src, baseDir);
                const codeBlock = `\`\`\`${lang || 'typescript'}\n${codeContent}\n\`\`\``;
                processedContent = processedContent.replace(match[0], codeBlock);
            } catch (error) {
                console.warn(`⚠️ Could not load code file ${src}:`, (error as Error).message);
                processedContent = processedContent.replace(match[0], `[Code file not found: ${src}]`);
            }
        }
    }

    return processedContent;
}

/**
 * Loads code content from a file referenced by FileCodeBlock
 * @param src - Source path from FileCodeBlock (e.g., "/generated-snippets/ts/example.ts")
 * @param baseDir - Base directory
 * @returns Code content
 */
async function loadCodeFile(src: string, baseDir: string): Promise<string> {
    // Convert src path to local file path
    let filePath: string;
    if (src.startsWith('/')) {
        filePath = path.join(baseDir, 'static', src.substring(1));
    } else {
        filePath = path.join(baseDir, 'static', src);
    }

    if (fs.existsSync(filePath)) {
        return readFileUtf8Normalized(filePath).trim();
    } else {
        throw new Error(`File not found: ${filePath}`);
    }
}

/**
 * Parse JSX-style attributes from attribute string
 * @param attributeString - String containing attributes
 * @returns Parsed attributes
 */
function parseAttributes(attributeString: string): { [key: string]: string } {
    const attributes: { [key: string]: string } = {};
    const regex = /(\w+)=["']([^"']+)["']/g;
    let match;

    while ((match = regex.exec(attributeString)) !== null) {
        attributes[match[1]] = match[2];
    }

    return attributes;
}

/**
 * Cleans MDX-specific syntax while preserving standard markdown
 * @param content - Content to clean
 * @returns Cleaned content
 */
function cleanMdxSyntax(content: string): string {
    let cleaned = content;

    // Remove JSX components (except code blocks which are handled separately)
    cleaned = cleaned.replace(/<\/?[A-Z][^>]*>/g, '');

    // Remove empty JSX fragments
    cleaned = cleaned.replace(/<>\s*<\/>/g, '');

    // Remove JSX expressions but keep the content if it's simple text
    // IMPORTANT: Don't process content inside code blocks (```)
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks: string[] = [];

    // Extract code blocks temporarily
    cleaned = cleaned.replace(codeBlockRegex, (match) => {
        codeBlocks.push(match);
        return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    });

    // Now remove JSX expressions outside code blocks
    cleaned = cleaned.replace(/\{([^{}]+)\}/g, (match, expr) => {
        // Keep simple text expressions, remove complex ones
        if (expr.includes('(') || expr.includes('.') || expr.includes('[')) {
            return '';
        }
        return expr;
    });

    // Restore code blocks
    cleaned = cleaned.replace(/___CODE_BLOCK_(\d+)___/g, (match, index) => {
        return codeBlocks[parseInt(index)];
    });

    // Clean up multiple empty lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    return cleaned;
}


/**
 * Generates a relative URL for a documentation file
 * @param filePath - Full path to the file
 * @param baseDir - Base directory path
 * @returns Relative URL for the file
 */
export function generateRelativeUrl(filePath: string, baseDir: string): string {
    const relativePath = path.relative(path.join(baseDir, 'docs'), filePath);

    // Convert file path to URL format
    let url = relativePath
        .replace(/\\/g, '/') // Convert Windows paths
        .replace(/\.mdx?$/, '') // Remove .md/.mdx extension
        .replace(/\/README$/i, '') // Remove /README from end
        .replace(/\/index$/i, ''); // Remove /index from end

    // Add leading slash
    if (!url.startsWith('/')) {
        url = '/' + url;
    }

    // Handle empty URL (root README)
    if (url === '/') {
        url = '';
    }

    return url;
}

/**
 * Fixes internal relative links to point to generated .txt files
 * @param content - Content containing markdown links
 * @param currentFilePath - Path of the current file being processed
 * @param fileMapping - Optional mapping of source files to generated filenames
 * @param config - Optional Docusaurus config for full URL generation
 * @param language - Optional language identifier for URL generation
 * @returns Content with fixed links
 */
export function fixInternalLinks(
    content: string,
    currentFilePath: string,
    fileMapping: Map<string, string> | null,
    config: DocusaurusConfig | null,
    language: string | null
): string {
    // Pattern to match markdown links: [text](link)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    return content.replace(linkRegex, (match, text, link) => {
        // Skip external links (http/https/mailto/etc)
        if (link.startsWith('http') || link.startsWith('mailto') || link.startsWith('#')) {
            return match;
        }

        // Skip absolute paths starting with /
        if (link.startsWith('/') && !link.startsWith('//')) {
            return match;
        }

        // Handle relative links
        if (!link.includes('://')) {
            // Remove any file extensions and anchors
            const cleanLink = link.split('#')[0].replace(/\.(md|mdx)$/, '');

            // If it's just a filename without path separators, it's likely a sibling file
            if (!cleanLink.includes('/')) {
                // Try to resolve using file mapping first
                if (fileMapping) {
                    const currentDir = path.dirname(currentFilePath);
                    const possiblePath = path.join(currentDir, cleanLink + '.md');
                    const possibleMdxPath = path.join(currentDir, cleanLink + '.mdx');

                    // Look for the file in the mapping
                    for (const [sourcePath, generatedName] of fileMapping.entries()) {
                        // Check exact path match or basename match
                        if (sourcePath === possiblePath ||
                            sourcePath === possibleMdxPath ||
                            path.basename(sourcePath, '.md') === cleanLink ||
                            path.basename(sourcePath, '.mdx') === cleanLink) {

                            // Generate full URL if config and language are provided
                            if (config && language) {
                                const cleanUrl = config.url.replace(/\/$/, '');
                                const cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
                                const fullBaseUrl = `${cleanUrl}${cleanBaseUrl}`;
                                return `[${text}](${fullBaseUrl}llms_docs/docs_${language}/${generatedName}.txt)`;
                            } else {
                                return `[${text}](${generatedName}.txt)`;
                            }
                        }
                    }
                }

                // Fallback to simple conversion
                const safeFileName = cleanLink
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 50)
                    || 'untitled';

                // Generate full URL if config and language are provided
                if (config && language) {
                    const cleanUrl = config.url.replace(/\/$/, '');
                    const cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
                    const fullBaseUrl = `${cleanUrl}${cleanBaseUrl}`;
                    return `[${text}](${fullBaseUrl}llms_docs/docs_${language}/${safeFileName}.txt)`;
                } else {
                    return `[${text}](${safeFileName}.txt)`;
                }
            }
        }

        // Return original link if we can't process it
        return match;
    });
}

/**
 * Extracts a summary from content (first paragraph or section)
 * @param content - Content to summarize
 * @param maxLength - Maximum length of summary
 * @returns Content summary
 */
export function extractSummary(content: string, maxLength: number = 200): string {
    // Remove markdown formatting for summary
    let summary = content
        .replace(/#+\s*/g, '') // Remove headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
        .trim();

    // Get first paragraph
    const firstParagraph = summary.split('\n\n')[0];

    // Truncate if too long
    if (firstParagraph.length > maxLength) {
        return firstParagraph.substring(0, maxLength).trim() + '...';
    }

    return firstParagraph;
}
