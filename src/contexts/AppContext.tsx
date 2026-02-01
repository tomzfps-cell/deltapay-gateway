import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Locale, Currency, translations, TranslationKey } from '@/lib/i18n';
import { useAuth } from './AuthContext';

interface AppContextType {
  locale: Locale;
  currency: Currency;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  t: (key: TranslationKey) => string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useAuth();
  
  const [locale, setLocale] = useState<Locale>('es');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync with merchant settings when available
  useEffect(() => {
    if (settings) {
      if (settings.locale === 'es' || settings.locale === 'pt') {
        setLocale(settings.locale);
      }
      if (settings.display_currency === 'ARS' || settings.display_currency === 'BRL' || settings.display_currency === 'USD') {
        setCurrency(settings.display_currency as Currency);
      }
    }
  }, [settings]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale][key] || key;
  }, [locale]);

  return (
    <AppContext.Provider
      value={{
        locale,
        currency,
        setLocale,
        setCurrency,
        t,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
