export const LANGUAGES = {
  en: { name: "English", nativeName: "English", script: "Latn" },
  hi: { name: "Hindi", nativeName: "हिन्दी", script: "Deva" },
  bn: { name: "Bengali", nativeName: "বাংলা", script: "Beng" },
  te: { name: "Telugu", nativeName: "తెలుగు", script: "Telu" },
  mr: { name: "Marathi", nativeName: "मराठी", script: "Deva" },
  ta: { name: "Tamil", nativeName: "தமிழ்", script: "Taml" },
  ur: { name: "Urdu", nativeName: "اردو", script: "Arab" },
  gu: { name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujr" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Knda" },
  ml: { name: "Malayalam", nativeName: "മലയാളം", script: "Mlym" },
  or: { name: "Odia", nativeName: "ଓଡ଼ିଆ", script: "Orya" },
  pa: { name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Guru" },
  as: { name: "Assamese", nativeName: "অসমীয়া", script: "Beng" },
  mai: { name: "Maithili", nativeName: "मैथिली", script: "Deva" },
  sat: { name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Olck" },
  ks: { name: "Kashmiri", nativeName: "कॉशुर", script: "Deva" },
  ne: { name: "Nepali", nativeName: "नेपाली", script: "Deva" },
  sd: { name: "Sindhi", nativeName: "سنڌي", script: "Arab" },
  kok: { name: "Konkani", nativeName: "कोंकणी", script: "Deva" },
  doi: { name: "Dogri", nativeName: "डोगरी", script: "Deva" },
  mni: { name: "Manipuri", nativeName: "মৈতৈলোন্", script: "Beng" },
  brx: { name: "Bodo", nativeName: "बड़ो", script: "Deva" },
  sa: { name: "Sanskrit", nativeName: "संस्कृतम्", script: "Deva" },
} as const;

export type Language = keyof typeof LANGUAGES;

export const LANGUAGE_LIST = Object.entries(LANGUAGES).map(([code, info]) => ({
  code: code as Language,
  ...info,
}));
