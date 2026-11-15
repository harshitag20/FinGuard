import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useLanguage } from '../../App';
import { I18N } from '../../i18n/translations';

interface ListenButtonProps {
  textToSpeak: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const ListenButton: React.FC<ListenButtonProps> = ({ 
  textToSpeak, 
  className = '', 
  size = 'md' 
}) => {
  const { lang } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    // Stop speech if component unmounts or text changes
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [textToSpeak]);

  if (!isSupported) {
    return null;
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const strings = I18N[lang as 'en' | 'hi'] || I18N.en;
  const label = isPlaying ? strings.stop_listening : strings.listen;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center space-x-1.5 rounded-xl border transition-all active:scale-95 ${
        isPlaying 
          ? 'bg-blue-600 text-white border-blue-600 shadow-md animate-pulse' 
          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100'
      } ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs font-bold'} ${className}`}
      title={label}
      aria-label={label}
    >
      {isPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
      <span>{label}</span>
    </button>
  );
};

export default ListenButton;

