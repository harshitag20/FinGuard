import React, { useState, useMemo } from 'react';
import { 
  User, Shield, Check, ChevronRight, LogOut, Settings, HelpCircle, 
  Globe, Bell, X, Moon, Sun, Fish, MapPin, Layout, Search, Layers, AlertTriangle, Info
} from 'lucide-react';
import { useLanguage, useTheme, useUser, usePond } from '../App';
import { Language, UserData } from '../types';
import { ALL_SPECIES_LIST, SPECIES_CATALOG } from '../services/speciesCatalog';
import { evaluateMultiSpeciesCompatibility, RangeOverlapResult } from '../services/overlapEngine';
import { api } from '../services/apiService';

const Profile: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, setUser, restartOnboarding } = useUser();
  const { pond, setPond } = usePond();

  const [isEditingSpecies, setIsEditingSpecies] = useState(false);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>(
    user?.selectedSpecies || pond.speciesIds || ['rohu', 'catla', 'mrigal']
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filtered species
  const filteredSpecies = useMemo(() => {
    return ALL_SPECIES_LIST.filter(sp => 
      sp.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Compatibility report
  const compatibilityReport = useMemo(() => {
    return evaluateMultiSpeciesCompatibility(selectedSpeciesIds);
  }, [selectedSpeciesIds]);

  const toggleSpecies = (id: string) => {
    setSelectedSpeciesIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const saveUpdatedSpecies = async () => {
    if (selectedSpeciesIds.length === 0) {
      alert("Please select at least one species for species-aware recommendations.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedUser: UserData = {
        ...(user || {
          name: 'Rajesh Patel',
          location: 'Bhimavaram, Andhra Pradesh',
          pondSize: '2.0 Hectares',
          cultureType: 'Composite Polyculture',
          type: 'standard'
        }),
        selectedSpecies: selectedSpeciesIds
      };
      await api.saveUser(updatedUser);
      setUser(updatedUser);

      // Update pond config
      const speciesNames = selectedSpeciesIds.map(id => SPECIES_CATALOG[id]?.commonName || id).join(' & ');
      const updatedPond = {
        ...pond,
        speciesIds: selectedSpeciesIds,
        fishType: speciesNames
      };
      await api.savePond(updatedPond);
      setPond(updatedPond);

      setIsEditingSpecies(false);
    } catch (err) {
      alert("Failed to save species: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const allLanguages = [
    { id: Language.ENGLISH, label: 'English', desc: 'Global Business' },
    { id: Language.HINDI, label: 'Hindi (हिन्दी)', desc: 'National Language' },
    { id: Language.BENGALI, label: 'Bengali (বাংলা)', desc: 'West Bengal' },
    { id: Language.MARATHI, label: 'Marathi (मराठी)', desc: 'Maharashtra' },
    { id: Language.TELUGU, label: 'Telugu (తెలుగు)', desc: 'AP / Telangana' },
    { id: Language.TAMIL, label: 'Tamil (தமிழ்)', desc: 'Tamil Nadu' }
  ];

  return (
    <div className={`pb-32 min-h-screen ${theme === 'dark' ? 'bg-[#0F172A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* Profile Header */}
      <div className={`p-6 pt-12 flex flex-col items-center space-y-3 border-b ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
        <div className="relative">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 border-3 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
            <Shield size={12} className="text-white" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-extrabold">{user?.name || 'Rajesh Patel'}</h2>
          <p className="text-xs text-slate-400 font-semibold">{user?.farmName || 'Godavari Freshwater Farms'}</p>
          <div className="flex items-center justify-center space-x-1 text-[11px] text-slate-400 mt-0.5">
            <MapPin size={12} />
            <span>{user?.location || 'Bhimavaram, Andhra Pradesh'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        
        {/* Cultivated Species & Overlap Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Cultivated Species Portfolio
              </h3>
              <span className="text-[10px] text-slate-400">
                {selectedSpeciesIds.length} species registered
              </span>
            </div>
            <button
              onClick={() => setIsEditingSpecies(!isEditingSpecies)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isEditingSpecies ? 'Cancel' : 'Edit Species'}
            </button>
          </div>

          {/* Species Chips */}
          <div className="flex flex-wrap gap-1.5">
            {selectedSpeciesIds.map(id => {
              const sp = SPECIES_CATALOG[id];
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs font-bold px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800"
                >
                  <span>{sp?.commonName || id}</span>
                  {isEditingSpecies && (
                    <button onClick={() => toggleSpecies(id)} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {/* Edit Species Drawer */}
          {isEditingSpecies && (
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3 animate-in fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter species..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold outline-none"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {filteredSpecies.map(sp => {
                  const isChecked = selectedSpeciesIds.includes(sp.id);
                  return (
                    <div
                      key={sp.id}
                      onClick={() => toggleSpecies(sp.id)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer flex justify-between items-center ${
                        isChecked 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 font-bold text-blue-900 dark:text-blue-200' 
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <span className={`font-bold ${isChecked ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {sp.commonName} ({sp.scientificName})
                      </span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {isChecked && <Check size={12} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={saveUpdatedSpecies}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all"
              >
                {isSaving ? 'Saving...' : 'Save Updated Species'}
              </button>
            </div>
          )}

          {/* Mathematical Overlap Table [max L, min U] */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Calculated Range Intersections [max(L), min(U)]
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                compatibilityReport.overallCompatibility === 'COMPATIBLE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {compatibilityReport.overallCompatibility}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {Object.entries(compatibilityReport.parameters).map(([key, item]) => {
                const ov = item as RangeOverlapResult;
                return (
                  <div key={key} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{ov.parameterName}</span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[200px]">
                        {ov.hasOverlap 
                          ? `Bound by: ${ov.narrowestSpecies.lowerBoundSpecies} & ${ov.narrowestSpecies.upperBoundSpecies}` 
                          : 'No overlap detected'}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className={`font-black ${ov.hasOverlap ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                        {ov.hasOverlap 
                          ? `${ov.commonOptimal?.[0]} - ${ov.commonOptimal?.[1]} ${ov.unit}`
                          : 'Conflict'}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[9px] text-slate-400 leading-tight italic pt-1">
              {compatibilityReport.screeningDisclaimer}
            </p>
          </div>
        </div>

        {/* App Settings Options */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-white/10 shadow-sm space-y-1">
          <div 
            onClick={toggleTheme}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <span className="text-xs font-bold block">Theme Mode</span>
                <span className="text-[10px] text-slate-400">{theme === 'dark' ? 'Dark Interface' : 'Light Interface'}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Toggle</span>
          </div>

          <div 
            onClick={() => setShowLanguagePicker(true)}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Globe size={16} />
              </div>
              <div>
                <span className="text-xs font-bold block">Language / भाषा</span>
                <span className="text-[10px] text-slate-400">
                  {allLanguages.find(l => l.id === lang)?.label || 'English'}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          <div 
            onClick={async () => {
              try {
                localStorage.removeItem('finguard_onboarded');
                await api.saveUser({} as any);
                setUser(null);
                if (restartOnboarding) restartOnboarding();
              } catch (e) {
                setUser(null);
                if (restartOnboarding) restartOnboarding();
              }
            }}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <LogOut size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block">Re-run Onboarding & Fish Setup</span>
                <span className="text-[10px] text-slate-400">Restart species selection & GPS weather onboarding</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-red-400" />
          </div>
        </div>

        {/* Language Modal */}
        {showLanguagePicker && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 border border-slate-100 dark:border-white/10 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Choose Language</h3>
                <button onClick={() => setShowLanguagePicker(false)}>
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-1.5">
                {allLanguages.map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLang(l.id);
                      setShowLanguagePicker(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold flex justify-between items-center ${
                      lang === l.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.label}</span>
                    {lang === l.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Profile;
