import React from 'react';
import DocSidebarItemsOriginal from '@theme-original/DocSidebarItems';
import type { Props } from '@theme/DocSidebarItems';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import { detectLanguageInPath } from '../../utils/languageUtils';

export default function DocSidebarItems(props: Props): React.JSX.Element {
  const location = useLocation();
  const baseUrl = useBaseUrl('/');
  const { language: preferredLanguage } = useLanguagePreference();

  // Use language from URL if present, otherwise fall back to user preference
  const urlLanguage = detectLanguageInPath(location.pathname, baseUrl);
  const currentLanguage = urlLanguage || preferredLanguage;

  // Filter to show /docs/main content + current language content only
  const filteredItems = props.items.filter((item) => {
    // Sidebar item properties
    const itemHref = 'href' in item ? item.href : undefined;

    // For category items, check if they have children that would indicate language content
    if ('items' in item && item.items && Array.isArray(item.items)) {
      // Check if any child item has a language-specific href
      const hasLanguageContent = item.items.some((childItem: any) => {
        const childHref = 'href' in childItem ? childItem.href : undefined;
        if (childHref && typeof childHref === 'string') {
          const childLanguage = detectLanguageInPath(childHref, baseUrl);
          return childLanguage !== null;
        }
        return false;
      });

      // If this category contains language-specific content, check if it matches current language
      if (hasLanguageContent) {
        const categoryLanguage = item.items.find((childItem: any) => {
          const childHref = 'href' in childItem ? childItem.href : undefined;
          if (childHref && typeof childHref === 'string') {
            return detectLanguageInPath(childHref, baseUrl) !== null;
          }
          return false;
        });

        if (categoryLanguage) {
          const childHref = 'href' in categoryLanguage ? categoryLanguage.href : undefined;
          if (childHref && typeof childHref === 'string') {
            const detectedLang = detectLanguageInPath(childHref, baseUrl);
            return detectedLang === currentLanguage;
          }
        }
        return false;
      }
    }

    // Check if this item corresponds to a language directory by examining its href
    if (itemHref && typeof itemHref === 'string') {
      // Use explicit language detection that returns null if no language found
      const itemLanguage = detectLanguageInPath(itemHref, baseUrl);

      // If this item links to a language directory, only show if it matches current language
      if (itemLanguage !== null) {
        return itemLanguage === currentLanguage;
      }
    }

    // For anything else (individual docs, categories without language context), keep them all
    return true;
  });

  // Pass filtered items to original component
  return <DocSidebarItemsOriginal {...props} items={filteredItems} />;
}
