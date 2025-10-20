"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldIgnoreFileBySection = shouldIgnoreFileBySection;
exports.processContent = processContent;
exports.generateRelativeUrl = generateRelativeUrl;
exports.fixInternalLinks = fixInternalLinks;
exports.extractSummary = extractSummary;
var fs = require("fs");
var path = require("path");
var frontmatter_parser_1 = require("./frontmatter-parser");
/**
 * Checks if a file should be ignored based on section-wide README filtering
 * @param filePath - Path to the file to check
 * @returns True if file should be ignored due to section filtering
 */
function shouldIgnoreFileBySection(filePath) {
    // Get the directory path
    var currentDir = path.dirname(filePath);
    // Walk up the directory tree looking for README.md files
    while (currentDir && currentDir !== path.dirname(currentDir)) {
        var readmePath = path.join(currentDir, 'README.md');
        if (fs.existsSync(readmePath)) {
            try {
                var readmeContent = fs.readFileSync(readmePath, 'utf8');
                var readmeFrontmatter = frontmatter_parser_1.FrontmatterParser.extract(readmeContent).frontmatter;
                // Only ignore entire section if README has 'llms: ignore' (not 'ignore-file')
                if (readmeFrontmatter.llms === 'ignore' || readmeFrontmatter.llms === false) {
                    return true;
                }
            }
            catch (error) {
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
function processContent(filePath_1, baseDir_1) {
    return __awaiter(this, arguments, void 0, function (filePath, baseDir, includeCodeBlocks, fileMapping, config, language) {
        var rawContent, _a, title, content, frontmatter, error_1;
        if (includeCodeBlocks === void 0) { includeCodeBlocks = false; }
        if (fileMapping === void 0) { fileMapping = null; }
        if (config === void 0) { config = null; }
        if (language === void 0) { language = null; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    if (!fs.existsSync(filePath)) {
                        console.warn("\u26A0\uFE0F File not found: ".concat(filePath));
                        return [2 /*return*/, { title: '', content: '', frontmatter: {}, filePath: filePath, sidebarPosition: 999, relativeUrl: '' }];
                    }
                    rawContent = fs.readFileSync(filePath, 'utf8');
                    // Check if this file should be excluded from LLM output
                    if (frontmatter_parser_1.FrontmatterParser.shouldIgnore(rawContent)) {
                        return [2 /*return*/, null]; // Return null to indicate this file should be skipped
                    }
                    return [4 /*yield*/, parseMarkdownContent(rawContent, baseDir, includeCodeBlocks, filePath, fileMapping, config, language)];
                case 1:
                    _a = _b.sent(), title = _a.title, content = _a.content, frontmatter = _a.frontmatter;
                    // Check if this file should be ignored due to section-wide filtering
                    if (shouldIgnoreFileBySection(filePath)) {
                        return [2 /*return*/, null]; // Return null to indicate this file should be skipped
                    }
                    return [2 /*return*/, {
                            title: title,
                            content: content || '',
                            frontmatter: frontmatter || {},
                            filePath: filePath,
                            sidebarPosition: frontmatter.sidebar_position || 999,
                            relativeUrl: generateRelativeUrl(filePath, baseDir)
                        }];
                case 2:
                    error_1 = _b.sent();
                    console.error("\u274C Error processing file ".concat(filePath, ":"), error_1.message);
                    throw error_1; // Re-throw to fail the build
                case 3: return [2 /*return*/];
            }
        });
    });
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
function parseMarkdownContent(rawContent, baseDir, includeCodeBlocks, filePath, fileMapping, config, language) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, frontmatter, contentWithoutFrontmatter, content, h1Match, title;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = frontmatter_parser_1.FrontmatterParser.extract(rawContent), frontmatter = _a.frontmatter, contentWithoutFrontmatter = _a.content;
                    content = contentWithoutFrontmatter;
                    h1Match = content.match(/^#\s+(.+)$/m);
                    if (!h1Match) {
                        throw new Error("No # header found in file: ".concat(filePath));
                    }
                    title = h1Match[1].trim();
                    // Remove import statements
                    content = content.replace(/^import\s+.*$/gm, '');
                    if (!includeCodeBlocks) return [3 /*break*/, 2];
                    return [4 /*yield*/, processFileCodeBlocks(content, baseDir)];
                case 1:
                    content = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    // Remove FileCodeBlock components for small version
                    content = content.replace(/<FileCodeBlock[\s\S]*?\/>/g, '[Code example removed for brevity]');
                    _b.label = 3;
                case 3:
                    // Clean up MDX-specific syntax while preserving markdown
                    content = cleanMdxSyntax(content);
                    // Fix internal relative links
                    content = fixInternalLinks(content, filePath, fileMapping, config, language);
                    // Remove excessive whitespace
                    content = content.replace(/\n{3,}/g, '\n\n').trim();
                    return [2 /*return*/, { title: title, content: content, frontmatter: frontmatter }];
            }
        });
    });
}
/**
 * Processes FileCodeBlock components and includes the referenced code
 * @param content - Content containing FileCodeBlock components
 * @param baseDir - Base directory for resolving paths
 * @returns Content with FileCodeBlocks replaced by actual code
 */
