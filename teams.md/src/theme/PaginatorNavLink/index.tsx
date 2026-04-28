import React from 'react';
import PaginatorNavLinkOriginal from '@theme-original/PaginatorNavLink';
import type { Props } from '@theme/PaginatorNavLink';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import {
  getLanguageFromPathStrict,
  getManifestPathFromUrl,
  replaceLanguageInPath,
} from '../../utils/languageUtils';
import missingPages from '../../../static/missing-pages.json';

const missingPagesMap = missingPages as Record<string, string[]>;

export default function PaginatorNavLink(props: Props): React.JSX.Element {
  const baseUrl = useBaseUrl('/');
  const location = useLocation();
  const { language: preferredLanguage } = useLanguagePreference();

  if (!props.permalink) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  const languageInPermalink = getLanguageFromPathStrict(props.permalink, baseUrl);
  if (languageInPermalink === null) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  // Prefer the language of the current page so SSR renders pagination that stays inside the
  // section the reader is in. Fall back to user preference for non-language pages.
  const urlLanguage = getLanguageFromPathStrict(location.pathname, baseUrl);
  const targetLanguage = urlLanguage ?? preferredLanguage;

  if (languageInPermalink === targetLanguage) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  // Don't rewrite when the target language doesn't have the page — that would emit a broken URL.
  // Leaving the original permalink keeps the existing cross-language pagination behavior.
  const manifestPath = getManifestPathFromUrl(props.permalink, baseUrl);
  if (missingPagesMap[manifestPath]?.includes(targetLanguage)) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  const correctedPermalink = replaceLanguageInPath(props.permalink, baseUrl, targetLanguage);
  return <PaginatorNavLinkOriginal {...props} permalink={correctedPermalink} />;
}
