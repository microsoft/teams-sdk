"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontmatterParser = void 0;
var fs = require("fs");
/**
 * Regular expression to match YAML frontmatter at the start of a file
 * Matches content between --- delimiters
 */
var FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
/**
 * Parser for YAML frontmatter in markdown/MDX files
 */
var FrontmatterParser = /** @class */ (function () {
    function FrontmatterParser() {
    }
    /**
     * Extracts and parses frontmatter from content
     * @param content - Raw file content
     * @returns Object with parsed frontmatter and content without frontmatter
     */
    FrontmatterParser.extract = function (content) {
        var match = content.match(FRONTMATTER_REGEX);
        if (!match) {
            return {
                frontmatter: {},
                content: content,
                hasFrontmatter: false
            };
        }
        var frontmatter = this.parse(match[1]);
        var contentWithoutFrontmatter = content.replace(match[0], '').trimStart();
        return {
            frontmatter: frontmatter,
            content: contentWithoutFrontmatter,
            hasFrontmatter: true
        };
    };
    /**
     * Parses frontmatter text into an object
     * @param frontmatterText - Raw frontmatter content (without --- delimiters)
     * @returns Parsed frontmatter object
     */
    FrontmatterParser.parse = function (frontmatterText) {
        var frontmatter = {};
        var lines = frontmatterText.split('\n');
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var match = line.match(/^(\w+):\s*(.+)$/);
            if (!match)
                continue;
            var key = match[1];
            var value = match[2].trim();
            value = this._parseValue(value);
            frontmatter[key] = value;
        }
        return frontmatter;
    };
    /**
     * Extracts frontmatter from a file
     * @param filePath - Path to the file
     * @returns Parsed frontmatter or null if file doesn't exist
     */
    FrontmatterParser.extractFromFile = function (filePath) {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            var content = fs.readFileSync(filePath, 'utf8');
            return this.extract(content);
        }
        catch (error) {
            console.warn("\u26A0\uFE0F Error reading frontmatter from ".concat(filePath, ":"), error.message);
            return null;
        }
    };
    /**
     * Gets a specific property from frontmatter
     * @param content - File content or path
     * @param propertyName - Property to extract
     * @param defaultValue - Default value if property not found
     * @returns Property value or default
     */
    FrontmatterParser.getProperty = function (content, propertyName, defaultValue) {
        var result = typeof content === 'string' && fs.existsSync(content)
            ? this.extractFromFile(content)
            : this.extract(content);
        if (!result) {
            return defaultValue;
        }
        var frontmatter = result.frontmatter;
        return frontmatter[propertyName] !== undefined
            ? frontmatter[propertyName]
            : defaultValue;
    };
    /**
     * Checks if a file or content should be ignored based on frontmatter
     * @param content - File content or path
     * @returns True if should be ignored
     */
    FrontmatterParser.shouldIgnore = function (content) {
        var result = typeof content === 'string' && fs.existsSync(content)
            ? this.extractFromFile(content)
            : this.extract(content);
        if (!result) {
            return false;
        }
        var frontmatter = result.frontmatter;
        var llmsValue = frontmatter.llms;
        return llmsValue === 'ignore' || llmsValue === 'ignore-file' || llmsValue === false;
    };
    /**
     * Parses a value from frontmatter, converting types as needed
     * @private
     * @param value - Raw value string
     * @returns Parsed value (string, number, boolean)
     */
    FrontmatterParser._parseValue = function (value) {
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        // Parse booleans
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        // Parse integers
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        // Return as string
        return value;
    };
    return FrontmatterParser;
}());
exports.FrontmatterParser = FrontmatterParser;
