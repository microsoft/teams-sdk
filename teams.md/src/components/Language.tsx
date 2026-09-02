import { PropsWithChildren } from 'react';
import { useLocation } from '@docusaurus/router';
import { type Language } from '../constants/languages';

export type LanguageProps = {
  readonly language: Language | readonly Language[];
};

// Component for inserting language-specific content onto a page.
export default function Language({ language, children }: PropsWithChildren<LanguageProps>) {
  const location = useLocation();

  const languages = Array.isArray(language) ? language : [language as Language];

  // Only render if current path matches one of the languages
  if (!languages.some((lang) => location.pathname.includes(`/${lang}/`))) {
    return null;
  }

  return <>{children}</>;
}
