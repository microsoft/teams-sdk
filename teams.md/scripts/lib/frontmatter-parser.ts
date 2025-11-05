import * as fs from 'fs';
import * as yaml from 'js-yaml';

import readFileUtf8Normalized from '../../src/utils/readFileUtf8Normalized';

/**
 * Regular expression to match YAML frontmatter at the start of a file
 * Matches content between --- delimiters
 */
export const FRONTMATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---/;

interface FrontmatterData {
    [key: string]: string | number | boolean;
}

interface ExtractResult {
    frontmatter: FrontmatterData;
    content: string;
    hasFrontmatter: boolean;
}

/**
 * Parser for YAML frontmatter in markdown/MDX files
 */
export class FrontmatterParser {
    /**
     * Extracts and parses frontmatter from content using js-yaml
     * @param content - Raw file content
     * @returns Object with parsed frontmatter and content without frontmatter
     */
    static extract(content: string): ExtractResult {
        const match = content.match(FRONTMATTER_REGEX);

        if (!match) {
            return {
                frontmatter: {},
                content: content,
                hasFrontmatter: false
            };
        }

        try {
            // Use js-yaml for robust YAML parsing instead of custom parser
            const frontmatter = yaml.load(match[1]) as FrontmatterData || {};
            const contentWithoutFrontmatter = content.replace(match[0], '').trimStart();

            return {
                frontmatter,
                content: contentWithoutFrontmatter,
                hasFrontmatter: true
            };
        } catch (error) {
            console.warn(`Warning: Error parsing frontmatter with js-yaml, falling back to simple parser:`, error);
            // Fallback to simple parser
            const frontmatter = this.parseSimple(match[1]);
            const contentWithoutFrontmatter = content.replace(match[0], '').trimStart();

            return {
                frontmatter,
                content: contentWithoutFrontmatter,
                hasFrontmatter: true
            };
        }
    }

    /**
     * Parses frontmatter text into an object (simple parser - kept for fallback)
     * @param frontmatterText - Raw frontmatter content (without --- delimiters)
     * @returns Parsed frontmatter object
     */
    static parseSimple(frontmatterText: string): FrontmatterData {
        const frontmatter: FrontmatterData = {};
        const lines = frontmatterText.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (!match) continue;

            const key = match[1];
            let value: string | number | boolean = match[2].trim();

            value = this._parseValue(value);
            frontmatter[key] = value;
        }

        return frontmatter;
    }

    /**
     * Extracts frontmatter from a file
     * @param filePath - Path to the file
     * @returns Parsed frontmatter or null if file doesn't exist
     */
    static extractFromFile(filePath: string): ExtractResult | null {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            const content = readFileUtf8Normalized(filePath);
            return this.extract(content);
        } catch (error) {
            console.warn(`⚠️ Error reading frontmatter from ${filePath}:`, (error as Error).message);
            return null;
        }
    }

    /**
     * Gets a specific property from frontmatter
     * @param content - File content or path
     * @param propertyName - Property to extract
     * @param defaultValue - Default value if property not found
     * @returns Property value or default
     */
    static getProperty<T = any>(content: string, propertyName: string, defaultValue?: T): T | undefined {
        const result = typeof content === 'string' && fs.existsSync(content)
            ? this.extractFromFile(content)
            : this.extract(content);

        if (!result) {
            return defaultValue;
        }

        const { frontmatter } = result;

        return frontmatter[propertyName] !== undefined
            ? (frontmatter[propertyName] as T)
            : defaultValue;
    }

    /**
     * Checks if a file or content should be ignored based on frontmatter
     * @param content - File content or path
     * @returns True if should be ignored
     */
    static shouldIgnore(content: string): boolean {
        const result = typeof content === 'string' && fs.existsSync(content)
            ? this.extractFromFile(content)
            : this.extract(content);

        if (!result) {
            return false;
        }

        const { frontmatter } = result;
        const llmsValue = frontmatter.llms;
        return llmsValue === 'ignore' || llmsValue === 'ignore-file' || llmsValue === false;
    }

    /**
     * Parses a value from frontmatter, converting types as needed
     * @private
     * @param value - Raw value string
     * @returns Parsed value (string, number, boolean)
     */
    private static _parseValue(value: string): string | number | boolean {
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        // Parse booleans
        if (value === 'true') return true;
        if (value === 'false') return false;

        // Parse integers
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }

        // Return as string
        return value;
    }
}
