import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Camera, 
  Landmark, 
  User,
  BarChart3
} from 'lucide-react';
import { Screen, Language } from '../types';

export const COLORS = {
  oceanBlue: '#0066CC',
  growthGreen: '#00A86B',
  coralAlert: '#FF6B35',
  darkText: '#1A1A1A',
  lightBG: '#F5F8FA',
};

export const NAV_ITEMS = [
  { id: Screen.DASHBOARD, label: 'Home', icon: <LayoutDashboard size={24} /> },
  { id: Screen.MONITORING, label: 'Pond Status', icon: <Activity size={24} /> },
  { id: Screen.DISEASE, label: 'Check Fish', icon: <Camera size={24} /> },
  { id: Screen.SCHEMES, label: 'Schemes', icon: <Landmark size={24} /> },
  { id: Screen.PROFILE, label: 'My Farm', icon: <User size={24} /> },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    home: "Home",
    monitor: "Live Stream",
    detect: "Screening",
    analytics: "Datasets & Evaluation",
    schemes: "Gov Subsidies",
    profile: "Farm Profile",
    health_index: "Pond Health Index",
    excellent: "OPTIMAL OPERATING ZONE",
    quick_actions: "POND ACTIONS",
    add_feeding: "Record Feeding",
    water_test: "Water Test",
    harvesting: "Harvest Schedule",
    expenses: "Farm Ledger",
    temp: "Temperature",
    ph: "pH Level",
    oxygen: "Dissolved Oxygen",
    ammonia: "TAN Ammonia",
    nitrite: "Nitrite",
    aeration_needed: "Critical Aeration Alert",
    view_history: "TELEMETRY LOGS",
    your_farm: "YOUR AQUACULTURE FARM",
    logout: "LOGOUT",
    settings: "Species & Pond Setup",
    language: "Language",
    sign_out: "SIGN OUT"
  },
  hi: {
    home: "होम",
    monitor: "लाइव मॉनिटर",
    detect: "रोग जांच",
    analytics: "डेटा व मूल्यांकन",
    schemes: "सरकारी योजनाएं",
    profile: "फार्म प्रोफाइल",
    health_index: "तालाब स्वास्थ्य सूचकांक",
    excellent: "अनुकूलतम स्थिति",
    quick_actions: "तालाब कार्रवाई",
    add_feeding: "चारा दर्ज करें",
    water_test: "जल परीक्षण",
    harvesting: "कटाई योजना",
    expenses: "खर्च खाता",
    temp: "तापमान",
    ph: "pH स्तर",
    oxygen: "घुलित ऑक्सीजन",
    ammonia: "अमोनिया (TAN)",
    nitrite: "नाइट्राइट",
    aeration_needed: "वातन (Aeration) आवश्यक",
    view_history: "इतिहास देखें",
    your_farm: "आपका फार्म",
    logout: "लॉगआउट",
    settings: "प्रजाति व तालाब सेटिंग्स",
    language: "भाषा",
    sign_out: "फार्म से बाहर निकलें"
  }
};
