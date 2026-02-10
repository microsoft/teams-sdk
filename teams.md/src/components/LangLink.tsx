import React, { type PropsWithChildren } from 'react';
import Link from '@docusaurus/Link';
import { useLanguagePreference } from '../hooks/useLanguagePreference';

interface LangLinkProps {
  /** Path relative to the language root, e.g. "essentials/app-authentication" */
  to: string;
}

/**
 * A link component that automatically prefixes the path with the user's
 * selected language preference.
 *
 * Usage: <LangLink to="essentials/app-authentication">Link text</LangLink>
 * Renders: <a href="/typescript/essentials/app-authentication">Link text</a>
 */
export default function LangLink({ to, children }: PropsWithChildren<LangLinkProps>) {
  const { language } = useLanguagePreference();
  return <Link to={`/${language}/${to}`}>{children}</Link>;
}
