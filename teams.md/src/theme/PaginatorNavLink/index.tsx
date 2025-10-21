import React from 'react';
import PaginatorNavLinkOriginal from '@theme-original/PaginatorNavLink';
import type { Props } from '@theme/PaginatorNavLink';
import useBaseUrl from '@docusaurus/useBaseUrl';

import { useLanguagePreference } from '../../hooks/useLanguagePreference';
import { detectLanguageInPath, replaceLanguageInPath } from '../../utils/languageUtils';

export default function PaginatorNavLink(props: Props): React.JSX.Element {
  const baseUrl = useBaseUrl('/');
  const { language: preferredLanguage } = useLanguagePreference();

  // If no permalink, use original behavior
  if (!props.permalink) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  // Check if the permalink contains a language path
  const languageInPermalink = detectLanguageInPath(props.permalink, baseUrl);

  // If the link contains a language path, update it to match current preferred language
  if (languageInPermalink !== null && languageInPermalink !== preferredLanguage) {
    const correctedPermalink = replaceLanguageInPath(props.permalink, baseUrl, preferredLanguage);
    return <PaginatorNavLinkOriginal {...props} permalink={correctedPermalink} />;
  }

  // Otherwise use original
  return <PaginatorNavLinkOriginal {...props} />;
}
