import React, { useState } from 'react';
import OriginalDocItemLayout from '@theme-original/DocItem/Layout';
import type { Props } from '@theme/DocItem/Layout';
import { useDoc } from '@docusaurus/plugin-content-docs/client';

function CopyIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyForLLMButton(): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const article = document.querySelector('article');
    if (!article) return;
    navigator.clipboard.writeText(article.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="llm-copy-bar">
      <button
        className={`llm-copy-button${copied ? ' llm-copy-button--copied' : ''}`}
        onClick={handleCopy}
        aria-label={copied ? 'Copied!' : 'Copy page content for LLM'}
        title="Copy page content for LLM"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied!' : 'Copy for LLM'}
      </button>
    </div>
  );
}

export default function DocItemLayout(props: Props): React.JSX.Element {
  const { frontMatter } = useDoc();
  const isLLMIgnored = frontMatter['llms'] === 'ignore';

  return (
    <>
      {!isLLMIgnored && <CopyForLLMButton />}
      <OriginalDocItemLayout {...props} />
    </>
  );
}
