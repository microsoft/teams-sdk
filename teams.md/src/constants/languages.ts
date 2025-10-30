/**
 * Supported languages for Teams SDK documentation
 * This is the single source of truth for all language-related code
 */
export const LANGUAGES = ['typescript', 'csharp', 'python'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES = {
  typescript: 'TypeScript',
  csharp: 'C#',
  python: 'Python',
} as const;

export const DEFAULT_LANGUAGE: Language = 'typescript';

/**
 * Maps page paths to arrays of languages where the page is NOT available
 * e.g. Typescript has activity-ref.md but C# and Python do not.
 */
export interface LanguageAvailabilityMap {
  [path: string]: Language[];
}
