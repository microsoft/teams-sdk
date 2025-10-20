import * as fs from 'fs';
import * as path from 'path';
import { FrontmatterParser } from './frontmatter-parser';

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

interface HierarchicalFiles {
    language: { [key: string]: FolderStructure };
}

/**
 * Recursively collects all markdown and MDX files from a directory
 * @param dirPath - Directory path to search
 * @param extensions - File extensions to collect (default: ['.md', '.mdx'])
 * @returns Array of file paths
 */
export function collectFiles(dirPath: string, extensions: string[] = ['.md', '.mdx']): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dirPath)) {
        console.warn(`⚠️ Directory not found: ${dirPath}`);
        return files;
    }

    /**
     * Recursively traverse directory
     * @param currentPath - Current directory path
     */
    function traverse(currentPath: string): void {
        const items = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(currentPath, item.name);

            if (item.isDirectory()) {
                // Skip common directories that don't contain docs
                if (!shouldSkipDirectory(item.name)) {
                    traverse(fullPath);
                }
            } else if (item.isFile()) {
                const ext = path.extname(item.name).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }

    traverse(dirPath);

    // Sort files for consistent ordering
    return files.sort();
}

/**
 * Determines if a directory should be skipped during traversal
 * @param dirName - Directory name
 * @returns True if directory should be skipped
 */
export function shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
        'node_modules',
        '.git',
        'build',
        'dist',
        '.next',
        '.docusaurus',
        'coverage',
        '__pycache__'
    ];

    return skipDirs.includes(dirName) || dirName.startsWith('.');
}

/**
 * Gets files organized hierarchically based on folder structure and sidebar_position
 * @param basePath - Base documentation path
 * @param language - Language identifier ('typescript' or 'csharp' or 'python')
 * @returns Hierarchically organized file structure
 */
export function getHierarchicalFiles(basePath: string, language: string): HierarchicalFiles {
    const langPath = path.join(basePath, 'docs', language);

    const structure: HierarchicalFiles = {
        language: buildHierarchicalStructure(langPath)
    };

    return structure;
}

/**
 * Builds hierarchical structure for a directory
 * @param rootPath - Root directory path
 * @returns Hierarchical structure with folders and files
 */
export function buildHierarchicalStructure(rootPath: string): { [key: string]: FolderStructure } {
    if (!fs.existsSync(rootPath)) {
        return {};
    }

    const structure: { [key: string]: FolderStructure } = {};
    const seenTitles = new Map<string, string>(); // Track titles and their file paths for duplicate detection

    /**
     * Recursively processes a directory
     * @param dirPath - Current directory path
     * @param currentLevel - Current level in the structure
     */
    function processDirectory(dirPath: string, currentLevel: { files: FileInfo[]; children: { [key: string]: FolderStructure } }): void {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        // Collect folders and files separately
        const folders: FileInfo[] = [];
        const files: FileInfo[] = [];

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);

            if (item.isDirectory() && !shouldSkipDirectory(item.name)) {
                // Process subdirectory
                const readmePath = path.join(fullPath, 'README.md');
                let folderOrder = 999;
                let folderTitle = item.name;

                // Get folder ordering from README.md
                if (fs.existsSync(readmePath)) {
                    try {
                        const readmeContent = fs.readFileSync(readmePath, 'utf8');
                        const { frontmatter, content } = FrontmatterParser.extract(readmeContent);

                        // Skip this entire folder if README is marked to ignore
                        if (frontmatter.llms === 'ignore' || frontmatter.llms === false) {
                            continue; // Skip this folder entirely
                        }

                        // If README is marked ignore-file, skip just the README but process folder
                        // (folderOrder and folderTitle will use defaults)

                        folderOrder = (frontmatter.sidebar_position as number) || 999;

                        // Extract title from frontmatter or first # header
                        if (frontmatter.title || frontmatter.sidebar_label) {
                            folderTitle = (frontmatter.title || frontmatter.sidebar_label) as string;
                        } else {
                            // Extract from first # header
                            const headerMatch = content.match(/^#\s+(.+)$/m);
                            if (headerMatch) {
                                folderTitle = headerMatch[1].trim();
                            }
                        }
                    } catch (error) {
                        // Ignore errors reading README
                    }
                }

                folders.push({
                    name: item.name,
                    title: folderTitle,
                    path: fullPath,
                    order: folderOrder
                });
            } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
                // Process file
                let fileOrder = 999;
                let fileTitle = item.name;

                try {
                    const fileContent = fs.readFileSync(fullPath, 'utf8');
                    const { frontmatter, content } = FrontmatterParser.extract(fileContent);

                    // Skip this file if marked to ignore (including ignore-file)
                    if (frontmatter.llms === 'ignore' || frontmatter.llms === 'ignore-file' || frontmatter.llms === false) {
                        continue; // Skip this file
                    }

                    fileOrder = (frontmatter.sidebar_position as number) || 999;

                    // Extract title from first # header
                    const headerMatch = content.match(/^#\s+(.+)$/m);
                    if (headerMatch) {
                        fileTitle = headerMatch[1].trim();
                    }

                    // Check for duplicate titles
                    if (seenTitles.has(fileTitle)) {
                        const existingPath = seenTitles.get(fileTitle)!;
                        throw new Error(
                            `Duplicate title found: "${fileTitle}"\n` +
                            `  First occurrence: ${existingPath}\n` +
                            `  Duplicate found in: ${fullPath}`
                        );
                    }
                    seenTitles.set(fileTitle, fullPath);
                } catch (error) {
                    // Re-throw to fail the build
                    throw error;
                }

                files.push({
                    name: item.name,
                    title: fileTitle,
                    path: fullPath,
                    order: fileOrder
                });
            }
        }

        // Sort files by order and add to current level
        files.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.name.localeCompare(b.name);
        });

        if (files.length > 0) {
            if (!currentLevel.files) currentLevel.files = [];
            currentLevel.files.push(...files);
        }

        // Sort folders by order and process each one
        folders.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.name.localeCompare(b.name);
        });

        if (!currentLevel.children) currentLevel.children = {};

        for (const folder of folders) {
            currentLevel.children[folder.name] = {
                title: folder.title,
                order: folder.order,
                path: folder.path,
                files: [],
                children: {}
            };

            // Recursively process subdirectory
            processDirectory(folder.path, currentLevel.children[folder.name]);
        }
    }

    // Create a temporary wrapper to handle the root properly
    const tempWrapper: { files: FileInfo[]; children: { [key: string]: FolderStructure } } = { files: [], children: {} };
    processDirectory(rootPath, tempWrapper);

    // Return the children (which contain the actual folder structure)
    return tempWrapper.children;
}

/**
 * Gets priority files for small version generation
 * @param organized - Organized file structure from getOrganizedFiles
 * @returns Priority files for small version
 */
export function getPriorityFiles(organized: any): string[] {
    const priorityFiles: string[] = [];

    // Add welcome/overview files
    priorityFiles.push(...organized.main.welcome);

    // Add key team concepts
    const keyTeamFiles = organized.main.teams.filter((file: string) =>
        file.includes('core-concepts') ||
        file.includes('README.md')
    );
    priorityFiles.push(...keyTeamFiles);

    // Add getting started files
    priorityFiles.push(...organized.language.gettingStarted);

    // Add essential README files
    const essentialReadmes = organized.language.essentials.filter((file: string) =>
        file.includes('README.md') ||
        file.includes('app-basics')
    );
    priorityFiles.push(...essentialReadmes);

    return priorityFiles;
}