function processFileCodeBlocks(content, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var fileCodeBlockRegex, processedContent, match, attributes, src, lang, codeContent, codeBlock, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileCodeBlockRegex = /<FileCodeBlock\s+([^>]+)\/>/g;
                    processedContent = content;
                    _a.label = 1;
                case 1:
                    if (!((match = fileCodeBlockRegex.exec(content)) !== null)) return [3 /*break*/, 6];
                    attributes = parseAttributes(match[1]);
                    src = attributes.src, lang = attributes.lang;
                    if (!src) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, loadCodeFile(src, baseDir)];
                case 3:
                    codeContent = _a.sent();
                    codeBlock = "```".concat(lang || 'typescript', "\n").concat(codeContent, "\n```");
                    processedContent = processedContent.replace(match[0], codeBlock);
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.warn("\u26A0\uFE0F Could not load code file ".concat(src, ":"), error_2.message);
                    processedContent = processedContent.replace(match[0], "[Code file not found: ".concat(src, "]"));
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 1];
                case 6: return [2 /*return*/, processedContent];
            }
        });
    });
}
/**
 * Loads code content from a file referenced by FileCodeBlock
 * @param src - Source path from FileCodeBlock (e.g., "/generated-snippets/ts/example.ts")
 * @param baseDir - Base directory
 * @returns Code content
 */
function loadCodeFile(src, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var filePath;
        return __generator(this, function (_a) {
            if (src.startsWith('/')) {
                filePath = path.join(baseDir, 'static', src.substring(1));
            }
            else {
                filePath = path.join(baseDir, 'static', src);
            }
            if (fs.existsSync(filePath)) {
                return [2 /*return*/, fs.readFileSync(filePath, 'utf8').trim()];
            }
            else {
                throw new Error("File not found: ".concat(filePath));
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Parses attributes from JSX-style attribute string
 * @param attributeString - String containing attributes
 * @returns Parsed attributes
 */
function parseAttributes(attributeString) {
    var attributes = {};
    var regex = /(\w+)=["']([^"']+)["']/g;
    var match;
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
function cleanMdxSyntax(content) {
    var cleaned = content;
    // Remove JSX components (except code blocks which are handled separately)
    cleaned = cleaned.replace(/<\/?[A-Z][^>]*>/g, '');
    // Remove empty JSX fragments
    cleaned = cleaned.replace(/<>\s*<\/>/g, '');
    // Remove JSX expressions but keep the content if it's simple text
    // IMPORTANT: Don't process content inside code blocks (```)
    var codeBlockRegex = /```[\s\S]*?```/g;
    var codeBlocks = [];
    // Extract code blocks temporarily
    cleaned = cleaned.replace(codeBlockRegex, function (match) {
        codeBlocks.push(match);
        return "___CODE_BLOCK_".concat(codeBlocks.length - 1, "___");
    });
    // Now remove JSX expressions outside code blocks
    cleaned = cleaned.replace(/\{([^{}]+)\}/g, function (match, expr) {
        // Keep simple text expressions, remove complex ones
        if (expr.includes('(') || expr.includes('.') || expr.includes('[')) {
            return '';
        }
        return expr;
    });
    // Restore code blocks
    cleaned = cleaned.replace(/___CODE_BLOCK_(\d+)___/g, function (match, index) {
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
function generateRelativeUrl(filePath, baseDir) {
    var relativePath = path.relative(path.join(baseDir, 'docs'), filePath);
    // Convert file path to URL format
    var url = relativePath
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
function fixInternalLinks(content, currentFilePath, fileMapping, config, language) {
    // Pattern to match markdown links: [text](link)
    var linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    return content.replace(linkRegex, function (match, text, link) {
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
            var cleanLink = link.split('#')[0].replace(/\.(md|mdx)$/, '');
            // If it's just a filename without path separators, it's likely a sibling file
            if (!cleanLink.includes('/')) {
                // Try to resolve using file mapping first
                if (fileMapping) {
                    var currentDir = path.dirname(currentFilePath);
                    var possiblePath = path.join(currentDir, cleanLink + '.md');
                    var possibleMdxPath = path.join(currentDir, cleanLink + '.mdx');
                    // Look for the file in the mapping
                    for (var _i = 0, _a = fileMapping.entries(); _i < _a.length; _i++) {
                        var _b = _a[_i], sourcePath = _b[0], generatedName = _b[1];
                        // Check exact path match or basename match
                        if (sourcePath === possiblePath ||
                            sourcePath === possibleMdxPath ||
                            path.basename(sourcePath, '.md') === cleanLink ||
                            path.basename(sourcePath, '.mdx') === cleanLink) {
                            // Generate full URL if config and language are provided
                            if (config && language) {
                                var cleanUrl = config.url.replace(/\/$/, '');
                                var cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
                                var fullBaseUrl = "".concat(cleanUrl).concat(cleanBaseUrl);
                                return "[".concat(text, "](").concat(fullBaseUrl, "llms_docs/docs_").concat(language, "/").concat(generatedName, ".txt)");
                            }
                            else {
                                return "[".concat(text, "](").concat(generatedName, ".txt)");
                            }
                        }
                    }
                }
                // Fallback to simple conversion
                var safeFileName = cleanLink
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                    .substring(0, 50)
                    || 'untitled';
                // Generate full URL if config and language are provided
                if (config && language) {
                    var cleanUrl = config.url.replace(/\/$/, '');
                    var cleanBaseUrl = config.baseUrl.startsWith('/') ? config.baseUrl : '/' + config.baseUrl;
                    var fullBaseUrl = "".concat(cleanUrl).concat(cleanBaseUrl);
                    return "[".concat(text, "](").concat(fullBaseUrl, "llms_docs/docs_").concat(language, "/").concat(safeFileName, ".txt)");
                }
                else {
                    return "[".concat(text, "](").concat(safeFileName, ".txt)");
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
function extractSummary(content, maxLength) {
    if (maxLength === void 0) { maxLength = 200; }
    // Remove markdown formatting for summary
    var summary = content
        .replace(/#+\s*/g, '') // Remove headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
        .trim();
    // Get first paragraph
    var firstParagraph = summary.split('\n\n')[0];
    // Truncate if too long
    if (firstParagraph.length > maxLength) {
        return firstParagraph.substring(0, maxLength).trim() + '...';
    }
    return firstParagraph;
}
