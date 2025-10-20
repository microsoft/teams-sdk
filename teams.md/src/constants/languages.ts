/**
 * Supported languages for Teams AI documentation
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
