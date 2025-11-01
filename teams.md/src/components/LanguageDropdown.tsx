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

  const [bannerRender, setBannerRender] = useState<{ language: Language } | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const languagesArray = Object.entries(LANGUAGE_NAMES);

  const getLanguageIndex = (lang: Language): number => {
    return Math.max(
      0,
      languagesArray.findIndex(([l]) => l === lang)
    );
  };

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
          // Debugging output
          console.log('[LanguageDropdown] Checking page availability:', {
            manifestPath,
            newLanguage,
          });
          // Check if target page exists for the new language using availability data
          const pageExists = await isPageAvailableForLanguage(manifestPath, newLanguage);
          console.log('[LanguageDropdown] Page exists result:', {
            manifestPath,
            newLanguage,
            pageExists,
          });

          if (pageExists) {
            history.push(targetUrl);
          } else {
            // Page doesn't exist, show redirect banner instead of navigating
            setBannerRender({ language: newLanguage });
          }
        } catch (error) {
          console.error('Error checking page availability:', error, { manifestPath, newLanguage });
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

  const openListbox = () => {
    setIsOpen(true);
    setFocusedIndex(getLanguageIndex(language));
    // Move focus to listbox
    setTimeout(() => listRef.current?.focus(), 0);
  };

  const closeListbox = () => {
    setIsOpen(false);
    setFocusedIndex(null);
    buttonRef.current?.focus();
  };

  const handleButtonClick = () => {
    if (isOpen) {
      closeListbox();
    } else {
      openListbox();
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLButtonElement> = (e) => {
    const next = e.relatedTarget as Node | null;
    if (!next || !listRef.current?.contains(next)) {
      // If focus didn’t move into the listbox, close
      setIsOpen(false);
    }
  };
  const handleButtonKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        openListbox();
      }
    }
  };

  // Keyboard navigation handling
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLUListElement>) => {
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
      case 'Tab':
        closeListbox();
        break;
      case 'Escape':
        e.preventDefault();
        closeListbox();
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex !== null) {
          const [lang] = languagesArray[focusedIndex];
          handleLanguageChange(lang as Language);
          closeListbox();
        }
        break;
    }
  };

  const handleOptionClick = (language: Language) => {
    handleLanguageChange(language);
    closeListbox();
  };

  const handleOptionMouseMove = (index: number) => {
    setFocusedIndex(index);
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
    <div className={`language-dropdown ${className}`.trim()} {...otherProps}>
      <button
        type="button"
        ref={buttonRef}
        id="language-switch-dropdown-button"
        // Docusaurus navbar styling
        className="navbar__link"
        onBlur={handleBlur}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        aria-controls="language-switch-list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${LANGUAGE_NAMES[language]}. Open to change language.`}
      >
        {LANGUAGE_NAMES[language]}
        {/* Visual dropdown indicator arrow - aria-hidden ok */}
        <span aria-hidden="true" className="language-dropdown-arrow"></span>
      </button>
      {isOpen && (
        <ul
          id="language-switch-list"
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label="Language"
          aria-activedescendant={
            focusedIndex !== null ? `selection-${languagesArray[focusedIndex][0]}` : undefined
          }
          onKeyDown={handleListKeyDown}
        >
          {Object.entries(LANGUAGE_NAMES).map(([lang, label], index) => (
            <li
              aria-selected={lang === language}
              key={lang}
              id={`selection-${lang}`}
              role="option"
              data-active={focusedIndex === index}
              className="language-dropdown-option"
              onClick={() => handleOptionClick(lang as Language)}
              onMouseMove={() => handleOptionMouseMove(index)}
            >
              {label}
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
