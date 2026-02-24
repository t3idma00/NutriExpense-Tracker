import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";
import es from "@/locales/es/translation.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? "en";
const initialLanguage = deviceLanguage in resources ? deviceLanguage : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
