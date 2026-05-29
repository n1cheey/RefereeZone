import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { translations } from '@/src/constants/translations';
import { secureStore } from '@/src/services/secure-store';
import { AppLanguage } from '@/src/types/domain';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_KEY = 'irefzone_mobile_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    void secureStore.get(LANGUAGE_KEY).then((storedLanguage) => {
      if (storedLanguage === 'az' || storedLanguage === 'en' || storedLanguage === 'ru') {
        setLanguage(storedLanguage);
      }
    });
  }, []);

  const updateLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    void secureStore.set(LANGUAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: updateLanguage,
      t: (key: string) => translations[language][key] || key,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error('useLanguage must be used within LanguageProvider.');
  }

  return value;
}
