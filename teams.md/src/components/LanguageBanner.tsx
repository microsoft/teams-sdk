import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LANGUAGE_NAMES, type Language } from '../constants/languages';

interface LanguageBannerProps {
  targetLanguage: Language;
  baseUrl: string;
  onDismiss: () => void;
}

export default function LanguageBanner({
  targetLanguage,
  baseUrl,
  onDismiss,
}: LanguageBannerProps) {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleGoToLanguageDocs = () => {
    window.location.href = `${baseUrl}${targetLanguage}/`;
  };

  // Find the container to render the banner in - prefer docMainContainer for proper width
  const container =
    document.querySelector('.docMainContainer') ||
    document.querySelector('main') ||
    document.querySelector('.main-wrapper') ||
    document.querySelector('[role="main"]') ||
    document.body;

  return createPortal(
    <div aria-live="polite" className="language-banner">
      <div className="language-banner__content">
        <div className="language-banner__text">
          <strong>This page isn't available for {LANGUAGE_NAMES[targetLanguage]}.&nbsp;</strong>
          Go to the {LANGUAGE_NAMES[targetLanguage]} documentation home instead?
        </div>
        <div className="language-banner__actions">
          <button
            className="language-banner__button language-banner__button--primary"
            onClick={handleGoToLanguageDocs}
          >
            Go to {LANGUAGE_NAMES[targetLanguage]} docs
          </button>
          <button
            aria-label="Close"
            title="Close"
            className="language-banner__button language-banner__button--secondary"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
      </div>
    </div>,
    container
  );
}
