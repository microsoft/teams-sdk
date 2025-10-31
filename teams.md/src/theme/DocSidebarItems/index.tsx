import React, { useMemo, useRef } from 'react';
import DocSidebarItemsOriginal from '@theme-original/DocSidebarItems';
import type { Props } from '@theme/DocSidebarItems';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import { getLanguageFromPathStrict } from '../../utils/languageUtils';

function buildItemsSignature(items: Props['items']): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => {
      if ('href' in item && typeof item.href === 'string') return `L:${item.href}`;
      if ('items' in item && Array.isArray(item.items)) {
        const children = item.items;
        // String of all child hrefs in a category
        const childSig = children
          .map((ch) => ('href' in ch && typeof ch.href === 'string' ? ch.href : '#'))
          .join(',');
        return `C:[${childSig}]`;
      }
      return 'OTHER';
    })
    .join('|');
}

export default function DocSidebarItems(props: Props): React.JSX.Element {
  const location = useLocation();
  const baseUrl = useBaseUrl('/');
  const { language: preferredLanguage } = useLanguagePreference();

  const sidebarRef = useRef<Map<string, Props['items']>>(new Map());

  // Use language from URL if present, otherwise fall back to user preference
  const urlLanguage = getLanguageFromPathStrict(location.pathname, baseUrl);
  const currentLanguage = urlLanguage || preferredLanguage;

  // Filter to show /docs/main content + current language content only
  const filteredItems = useMemo(() => {
    if (sidebarRef.current.has(currentLanguage)) {
      return sidebarRef.current.get(currentLanguage)!;
    }

    const items = Array.isArray(props.items) ? props.items : [];

    // Cache language detection per href
    const langCache = new Map<string, string | null>();

    const getCachedLanguage = (href: string) => {
      if (!langCache.has(href)) {
        langCache.set(href, getLanguageFromPathStrict(href, baseUrl));
      }
      return langCache.get(href);
    };

    const result = items.filter((item) => {
      // Sidebar item properties
      const itemHref = 'href' in item ? item.href : undefined;

      // For category items, check if they have children that would indicate language content
      if ('items' in item && item.items && Array.isArray(item.items)) {
        // Check if any child item has a language-specific href
        let hasLanguageContent = false;
        let firstLanguageMatch: string | null = null;

        for (const child of item.items) {
          const h = 'href' in child && typeof child.href === 'string' ? child.href : undefined;

          if (!h) {
            continue;
          }
          const l = getCachedLanguage(h);

          if (l !== null) {
            hasLanguageContent = true;

            if (firstLanguageMatch === null) {
              firstLanguageMatch = l;
              break;
            }
          }
        }

        // If this category contains language-specific content, check if it matches current language
        if (hasLanguageContent) {
          return firstLanguageMatch === currentLanguage;
        }
      }

      // Check if this item corresponds to a language directory by examining its href
      if (itemHref && typeof itemHref === 'string') {
        // Use explicit language detection that returns null if no language found
        const itemLanguage = getCachedLanguage(itemHref);

        // If this item links to a language directory, only show if it matches current language
        if (itemLanguage !== null) {
          return itemLanguage === currentLanguage;
        }
      }

      // For anything else (individual docs, categories without language context), keep them all
      return true;
    });

    sidebarRef.current.set(currentLanguage, result);

    return result;
  }, [buildItemsSignature(props.items), baseUrl, currentLanguage]);

  // Pass filtered items to original component
  return <DocSidebarItemsOriginal {...props} items={filteredItems} />;
}
