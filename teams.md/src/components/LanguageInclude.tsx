import { PropsWithChildren } from 'react';

// language-include-plugin populates children at build time
export default function LanguageInclude({ children }: PropsWithChildren) {
  return <>{children}</>;
}
