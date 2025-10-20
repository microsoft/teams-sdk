import { LANGUAGES, type Language } from '../constants/languages';

/**
 * Creates the regex pattern for matching language paths
 * @param baseUrl - The base URL
 * @returns RegExp for matching language paths
 */
function createLanguagePattern(baseUrl: string): RegExp {
  return new RegExp(`^${baseUrl}(${LANGUAGES.join('|')})(/|$)`);
}

/**
 * Gets the current language from a URL pathname
 * @param pathname - The current pathname (e.g. from useLocation)
 * @param baseUrl - The base URL (e.g. from useBaseUrl)
 * @returns The detected language or 'typescript' as fallback
 */
export function getLanguageFromPath(pathname: string, baseUrl: string): Language {
  const languagePattern = createLanguagePattern(baseUrl);
  const match = pathname.match(languagePattern);
  return match ? (match[1] as Language) : 'typescript';
}

/**
 * Detects if a URL contains a language and returns it, or null if none found
 * @param pathname - The pathname to check
 * @param baseUrl - The base URL
 * @returns The detected language or null
 */
export function detectLanguageInPath(pathname: string, baseUrl: string): Language | null {
  const languagePattern = createLanguagePattern(baseUrl);
  const match = pathname.match(languagePattern);
  return match ? (match[1] as Language) : null;
}

/**
 * Replaces the language in a URL path with a new language
 * @param pathname - The pathname to modify
 * @param baseUrl - The base URL
 * @param newLanguage - The new language to replace with
 * @returns The modified pathname, or original if no language was found
 */
export function replaceLanguageInPath(
  pathname: string,
  baseUrl: string,
  newLanguage: Language
): string {
  const languagePattern = createLanguagePattern(baseUrl);
  const match = pathname.match(languagePattern);

  if (match) {
    return pathname.replace(languagePattern, `${baseUrl}${newLanguage}/`);
  }

  return pathname;
}
