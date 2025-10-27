import { type Language, type LanguageAvailabilityMap } from '../constants/languages';

// Cache for the missing pages data
let missingPagesCache: LanguageAvailabilityMap | null = null;

/**
 * Check if a page exists for a specific language by consulting the missing pages manifest
 * @param pagePath - The manifest path
 * @param language - The target language to check
 * @returns Promise<boolean> - true: page available; else false
 */
export async function isPageAvailableForLanguage(pagePath: string, language: Language): Promise<boolean> {
  if (!missingPagesCache) {
    try {
      const response = await fetch('/teams-ai/missing-pages.json');
      if (response.ok) {
        missingPagesCache = await response.json();
      } else {
        missingPagesCache = {};
      }
    } catch {
      missingPagesCache = {};
    }
  }

  const unavailableLanguages = missingPagesCache[pagePath];
  // If page is found, it's unavailable for the specified language(s)
  return !unavailableLanguages || !unavailableLanguages.includes(language);
}
