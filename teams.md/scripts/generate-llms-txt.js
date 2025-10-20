#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLlmsTxt = generateLlmsTxt;
var fs = require("fs");
var path = require("path");
var file_collector_1 = require("./lib/file-collector");
var content_processor_1 = require("./lib/content-processor");
var frontmatter_parser_1 = require("./lib/frontmatter-parser");
var LANG_NAME_BY_LANGUAGE = {
    typescript: 'Typescript',
    python: 'Python',
    csharp: 'Dotnet (C#)'
};
var LANGUAGE_SPECIFIC_TIPS = {
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
var COMMON_OVERALL_SUMMARY = function (language) {
    var langName = LANG_NAME_BY_LANGUAGE[language];
    var tips = LANGUAGE_SPECIFIC_TIPS[language];
    var formattedTips = tips.map(function (tip) { return "- ".concat(tip); }).join('\n');
    return "> Microsoft Teams AI Library (v2) - A comprehensive framework for building AI-powered Teams applications using ".concat(langName, ". Using this Library, you can easily build and integrate a variety of features in Microsoft Teams by building Agents or Tools. The documentation here helps by giving background information and code samples on how best to do this.\n\nIMPORTANT THINGS TO REMEMBER:\n- This Library is NOT based off of BotFramework (which the _previous_ version of the Teams AI Library was based on). This Library is a completely new framework. Use this guide to find snippets to drive your decisions.\n- When scaffolding new applications, using the CLI is a lot simpler and preferred than doing it all by yourself. See the Quickstart guide for that.\n").concat(formattedTips, "\n\nYOU MUST FOLLOW THE AGOVE GUIDANCE.");
};
/**
 * Reads Docusaurus config to get base URL
 * @param baseDir - Base directory path
 * @returns Config object with url and baseUrl
 */
function getDocusaurusConfig(baseDir) {
    try {
        // Read the docusaurus.config.ts file
        var configPath = path.join(baseDir, 'docusaurus.config.ts');
        var configContent = fs.readFileSync(configPath, 'utf8');
        // Extract URL and baseUrl using regex (simple approach)
        var urlMatch = configContent.match(/url:\s*['"]([^'"]+)['"]/);
        var baseUrlMatch = configContent.match(/baseUrl\s*=\s*['"]([^'"]+)['"]/) ||
            configContent.match(/baseUrl:\s*['"]([^'"]+)['"]/);
        var url = urlMatch ? urlMatch[1] : 'https://microsoft.github.io';
        var baseUrl = baseUrlMatch ? baseUrlMatch[1] : '/teams-ai/';
        return { url: url, baseUrl: baseUrl };
    }
    catch (error) {
        console.warn('⚠️ Could not read Docusaurus config, using defaults');
        return { url: 'https://microsoft.github.io', baseUrl: '/teams-ai/' };
    }
}
/**
 * Generates llms.txt files for Teams AI documentation
 * Creates both small and full versions for TypeScript and C# docs
 */
function generateLlmsTxt() {
    return __awaiter(this, void 0, void 0, function () {
        var baseDir, outputDir, config, cleanUrl, cleanBaseUrl, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Starting llms.txt generation...');
                    baseDir = path.join(__dirname, '..');
                    outputDir = path.join(baseDir, 'static', 'llms_docs');
                    config = getDocusaurusConfig(baseDir);
                    cleanUrl = config.url.replace(/\/$/, '');
                    cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
                    console.log("\uD83D\uDCCD Using base URL: ".concat(cleanUrl).concat(cleanBaseUrl));
                    // Ensure output directory exists
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    // Generate TypeScript version (main + typescript)
                    console.log('📝 Generating TypeScript llms.txt files...');
                    return [4 /*yield*/, generateLanguageFiles('typescript', baseDir, outputDir, config)];
                case 2:
                    _a.sent();
                    // Generate C# version (main + csharp)
                    console.log('📝 Generating C# llms.txt files...');
                    return [4 /*yield*/, generateLanguageFiles('csharp', baseDir, outputDir, config)];
                case 3:
                    _a.sent();
                    // Generate Python version (main + csharp)
                    console.log('📝 Generating Python llms.txt files...');
                    return [4 /*yield*/, generateLanguageFiles('python', baseDir, outputDir, config)];
                case 4:
                    _a.sent();
                    console.log('✅ Successfully generated all llms.txt files!');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('❌ Error generating llms.txt files:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generates llms.txt files for a specific language
 * @param language - 'typescript', 'python', or 'csharp'
 * @param baseDir - Base directory path
 * @param outputDir - Output directory path
 * @param config - Docusaurus config object
 */
function generateLanguageFiles(language, baseDir, outputDir, config) {
    return __awaiter(this, void 0, void 0, function () {
        var mainFiles, langFiles, _a, processedFiles, fileMapping, smallContent, fullContent, smallPath, fullPath;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    mainFiles = [];
                    langFiles = (0, file_collector_1.collectFiles)(path.join(baseDir, 'docs', language));
                    return [4 /*yield*/, processAllFiles(__spreadArray(__spreadArray([], mainFiles, true), langFiles, true), baseDir)];
                case 1:
                    _a = _b.sent(), processedFiles = _a.processedFiles, fileMapping = _a.fileMapping;
                    // Generate individual TXT files for each doc
                    return [4 /*yield*/, generateIndividualTxtFiles(processedFiles, outputDir, language, baseDir, config, fileMapping)];
                case 2:
                    // Generate individual TXT files for each doc
                    _b.sent();
                    return [4 /*yield*/, generateSmallVersionHierarchical(language, baseDir, config, fileMapping)];
                case 3:
                    smallContent = _b.sent();
                    return [4 /*yield*/, generateFullVersion(language, processedFiles, baseDir)];
                case 4:
                    fullContent = _b.sent();
                    smallPath = path.join(outputDir, "llms_".concat(language, ".txt"));
                    fullPath = path.join(outputDir, "llms_".concat(language, "_full.txt"));
                    fs.writeFileSync(smallPath, smallContent, 'utf8');
                    fs.writeFileSync(fullPath, fullContent, 'utf8');
                    console.log("  \u2713 Generated ".concat(path.basename(smallPath), " (").concat(formatBytes(smallContent.length), ")"));
                    console.log("  \u2713 Generated ".concat(path.basename(fullPath), " (").concat(formatBytes(fullContent.length), ")"));
                    console.log("  \u2713 Generated ".concat(processedFiles.length, " individual .txt files"));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Processes all files and returns structured data
 * @param allFiles - All file paths to process
 * @param baseDir - Base directory path
 * @returns Object with processedFiles array and fileMapping Map
 */
function processAllFiles(allFiles, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var processedFiles, fileMapping, _i, allFiles_1, file, tempProcessed, fileName, parentDir, _a, allFiles_2, file, processed, sortedFiles;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    processedFiles = [];
                    fileMapping = new Map();
                    _i = 0, allFiles_1 = allFiles;
                    _b.label = 1;
                case 1:
                    if (!(_i < allFiles_1.length)) return [3 /*break*/, 4];
                    file = allFiles_1[_i];
                    return [4 /*yield*/, (0, content_processor_1.processContent)(file, baseDir, false)];
                case 2:
                    tempProcessed = _b.sent();
                    if (tempProcessed) {
                        fileName = void 0;
                        if (path.basename(file) === 'README.md') {
                            parentDir = path.basename(path.dirname(file));
                            fileName = generateSafeFileName(parentDir);
                        }
                        else {
                            fileName = generateSafeFileName(tempProcessed.title || file);
                        }
                        fileMapping.set(file, fileName);
                    }
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    _a = 0, allFiles_2 = allFiles;
                    _b.label = 5;
                case 5:
                    if (!(_a < allFiles_2.length)) return [3 /*break*/, 8];
                    file = allFiles_2[_a];
                    return [4 /*yield*/, (0, content_processor_1.processContent)(file, baseDir, true, fileMapping)];
                case 6:
                    processed = _b.sent();
                    if (processed && (processed.title || processed.content)) {
                        processedFiles.push(processed);
                    }
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    sortedFiles = processedFiles.sort(function (a, b) {
                        var posA = a.sidebarPosition || 999;
                        var posB = b.sidebarPosition || 999;
                        if (posA !== posB) {
                            return posA - posB;
                        }
                        return (a.title || '').localeCompare(b.title || '');
                    });
                    return [2 /*return*/, { processedFiles: sortedFiles, fileMapping: fileMapping }];
            }
        });
    });
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
function generateIndividualTxtFiles(processedFiles, outputDir, language, baseDir, config, fileMapping) {
    return __awaiter(this, void 0, void 0, function () {
        var docsDir, _i, processedFiles_1, file, reprocessed, fileName, parentDir, outputPath, txtContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    docsDir = path.join(outputDir, "docs_".concat(language));
                    // Create docs directory
                    if (!fs.existsSync(docsDir)) {
                        fs.mkdirSync(docsDir, { recursive: true });
                    }
                    _i = 0, processedFiles_1 = processedFiles;
                    _a.label = 1;
                case 1:
                    if (!(_i < processedFiles_1.length)) return [3 /*break*/, 4];
                    file = processedFiles_1[_i];
                    if (!file.content)
                        return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, content_processor_1.processContent)(file.filePath, baseDir, true, fileMapping, config, language)];
                case 2:
                    reprocessed = _a.sent();
                    if (!reprocessed)
                        return [3 /*break*/, 3];
                    fileName = void 0;
                    if (path.basename(file.filePath) === 'README.md') {
                        parentDir = path.basename(path.dirname(file.filePath));
                        fileName = generateSafeFileName(parentDir);
                    }
                    else {
                        fileName = generateSafeFileName(file.title || file.filePath);
                    }
                    outputPath = path.join(docsDir, "".concat(fileName, ".txt"));
                    txtContent = reprocessed.content || file.content;
                    fs.writeFileSync(outputPath, txtContent, 'utf8');
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generates the small version of llms.txt (navigation index)
 * @param language - Language identifier
 * @param baseDir - Base directory path
 * @param config - Docusaurus config object
 * @param fileMapping - Mapping of source files to generated filenames
 * @returns Generated navigation content
 */
function generateSmallVersionHierarchical(language, baseDir, config, fileMapping) {
    return __awaiter(this, void 0, void 0, function () {
        var langName, cleanUrl, cleanBaseUrl, fullBaseUrl, content, hierarchical;
        return __generator(this, function (_a) {
            langName = LANG_NAME_BY_LANGUAGE[language];
            cleanUrl = config.url.replace(/\/$/, '');
            cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
            fullBaseUrl = "".concat(cleanUrl).concat(cleanBaseUrl);
            content = "# Teams AI Library - ".concat(langName, " Documentation\n\n");
            content += COMMON_OVERALL_SUMMARY(language) + '\n\n';
            hierarchical = (0, file_collector_1.getHierarchicalFiles)(baseDir, language);
            // Add Language-specific Documentation
            content += renderHierarchicalStructure(hierarchical.language, fullBaseUrl, language, fileMapping, 0);
            return [2 /*return*/, content];
        });
    });
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
function renderHierarchicalStructure(structure, baseUrl, language, fileMapping, indentLevel) {
    if (indentLevel === void 0) { indentLevel = 0; }
    var content = '';
    // Helper function for folder name formatting
    function formatFolderName(name) {
        return name.replace(/[-_]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
    }
    // Convert structure to sorted array
    var folders = Object.entries(structure)
        .map(function (_a) {
        var key = _a[0], value = _a[1];
        return (__assign({ key: key }, value));
    })
        .sort(function (a, b) {
        var orderA = a.order || 999;
        var orderB = b.order || 999;
        if (orderA !== orderB)
            return orderA - orderB;
        return a.key.localeCompare(b.key);
    });
    for (var _i = 0, folders_1 = folders; _i < folders_1.length; _i++) {
        var folder = folders_1[_i];
        // Check if this folder has any content (files or children)
        var hasFiles = folder.files && folder.files.length > 0;
        var hasChildren = folder.children && Object.keys(folder.children).length > 0;
        var hasContent = hasFiles || hasChildren;
        if (hasContent) {
            // Check if this folder has a README file to make the header clickable
            var readmeFile = hasFiles
                ? folder.files.find(function (f) { return path.basename(f.path) === 'README.md'; })
                : null;
            var displayTitle = folder.title && folder.title !== folder.key ? folder.title : formatFolderName(folder.key);
            // Generate indent for nested folders (use spaces, 2 per level)
            var indent = '  '.repeat(indentLevel);
            if (readmeFile) {
                // Make folder header clickable by linking to the README
                var folderFileName = void 0;
                if (fileMapping && fileMapping.has(readmeFile.path)) {
                    folderFileName = fileMapping.get(readmeFile.path);
                }
                else {
                    folderFileName = generateSafeFileName(folder.key);
                }
                // Use ### header for top-level sections (indentLevel 0), bullet points for nested
                if (indentLevel === 0) {
                    content += "### [".concat(displayTitle, "](").concat(baseUrl, "llms_docs/docs_").concat(language, "/").concat(folderFileName, ".txt)\n\n");
                }
                else {
                    content += "".concat(indent, "- [").concat(displayTitle, "](").concat(baseUrl, "llms_docs/docs_").concat(language, "/").concat(folderFileName, ".txt)");
                }
                // Add summary from README if available
                try {
                    var readmeContent = fs.readFileSync(readmeFile.path, 'utf8');
                    var summary = frontmatter_parser_1.FrontmatterParser.getProperty(readmeContent, 'summary');
                    if (summary) {
                        if (indentLevel === 0) {
                            content += "".concat(summary, "\n\n");
                        }
                        else {
                            content += ": ".concat(summary);
                        }
                    }
                }
                catch (error) {
                    // Ignore errors reading README summary
                }
                if (indentLevel > 0) {
                    content += '\n';
                }
            }
            else {
                // No README
                if (indentLevel === 0) {
                    content += "### ".concat(displayTitle, "\n\n");
                }
                else {
                    content += "".concat(indent, "- ").concat(displayTitle, "\n");
                }
            }
            // Add files in this folder (sorted by order), excluding README
            if (hasFiles) {
                var sortedFiles = __spreadArray([], folder.files, true).filter(function (f) { return path.basename(f.path) !== 'README.md'; }) // Exclude README since it's now the header link
                    .sort(function (a, b) {
                    var orderA = a.order || 999;
                    var orderB = b.order || 999;
                    if (orderA !== orderB)
                        return orderA - orderB;
                    return a.name.localeCompare(b.name);
                });
                for (var _a = 0, sortedFiles_1 = sortedFiles; _a < sortedFiles_1.length; _a++) {
                    var file = sortedFiles_1[_a];
                    // Use file mapping to get the correct generated filename
                    var fileName = void 0;
                    if (fileMapping && fileMapping.has(file.path)) {
                        fileName = fileMapping.get(file.path);
                    }
                    else {
                        fileName = generateSafeFileName(file.title || file.name);
                    }
                    var summary = extractSummaryFromFile(file.path);
                    // Files are always indented one level deeper than their parent folder
                    var fileIndent = '  '.repeat(indentLevel + 1);
                    content += "".concat(fileIndent, "- [").concat(file.title, "](").concat(baseUrl, "llms_docs/docs_").concat(language, "/").concat(fileName, ".txt)");
                    if (summary) {
                        content += ": ".concat(summary);
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
function extractSummaryFromFile(filePath) {
    try {
        var fileContent = fs.readFileSync(filePath, 'utf8');
        // First check for summary in frontmatter
        var summary = frontmatter_parser_1.FrontmatterParser.getProperty(fileContent, 'summary');
        if (summary) {
            return summary;
        }
        // Fallback to extracting first meaningful paragraph if no summary in frontmatter
        var content = frontmatter_parser_1.FrontmatterParser.extract(fileContent).content;
        var paragraphs = content.split('\n\n');
        for (var _i = 0, paragraphs_1 = paragraphs; _i < paragraphs_1.length; _i++) {
            var paragraph = paragraphs_1[_i];
            var clean = paragraph
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
    }
    catch (error) {
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
function generateFullVersion(language, processedFiles, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var langName, content, sections, _i, _a, _b, sectionName, files, _c, files_1, file;
        return __generator(this, function (_d) {
            langName = LANG_NAME_BY_LANGUAGE[language];
            content = "# Teams AI Library - ".concat(langName, " Documentation (Complete)\n\n");
            content += COMMON_OVERALL_SUMMARY(language) + '\n\n';
            sections = groupFilesBySection(processedFiles, baseDir);
            // Process all sections
            for (_i = 0, _a = Object.entries(sections); _i < _a.length; _i++) {
                _b = _a[_i], sectionName = _b[0], files = _b[1];
                if (!files || files.length === 0)
                    continue;
                content += "## ".concat(formatSectionName(sectionName), "\n\n");
                for (_c = 0, files_1 = files; _c < files_1.length; _c++) {
                    file = files_1[_c];
                    if (file.content) {
                        content += "### ".concat(file.title, "\n\n").concat(file.content, "\n\n---\n\n");
                    }
                }
            }
            return [2 /*return*/, content];
        });
    });
}
/**
 * Groups files by their section based on file path
 * @param processedFiles - Array of processed file objects
 * @param baseDir - Base directory path
 * @returns Grouped files by section
 */
function groupFilesBySection(processedFiles, baseDir) {
    var sections = {
        main: [],
        gettingStarted: [],
        essentials: [],
        inDepthGuides: [],
        migrations: [],
    };
    for (var _i = 0, processedFiles_2 = processedFiles; _i < processedFiles_2.length; _i++) {
        var file = processedFiles_2[_i];
        var relativePath = path.relative(path.join(baseDir, 'docs'), file.filePath);
        if (relativePath.startsWith('main/')) {
            sections.main.push(file);
        }
        else if (relativePath.includes('getting-started/')) {
            sections.gettingStarted.push(file);
        }
        else if (relativePath.includes('essentials/')) {
            sections.essentials.push(file);
        }
        else if (relativePath.includes('in-depth-guides/')) {
            sections.inDepthGuides.push(file);
        }
        else if (relativePath.includes('migrations/')) {
            sections.migrations.push(file);
        }
        else {
            // Create dynamic section based on directory
            var parts = relativePath.split('/');
            if (parts.length > 1) {
                var sectionKey = parts[1].replace(/[^a-zA-Z0-9]/g, '');
                if (!sections[sectionKey]) {
                    sections[sectionKey] = [];
                }
                sections[sectionKey].push(file);
            }
        }
    }
    // Sort files within each section by sidebar position
    for (var _a = 0, _b = Object.values(sections); _a < _b.length; _a++) {
        var sectionFiles = _b[_a];
        sectionFiles.sort(function (a, b) {
            var posA = a.sidebarPosition || 999;
            var posB = b.sidebarPosition || 999;
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
function generateSafeFileName(title) {
    return (title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50) || // Limit length
        'untitled');
}
/**
 * Formats a section name for display
 * @param sectionName - Section name to format
 * @returns Formatted section name
 */
function formatSectionName(sectionName) {
    var nameMap = {
        main: 'Main Documentation',
        gettingStarted: 'Getting Started',
        essentials: 'Essentials',
        inDepthGuides: 'In-Depth Guides',
        migrations: 'Migrations',
    };
    return (nameMap[sectionName] ||
        sectionName
            .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
            .replace(/^./, function (str) { return str.toUpperCase(); }) // Capitalize first letter
            .trim());
}
/**
 * Formats bytes into human-readable format
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
// Run the generator if this file is executed directly
if (require.main === module) {
    generateLlmsTxt();
}
