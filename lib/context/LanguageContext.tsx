'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import i18n from '../i18n/i18n';

type LanguageContextType = {
  language: string;
  changeLanguage: (lang: string) => void;
  t: (key: string, options?: any) => string;
};

const defaultValue: LanguageContextType = {
  language: 'sr',
  changeLanguage: () => {},
  t: (key: string) => key,
};

const LanguageContext = createContext<LanguageContextType>(defaultValue);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState('sr');
  
  // Inicijalizacija jezika iz kolačića ili podrazumijevanog
  useEffect(() => {
    const savedLanguage = Cookies.get('i18nextLng');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    Cookies.set('i18nextLng', lang, { expires: 365, path: '/' });
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslate = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslate must be used within a LanguageProvider');
  }
  return context;
};
