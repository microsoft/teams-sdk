import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { useHistory } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '../constants/languages';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import {
  getLanguageFromPath,
  getLanguageFromPathStrict,
  replaceLanguageInPath,
  getManifestPathFromUrl,
} from '../utils/languageUtils';
import { isPageAvailableForLanguage } from '../utils/pageAvailability';
import LanguageBanner from './LanguageBanner';

interface LanguageDropdownProps {
  // Docusaurus navbar item props
  className?: string;
  position?: 'left' | 'right';
  // Catch for default docusaurus navbar item props
  [key: string]: any;
}

export default function LanguageDropdown(props: LanguageDropdownProps) {
  const { className = '', position, ...otherProps } = props;
  const location = useLocation();
  const history = useHistory();
  const baseUrl = useBaseUrl('/');
  const { language, setLanguage } = useLanguagePreference();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const skipNextSync = useRef(false);
  const optionRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const [bannerRender, setBannerRender] = useState<{ language: Language } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const languagesArray = Object.entries(LANGUAGE_NAMES);

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === language) {
      return;
    }

    skipNextSync.current = true;

    setIsOpen(false);
    setLanguage(newLanguage);

    const currentPath = location.pathname;
    const currentLanguage = getLanguageFromPathStrict(currentPath, baseUrl);

    // Navigate to parallel newLanguage's page if we're currently in a language-specific page
    if (currentLanguage && LANGUAGES.includes(currentLanguage)) {
      const targetUrl = replaceLanguageInPath(currentPath, baseUrl, newLanguage);

      if (targetUrl === currentPath) {
        history.push(`${baseUrl}${newLanguage}/`);
      } else {
        // Convert URL path to manifest path format
        const manifestPath = getManifestPathFromUrl(currentPath, baseUrl);

        try {
          // Check if target page exists for the new language using availability data
          const pageExists = await isPageAvailableForLanguage(manifestPath, newLanguage);

          if (pageExists) {
            history.push(targetUrl);
          } else {
            // Page doesn't exist, show redirect banner instead of navigating
            setBannerRender({ language: newLanguage });
          }
        } catch (error) {
          console.error('Error checking page availability:', error);
          // On error, just navigate normally as fallback
          history.push(targetUrl);
        }
      }
    }
    // No navigation necessary if on a page from `/main/` folder (general content)
  };

  const handleBannerDismiss = () => {
    // Get the current URL language context to restore
    const currentUrlLanguage = getLanguageFromPath(location.pathname, baseUrl);

    // Restore language preference to match the current URL context
    if (currentUrlLanguage && LANGUAGES.includes(currentUrlLanguage)) {
      setLanguage(currentUrlLanguage);
    }

    setBannerRender(null);
  };

  // Keyboard navigation handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLUListElement>) => {
    if (!isOpen) {
      return;
    }

    switch (e.key) {
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(languagesArray.length - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) {
            return 0;
          }
          const nextIndex = prev + 1;
          if (nextIndex >= languagesArray.length) {
            return languagesArray.length - 1;
          }
          return nextIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) {
            return languagesArray.length - 1;
          }
          const nextIndex = prev - 1;
          if (nextIndex < 0) {
            return 0;
          }
          return nextIndex;
        });
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex !== null) {
          const [lang] = languagesArray[focusedIndex];
          handleLanguageChange(lang as Language);
        }
        break;
    }
  };

  // Sync language preference with URL context whenever location changes
  useEffect(() => {
    // prevent URL sync from overriding user update
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    const currentUrlLanguage = getLanguageFromPathStrict(location.pathname, baseUrl);

    if (
      currentUrlLanguage &&
      currentUrlLanguage !== language &&
      !document.title.includes('Page Not Found')
    ) {
      const manifestPath = getManifestPathFromUrl(location.pathname, baseUrl);

      const syncFunction = async () => {
        try {
          const pageExists = await isPageAvailableForLanguage(manifestPath, currentUrlLanguage);
          if (pageExists && language !== currentUrlLanguage) {
            setLanguage(currentUrlLanguage);
          }
        } catch {
          if (language !== currentUrlLanguage) {
            setLanguage(currentUrlLanguage);
          }
        }
      };

      syncFunction();
    }
  }, [location.pathname, baseUrl]);

  useEffect(() => {
    if (focusedIndex !== null) {
      try {
        const [targetLanguage] = languagesArray[focusedIndex];
        // Focus goes to selected button element using direct ref
        const focusButton = optionRefs.current[targetLanguage];
        focusButton?.focus();
      } catch (error) {
        console.warn('LanguageDropdown: Unable to find focusable element');
      }
    }
  }, [focusedIndex]);

  // Return focus to button when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      buttonRef.current?.focus();
    }
  }, [isOpen]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !buttonRef.current?.contains(event.target as Node) &&
        !listRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div
      role="combobox"
      aria-controls="language-switch-list"
      aria-expanded={isOpen}
      aria-label="language-dropdown-div"
      aria-owns="language-switch-list"
      className={`language-dropdown ${className}`.trim()}
      {...otherProps}
    >
      <button
        ref={buttonRef}
        id="language-switch-dropdown-button"
        // Docusaurus navbar styling
        className="navbar__link"
        onBlur={(e) => {
          if (
            !e.currentTarget.contains(e.relatedTarget) &&
            !listRef.current?.contains(e.relatedTarget)
          ) {
            setIsOpen(false);
          }
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          setFocusedIndex(null);
        }}
        onKeyDown={handleKeyDown}
        // Indicates which option is active for screen readers
        aria-activedescendant={
          focusedIndex !== null ? `selection-${languagesArray[focusedIndex][0]}` : undefined
        }
        aria-controls="language-switch-list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${LANGUAGE_NAMES[language]}. Select from dropdown to change language.`}
      >
        {LANGUAGE_NAMES[language]}
        {/* Visual dropdown indicator arrow - aria-hidden ok */}
        <span aria-hidden="true" className="language-dropdown-arrow"></span>
      </button>
      {isOpen && (
        <ul id="language-switch-list" role="listbox" ref={listRef} onKeyDown={handleKeyDown}>
          {Object.entries(LANGUAGE_NAMES).map(([lang, label], index) => (
            <li aria-selected={lang === language} key={lang} id={`selection-${lang}`} role="option">
              <button
                ref={(el) => {
                  optionRefs.current[lang] = el;
                }}
                className="language-dropdown-option"
                onClick={() => handleLanguageChange(lang as Language)}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {bannerRender && (
        <LanguageBanner
          targetLanguage={bannerRender.language}
          baseUrl={baseUrl}
          onDismiss={handleBannerDismiss}
        />
      )}
    </div>
  );
}
