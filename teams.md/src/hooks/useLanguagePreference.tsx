import React, {
  createContext,
  ReactNode,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { LANGUAGES, type Language, DEFAULT_LANGUAGE } from '../constants/languages';

interface LanguageContextProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const STORAGE_KEY = 'teams-ai-language-preference';

// Type guard to check if a string is a valid Language
const isLanguage = (value: string): value is Language =>
  (LANGUAGES as readonly string[]).includes(value);

// Verify localStorage is available and we can write to it.
const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return false;
    }

    const testKey = '__test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);

    return true;
  } catch {
    return false;
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (isLocalStorageAvailable()) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLanguage(stored)) {
        return stored;
      }
    }
    return DEFAULT_LANGUAGE;
  });
  const localStorageAvailable = useRef(isLocalStorageAvailable());

  // Persist language storage across tabs
  useEffect(() => {
    if (!localStorageAvailable.current) {
      return;
    }

    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && isLanguage(e.newValue)) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handler);

    return () => window.removeEventListener('storage', handler);
  }, []);

  const updateLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);

    if (localStorageAvailable.current) {
      localStorage.setItem(STORAGE_KEY, newLanguage);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguagePreference(): LanguageContextProps {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguagePreference must be used within a LanguageProvider');
  }

  return context;
}
