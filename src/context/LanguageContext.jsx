import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { firebaseApi } from '@/api/firebaseClient';

const LanguageContext = createContext();

// Font stacks
export const FONT_AR = "'Tajawal', 'Noto Sans Arabic', sans-serif";
export const FONT_KU = "'Noto Sans Arabic', 'Tajawal', sans-serif";

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('appLang') || 'ar');
  const [translations, setTranslations] = useState({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem('appLang', l);
    document.documentElement.setAttribute('data-lang', l);
  };

  // Load translations from DB
  const loadTranslations = useCallback(async () => {
    try {
      const records = await firebaseApi.entities.Translation.list(null, 5000);
      const map = {};
      records.forEach(r => {
        if (r.key) map[r.key] = { ar: r.ar || '', ku: r.ku || '' };
      });
      setTranslations(map);
    } catch {
      // silently fail — fallback values will be used
    } finally {
      setTranslationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  useEffect(() => {
    loadTranslations();
    // Subscribe to live changes on the Translation entity
    const unsubscribe = firebaseApi.entities.Translation.subscribe(() => {
      loadTranslations();
    });
    return unsubscribe;
  }, [loadTranslations]);

  /**
   * T(key, fallbackAr, fallbackKu)
   * Looks up the translation key from DB.
   * Falls back to provided fallback strings if key not found.
   */
  const T = useCallback((key, fallbackAr = '', fallbackKu = '') => {
    const entry = translations[key];
    if (!entry) return lang === 'ku' ? fallbackKu : fallbackAr;
    return lang === 'ku' ? (entry.ku || fallbackKu) : (entry.ar || fallbackAr);
  }, [translations, lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, T, translations, reloadTranslations: loadTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

// Legacy inline helper (for components that still use L(ar, ku))
export const t = (ar, ku) => (lang) => lang === 'ku' ? ku : ar;

export const KuText = ({ children, className = '', style = {}, ...props }) => (
  <span lang="ku" className={`ku-text ${className}`} style={{ fontFamily: FONT_KU, ...style }} {...props}>
    {children}
  </span>
);

export const ArText = ({ children, className = '', style = {}, ...props }) => (
  <span lang="ar" className={`ar-text ${className}`} style={{ fontFamily: FONT_AR, ...style }} {...props}>
    {children}
  </span>
);

export const BiText = ({ ar, ku, lang, className = '', style = {}, ...props }) => {
  const isKu = lang === 'ku';
  return (
    <span
      lang={isKu ? 'ku' : 'ar'}
      className={`${isKu ? 'ku-text' : 'ar-text'} ${className}`}
      style={{ fontFamily: isKu ? FONT_KU : FONT_AR, ...style }}
      {...props}
    >
      {isKu ? ku : ar}
    </span>
  );
};