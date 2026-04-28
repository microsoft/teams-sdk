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

type CopyState = 'idle' | 'copied' | 'failed';

function CopyForLLMButton(): React.JSX.Element {
  const [state, setState] = useState<CopyState>('idle');

  const handleCopy = async () => {
    const article = document.querySelector('article');
    if (!article) return;

    const text = (article as HTMLElement).innerText;

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setState('failed');
      setTimeout(() => setState('idle'), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    } finally {
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const label =
    state === 'copied' ? 'Copied!' : state === 'failed' ? 'Copy failed' : 'Copy for LLM';
  const ariaLabel =
    state === 'copied'
      ? 'Copied!'
      : state === 'failed'
        ? 'Copy failed — clipboard unavailable'
        : 'Copy page content for LLM';

  return (
    <div className="llm-copy-bar">
      <button
        type="button"
        className={`llm-copy-button${state === 'copied' ? ' llm-copy-button--copied' : ''}${state === 'failed' ? ' llm-copy-button--failed' : ''}`}
        onClick={handleCopy}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
        {label}
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
