import React, { ReactNode } from 'react';
import { LanguageProvider } from '../hooks/useLanguagePreference';

// Provide language context to the entire docusaurus app
export default function Root({ children }: { children: ReactNode }): React.JSX.Element {
  return <LanguageProvider>{children}</LanguageProvider>;
}
