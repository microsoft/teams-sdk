import { PropsWithChildren } from 'react';
import { useLocation } from '@docusaurus/router';
import { type Language } from '../constants/languages';

export type LanguageProps = {
  readonly language: Language;
};

// Component for inserting language-specific content onto a page.
export default function Language({ language, children }: PropsWithChildren<LanguageProps>) {
  const location = useLocation();

  // Only render if current path matches language
  if (!location.pathname.includes(`/${language}/`)) {
    return null;
  }

  return <>{children}</>;
}
