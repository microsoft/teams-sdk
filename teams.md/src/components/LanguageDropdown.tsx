import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { useHistory } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '../constants/languages';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { getLanguageFromPath, replaceLanguageInPath } from '../utils/languageUtils';

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
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const languagesArray = Object.entries(LANGUAGE_NAMES);

  const handleLanguageChange = (newLanguage: Language) => {
    if (newLanguage === language) {
      return;
    }

    setIsOpen(false);
    setLanguage(newLanguage);

    const currentPath = location.pathname;
    const currentLanguage = getLanguageFromPath(currentPath, baseUrl);

    // Navigate to parallel newLanguage's page if we're currently in a language-specific page
    if (LANGUAGES.includes(currentLanguage)) {
      const newPath = replaceLanguageInPath(currentPath, baseUrl, newLanguage);
      history.push(newPath);
    }
    // No navigation necessary if on a page generated from `/main/` folder (general content)
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

  useEffect(() => {
    if (focusedIndex !== null && listRef.current) {
      try {
        const [targetLanguage] = languagesArray[focusedIndex];
        // Focus goes to selected button element
        const focusButton = listRef.current.querySelector<HTMLButtonElement>(
          `#selection-${targetLanguage}`
        );
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
            <li key={lang} role="option" aria-selected={lang === language}>
              <button
                id={`selection-${lang}`}
                onClick={() => handleLanguageChange(lang as Language)}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
