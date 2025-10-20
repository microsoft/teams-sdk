import React from 'react';
import PaginatorNavLinkOriginal from '@theme-original/PaginatorNavLink';
import type { Props } from '@theme/PaginatorNavLink';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getLanguageFromPath, replaceLanguageInPath } from '../../utils/languageUtils';

export default function PaginatorNavLink(props: Props): React.JSX.Element {
  const location = useLocation();
  const baseUrl = useBaseUrl('/');

  // If no permalink, use original behavior
  if (!props.permalink) {
    return <PaginatorNavLinkOriginal {...props} />;
  }

  const currentLanguage = getLanguageFromPath(location.pathname, baseUrl);
  const correctedPermalink = replaceLanguageInPath(props.permalink, baseUrl, currentLanguage);

  // If the permalink was modified (had a different language), use the corrected one
  if (correctedPermalink !== props.permalink) {
    return <PaginatorNavLinkOriginal {...props} permalink={correctedPermalink} />;
  }

  // Otherwise use original
  return <PaginatorNavLinkOriginal {...props} />;
}
