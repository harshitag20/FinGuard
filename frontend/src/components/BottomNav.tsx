import React from 'react';
import { Screen } from '../types';
import { NAV_ITEMS } from '../constants';
import { useLanguage } from '../App';
import { I18N } from '../i18n/translations';

interface BottomNavProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onScreenChange }) => {
  const { lang } = useLanguage();
  const strings = I18N[lang as 'en' | 'hi'] || I18N.en;

  const getLocalizedLabel = (id: Screen) => {
    switch (id) {
      case Screen.DASHBOARD: return strings.nav_home;
      case Screen.MONITORING: return strings.nav_monitor;
      case Screen.DISEASE: return strings.nav_screening;
      case Screen.SCHEMES: return strings.nav_schemes;
      case Screen.PROFILE: return strings.nav_profile;
      default: return "";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-3 pb-2 pt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <nav className="flex justify-around items-center h-16" aria-label="Bottom Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] py-1 transition-all duration-200 relative select-none ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { 
                  size: 24, 
                  strokeWidth: isActive ? 2.5 : 1.9
                })}
              </div>
              <span className={`text-[11px] mt-1 tracking-tight text-center truncate max-w-[64px] ${
                isActive ? 'font-extrabold text-blue-600 dark:text-blue-400' : 'font-medium'
              }`}>
                {getLocalizedLabel(item.id)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
