'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pcm', name: 'Nigerian Pidgin', flag: '🇳🇬' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
];

export const TRANSLATIONS = {
  en: {
    app_title: 'African Network Wi-Fi',
    buy_pass: 'Buy Data Pass',
    active_pass: 'Active Pass',
    no_active_pass: 'No active pass. Choose a package below.',
    wallet_balance: 'Wallet Balance',
    topup: 'Top Up',
    speed: 'Speed',
    online: 'Online',
    offline: 'Offline',
    time_left: 'Time Left',
    data_used: 'Data Used',
    gift_pass: 'Gift Pass',
    view_qr: 'Show QR Code',
    resume_pass: 'Resume My Pass',
    roaming_welcome: 'Welcome to',
    roaming_desc: 'You have an active pass. Continue surfing without paying again.',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    language: 'Language',
    select_language: 'Select Language',
    unlimited: 'Unlimited',
    connect: 'Connect Now',
  },
  pcm: {
    app_title: 'African Network Wi-Fi',
    buy_pass: 'Buy Better Wi-Fi Pass',
    active_pass: 'Pass wey dey work',
    no_active_pass: 'You never get active pass. Pick one plan for down.',
    wallet_balance: 'Money for Wallet',
    topup: 'Add Money',
    speed: 'Network Speed',
    online: 'You dey Online',
    offline: 'You dey Offline',
    time_left: 'Time wey remain',
    data_used: 'Data wey you don use',
    gift_pass: 'Dash Person Pass',
    view_qr: 'Show QR Code',
    resume_pass: 'Continue My Pass',
    roaming_welcome: 'You don land for',
    roaming_desc: 'Your previous pass still get time. Flex internet without paying again.',
    dark_mode: 'Dark Theme',
    light_mode: 'Light Theme',
    language: 'Language',
    select_language: 'Pick Your Language',
    unlimited: 'No Limit (Unlimited)',
    connect: 'Enter Internet Now',
  },
  yo: {
    app_title: 'African Network Wi-Fi',
    buy_pass: 'Ra Data Wi-Fi',
    active_pass: 'Pass to n ṣiṣẹ lọwọ',
    no_active_pass: 'Ko si pass to n ṣiṣẹ. Yan eto kan ni isalẹ.',
    wallet_balance: 'Owo Inu Apo',
    topup: 'Fi Owo Si',
    speed: 'Ere Ayelujara',
    online: 'O wa lori Ayelujara',
    offline: 'Ko si lori Ayelujara',
    time_left: 'Akoko to ku',
    data_used: 'Data to ti lo',
    gift_pass: 'Fi Pass Bunni',
    view_qr: 'Fi QR Code Han',
    resume_pass: 'Tesiwaju Pass Mi',
    roaming_welcome: 'Kaabo si',
    roaming_desc: 'O ni pass to ku akoko. Tesiwaju laisi sanwo leekan si.',
    dark_mode: 'Ipo Dudu',
    light_mode: 'Ipo Imọlẹ',
    language: 'Ede',
    select_language: 'Yan Ede Rẹ',
    unlimited: 'Kolopin',
    connect: 'Sopọ Bayi',
  },
  ha: {
    app_title: 'African Network Wi-Fi',
    buy_pass: 'Sayi Fakitin Wi-Fi',
    active_pass: 'Pass mai aiki',
    no_active_pass: 'Babu pass mai aiki. Zabi tsari a kasa.',
    wallet_balance: 'Kudin Wallet',
    topup: 'Cika Kudi',
    speed: 'Gudun Intanet',
    online: 'Kana Kan Intanet',
    offline: 'Ba ka Kan Intanet',
    time_left: 'Lokacin da ya rage',
    data_used: 'Data da aka yi amfani da ita',
    gift_pass: 'Kyautar Pass',
    view_qr: 'Nuna Lambar QR',
    resume_pass: 'Ci gaba da Pass Dina',
    roaming_welcome: 'Barka da zuwa',
    roaming_desc: 'Kuna da sauran lokaci a pass dinku. Yi bincike ba tare da sake biya ba.',
    dark_mode: 'Yanayin Duhu',
    light_mode: 'Yanayin Haske',
    language: 'Harshe',
    select_language: 'Zabi Harshe',
    unlimited: 'Marar Iyaka',
    connect: 'Shiga Yanzu',
  },
  ig: {
    app_title: 'African Network Wi-Fi',
    buy_pass: 'Gotee Data Wi-Fi',
    active_pass: 'Pass na-arụ ọrụ',
    no_active_pass: 'Onweghị pass na-arụ ọrụ. Họrọ atụmatụ n’okpuru.',
    wallet_balance: 'Ego dị na Wallet',
    topup: 'Tinye Ego',
    speed: 'Ọsịsọ Netwọk',
    online: 'Ị nọ n’ịntanetị',
    offline: 'Ị nọghị n’ịntanetị',
    time_left: 'Oge fọdụrụ',
    data_used: 'Data ejirila mee ihe',
    gift_pass: 'Nye Onyinye Pass',
    view_qr: 'Gosi Koodu QR',
    resume_pass: 'Gaa n’ihu na Pass m',
    roaming_welcome: 'Nnọọ na',
    roaming_desc: 'Inwere pass nwere oge fọdụrụ. Gaa n’ihu na-enweghị ịkwụ ụgwọ ọzọ.',
    dark_mode: 'Ụdị Ọchịchịrị',
    light_mode: 'Ụdị Ìhè',
    language: 'Asụsụ',
    select_language: 'Họrọ Asụsụ',
    unlimited: 'Enweghị Oke',
    connect: 'Jikọọ Ugbu a',
  },
};

const LanguageContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  languages: LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('asuk_lang');
      if (saved && TRANSLATIONS[saved]) {
        setLocaleState(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLocale = (newLocale) => {
    if (TRANSLATIONS[newLocale]) {
      setLocaleState(newLocale);
      try {
        localStorage.setItem('asuk_lang', newLocale);
      } catch {
        // Ignore
      }
    }
  };

  const t = (key) => {
    return TRANSLATIONS[locale]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
