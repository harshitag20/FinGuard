import React from 'react';
import { Screen } from '../types';
import { NAV_ITEMS } from '../constants';
import { useLanguage } from '../App';

interface BottomNavProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onScreenChange }) => {
  const { t } = useLanguage();

  const getLocalizedLabel = (id: Screen) => {
    switch (id) {
      case Screen.DASHBOARD: return t('home');
      case Screen.MONITORING: return t('monitor');
      case Screen.DISEASE: return t('detect');
      case Screen.SCHEMES: return t('schemes');
      case Screen.PROFILE: return t('profile');
      default: return "";
    }
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[60] max-w-lg mx-auto">
      <nav className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[2rem] px-2 py-1.5">
        <div className="flex justify-around items-center h-14">
          {NAV_ITEMS.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={item.label}
              >
                {isActive && (
                  <div className="absolute -top-1 w-6 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3B82F6]"></div>
                )}
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { 
                    size: 20, 
                    strokeWidth: isActive ? 2.5 : 2 
                  })}
                </div>
                <span className={`text-[8.5px] mt-1 font-bold uppercase tracking-wider transition-opacity duration-200 ${isActive ? 'opacity-100 font-extrabold text-white' : 'opacity-70'}`}>
                  {getLocalizedLabel(item.id)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
