"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectFiles = collectFiles;
exports.shouldSkipDirectory = shouldSkipDirectory;
exports.getHierarchicalFiles = getHierarchicalFiles;
exports.buildHierarchicalStructure = buildHierarchicalStructure;
exports.getPriorityFiles = getPriorityFiles;
var fs = require("fs");
var path = require("path");
var frontmatter_parser_1 = require("./frontmatter-parser");
/**
 * Recursively collects all markdown and MDX files from a directory
 * @param dirPath - Directory path to search
 * @param extensions - File extensions to collect (default: ['.md', '.mdx'])
 * @returns Array of file paths
 */
function collectFiles(dirPath, extensions) {
    if (extensions === void 0) { extensions = ['.md', '.mdx']; }
    var files = [];
    if (!fs.existsSync(dirPath)) {
        console.warn("\u26A0\uFE0F Directory not found: ".concat(dirPath));
        return files;
    }
    /**
     * Recursively traverse directory
     * @param currentPath - Current directory path
     */
    function traverse(currentPath) {
        var items = fs.readdirSync(currentPath, { withFileTypes: true });
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            var fullPath = path.join(currentPath, item.name);
            if (item.isDirectory()) {
                // Skip common directories that don't contain docs
                if (!shouldSkipDirectory(item.name)) {
                    traverse(fullPath);
                }
            }
            else if (item.isFile()) {
                var ext = path.extname(item.name).toLowerCase();
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
function shouldSkipDirectory(dirName) {
    var skipDirs = [
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
function getHierarchicalFiles(basePath, language) {
    var langPath = path.join(basePath, 'docs', language);
    var structure = {
        language: buildHierarchicalStructure(langPath)
    };
    return structure;
}
/**
 * Builds hierarchical structure for a directory
 * @param rootPath - Root directory path
 * @returns Hierarchical structure with folders and files
 */
function buildHierarchicalStructure(rootPath) {
    if (!fs.existsSync(rootPath)) {
        return {};
    }
    var structure = {};
    var seenTitles = new Map(); // Track titles and their file paths for duplicate detection
    /**
     * Recursively processes a directory
     * @param dirPath - Current directory path
     * @param currentLevel - Current level in the structure
     */
    function processDirectory(dirPath, currentLevel) {
        var _a;
        var items = fs.readdirSync(dirPath, { withFileTypes: true });
        // Collect folders and files separately
        var folders = [];
        var files = [];
        for (var _i = 0, items_2 = items; _i < items_2.length; _i++) {
            var item = items_2[_i];
            var fullPath = path.join(dirPath, item.name);
            if (item.isDirectory() && !shouldSkipDirectory(item.name)) {
                // Process subdirectory
                var readmePath = path.join(fullPath, 'README.md');
                var folderOrder = 999;
                var folderTitle = item.name;
                // Get folder ordering from README.md
                if (fs.existsSync(readmePath)) {
                    try {
                        var readmeContent = fs.readFileSync(readmePath, 'utf8');
                        var _b = frontmatter_parser_1.FrontmatterParser.extract(readmeContent), frontmatter = _b.frontmatter, content = _b.content;
                        // Skip this entire folder if README is marked to ignore
                        if (frontmatter.llms === 'ignore' || frontmatter.llms === false) {
                            continue; // Skip this folder entirely
                        }
                        // If README is marked ignore-file, skip just the README but process folder
                        // (folderOrder and folderTitle will use defaults)
                        folderOrder = frontmatter.sidebar_position || 999;
                        // Extract title from frontmatter or first # header
                        if (frontmatter.title || frontmatter.sidebar_label) {
                            folderTitle = (frontmatter.title || frontmatter.sidebar_label);
                        }
                        else {
                            // Extract from first # header
                            var headerMatch = content.match(/^#\s+(.+)$/m);
                            if (headerMatch) {
                                folderTitle = headerMatch[1].trim();
                            }
                        }
                    }
                    catch (error) {
                        // Ignore errors reading README
                    }
                }
                folders.push({
                    name: item.name,
                    title: folderTitle,
                    path: fullPath,
                    order: folderOrder
                });
            }
            else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
                // Process file
                var fileOrder = 999;
                var fileTitle = item.name;
                try {
                    var fileContent = fs.readFileSync(fullPath, 'utf8');
                    var _c = frontmatter_parser_1.FrontmatterParser.extract(fileContent), frontmatter = _c.frontmatter, content = _c.content;
                    // Skip this file if marked to ignore (including ignore-file)
                    if (frontmatter.llms === 'ignore' || frontmatter.llms === 'ignore-file' || frontmatter.llms === false) {
                        continue; // Skip this file
                    }
                    fileOrder = frontmatter.sidebar_position || 999;
                    // Extract title from first # header
                    var headerMatch = content.match(/^#\s+(.+)$/m);
                    if (headerMatch) {
                        fileTitle = headerMatch[1].trim();
                    }
                    // Check for duplicate titles
                    if (seenTitles.has(fileTitle)) {
                        var existingPath = seenTitles.get(fileTitle);
                        throw new Error("Duplicate title found: \"".concat(fileTitle, "\"\n") +
                            "  First occurrence: ".concat(existingPath, "\n") +
                            "  Duplicate found in: ".concat(fullPath));
                    }
                    seenTitles.set(fileTitle, fullPath);
                }
                catch (error) {
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
        files.sort(function (a, b) {
            if (a.order !== b.order)
                return a.order - b.order;
            return a.name.localeCompare(b.name);
        });
        if (files.length > 0) {
            if (!currentLevel.files)
                currentLevel.files = [];
            (_a = currentLevel.files).push.apply(_a, files);
        }
        // Sort folders by order and process each one
        folders.sort(function (a, b) {
            if (a.order !== b.order)
                return a.order - b.order;
            return a.name.localeCompare(b.name);
        });
        if (!currentLevel.children)
            currentLevel.children = {};
        for (var _d = 0, folders_1 = folders; _d < folders_1.length; _d++) {
            var folder = folders_1[_d];
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
    var tempWrapper = { files: [], children: {} };
    processDirectory(rootPath, tempWrapper);
    // Return the children (which contain the actual folder structure)
    return tempWrapper.children;
}
/**
 * Gets priority files for small version generation
 * @param organized - Organized file structure from getOrganizedFiles
 * @returns Priority files for small version
 */
function getPriorityFiles(organized) {
    var priorityFiles = [];
    // Add welcome/overview files
    priorityFiles.push.apply(priorityFiles, organized.main.welcome);
    // Add key team concepts
    var keyTeamFiles = organized.main.teams.filter(function (file) {
        return file.includes('core-concepts') ||
            file.includes('README.md');
    });
    priorityFiles.push.apply(priorityFiles, keyTeamFiles);
    // Add getting started files
    priorityFiles.push.apply(priorityFiles, organized.language.gettingStarted);
    // Add essential README files
    var essentialReadmes = organized.language.essentials.filter(function (file) {
        return file.includes('README.md') ||
            file.includes('app-basics');
    });
    priorityFiles.push.apply(priorityFiles, essentialReadmes);
    return priorityFiles;
}
