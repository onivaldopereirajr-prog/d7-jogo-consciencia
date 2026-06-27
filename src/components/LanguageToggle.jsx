import { nextLanguage } from '../services/languageService.js'

export default function LanguageToggle({ language, onChange }) {
  const isEnglish = language === 'en-US'
  return (
    <button type="button" className="language-toggle" onClick={() => onChange(nextLanguage(language))} aria-label={isEnglish ? 'Switch language to Portuguese' : 'Trocar idioma para inglês'}>
      <span className={!isEnglish ? 'active' : ''}>PT</span>
      <i aria-hidden="true">/</i>
      <span className={isEnglish ? 'active' : ''}>EN</span>
    </button>
  )
}
