import React, { useState, createContext, useContext, useEffect } from 'react';
import { Screen, Language, PondConfig, UserData } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './screens/Dashboard';
import PondMonitoring from './screens/PondMonitoring';
import DiseaseDetection from './screens/DiseaseDetection';
import Profile from './screens/Profile';
import Schemes from './screens/Schemes';
import Login from './screens/Login';
import SplashScreen from './screens/SplashScreen';
import AIAssistant from './components/AIAssistant';
import TutorialOverlay from './components/TutorialOverlay';
import { COLORS, TRANSLATIONS } from './constants';
import { api } from './services/apiService';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface UserContextType {
  user: UserData | null;
  setUser: (u: UserData | null) => void;
  restartOnboarding?: () => void;
}

interface NavigationContextType {
  currentScreen: Screen;
  navigate: (s: Screen) => void;
}

interface PondContextType {
  pond: PondConfig;
  setPond: React.Dispatch<React.SetStateAction<PondConfig>>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const UserContext = createContext<UserContextType | undefined>(undefined);
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);
const PondContext = createContext<PondContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used within NavigationProvider");
  return context;
};

export const usePond = () => {
  const context = useContext(PondContext);
  if (!context) throw new Error("usePond must be used within PondProvider");
  return context;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.DASHBOARD);
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem('finguard_lang') as Language) || Language.ENGLISH;
    } catch {
      return Language.ENGLISH;
    }
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('finguard-theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const [pond, setPond] = useState<PondConfig>({
    id: 'POND-01',
    name: 'Pond 1 - North Growout',
    tankSize: '2.5 Hectares (Earthen)',
    fishCount: 8500,
    speciesIds: ['rohu', 'catla', 'mrigal'],
    metrics: {
      temp: 28.2,
      ph: 7.6,
      oxygen: 6.4,
      ammonia: 0.02,
      nitrite: 0.03,
      salinity: 0.5,
      timestamp: Date.now(),
      isSimulated: true
    },
    healthScore: 92,
    isSimulated: true,
    status: 'NORMAL',
    createdAt: '2026-03-01T10:00:00Z'
  });

  // Check stored user on mount
  useEffect(() => {
    api.getUser().then(savedUser => {
      if (savedUser) {
        setUser(savedUser);
        if (savedUser.selectedSpecies && savedUser.selectedSpecies.length > 0) {
          setPond(prev => ({
            ...prev,
            speciesIds: savedUser.selectedSpecies
          }));
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('finguard-theme', theme);
  }, [theme]);

  const t = (key: string) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const restartOnboarding = () => {
    setIsOnboarded(false);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.DASHBOARD: return <Dashboard />;
      case Screen.MONITORING: return <PondMonitoring />;
      case Screen.DISEASE: return <DiseaseDetection />;
      case Screen.SCHEMES: return <Schemes />;
      case Screen.PROFILE: return <Profile />;
      default: return <Dashboard />;
    }
  };

  // 1. First FinGuard Page: SplashScreen with animation and tap-to-continue
  if (showSplash) {
    return (
      <SplashScreen 
        onComplete={() => {
          setShowSplash(false);
        }} 
      />
    );
  }

  // 2. Just after the first FinGuard page, the Smart Onboarding page pops up!
  if (!isOnboarded) {
    return (
      <LanguageContext.Provider value={{ lang, setLang, t }}>
        <UserContext.Provider value={{ user, setUser, restartOnboarding }}>
          <PondContext.Provider value={{ pond, setPond }}>
            <Login onLogin={() => {
              setIsOnboarded(true);
              setShowTutorial(false);
            }} />
          </PondContext.Provider>
        </UserContext.Provider>
      </LanguageContext.Provider>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser, restartOnboarding }}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <LanguageContext.Provider value={{ lang, setLang, t }}>
          <NavigationContext.Provider value={{ currentScreen, navigate: setCurrentScreen }}>
            <PondContext.Provider value={{ pond, setPond }}>
              <div 
                className={`min-h-screen max-w-lg mx-auto flex flex-col relative shadow-2xl transition-colors duration-500 ${theme === 'dark' ? 'bg-[#020617] dark' : 'bg-[#f0f4f8]'}`}
                style={{ color: theme === 'dark' ? '#F1F5F9' : COLORS.darkText }}
              >
                <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  {renderScreen()}
                </main>

                {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}

                <AIAssistant />

                <BottomNav 
                  currentScreen={currentScreen} 
                  onScreenChange={setCurrentScreen} 
                />
              </div>
            </PondContext.Provider>
          </NavigationContext.Provider>
        </LanguageContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
};

export default App;
