import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Loader2, MapPin, Phone, AlertCircle, 
  User, ArrowRight, ArrowLeft, Fish, Mail, Smartphone, Crosshair, Zap,
  Search, Shield, Droplets, Info, Check, X, Layers, Thermometer, Wind, Eye
} from 'lucide-react';
import { useUser, usePond, useLanguage } from '../App';
import { UserData, Language } from '../types';
import { ALL_SPECIES_LIST, SPECIES_CATALOG, SpeciesProfile } from '../services/speciesCatalog';
import { evaluateMultiSpeciesCompatibility } from '../services/overlapEngine';
import { getHighAccuracyLocation } from '../services/locationService';
import { fetchWeatherByCoords, WeatherData } from '../services/weatherService';
import { api } from '../services/apiService';
import { I18N } from '../i18n/translations';

interface LoginProps {
  onLogin: () => void;
}

type OnboardingStep = 'auth' | 'identity' | 'species' | 'pond';
type AuthMethod = 'phone' | 'email';

const SPECIES_PRESETS = [
  { name: 'Indian Major Carps (IMC)', speciesIds: ['rohu', 'catla', 'mrigal'] },
  { name: 'Exotic & Indian Carps', speciesIds: ['rohu', 'catla', 'mrigal', 'grass_carp', 'silver_carp'] },
  { name: 'Tilapia & Carp Blend', speciesIds: ['nile_tilapia', 'rohu'] },
  { name: 'Scampi Prawn & Carp', speciesIds: ['scampi', 'rohu', 'catla'] },
  { name: 'Air-Breathing Catfish', speciesIds: ['magur', 'singhi', 'pangasius'] }
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { setUser } = useUser();
  const { setPond } = usePond();
  const { lang, setLang } = useLanguage();
  const strings = (I18N as any)[lang] || (I18N as any).hi || (I18N as any).en;
  
  const [step, setStep] = useState<OnboardingStep>('auth');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [pondSize, setPondSize] = useState('2.5 Hectares');
  const [cultureType, setCultureType] = useState('Composite Polyculture');

  // Species Selection State
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>(['rohu', 'catla', 'mrigal']);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [inspectingSpecies, setInspectingSpecies] = useState<SpeciesProfile | null>(null);

  // Auto-detect location & weather immediately on mount
  useEffect(() => {
    handleAutoDetectLocation();
  }, []);

  // Filtered species list
  const filteredSpecies = useMemo(() => {
    return ALL_SPECIES_LIST.filter(sp => 
      sp.commonName.toLowerCase().includes(speciesSearch.toLowerCase()) ||
      sp.scientificName.toLowerCase().includes(speciesSearch.toLowerCase())
    );
  }, [speciesSearch]);

  // Compute live range overlap
  const compatibilityReport = useMemo(() => {
    return evaluateMultiSpeciesCompatibility(selectedSpeciesIds);
  }, [selectedSpeciesIds]);

  const toggleSpecies = (id: string) => {
    if (selectedSpeciesIds.includes(id)) {
      if (selectedSpeciesIds.length === 1) {
        alert("At least one cultivated species is required for species-aware recommendations.");
        return;
      }
      setSelectedSpeciesIds(prev => prev.filter(s => s !== id));
    } else {
      setSelectedSpeciesIds(prev => [...prev, id]);
    }
  };

  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const loc = await getHighAccuracyLocation();
      const weatherData = await fetchWeatherByCoords(loc.lat, loc.lng);
      setWeather(weatherData);
      if (weatherData.locationName) {
        setLocation(weatherData.locationName);
      } else if (loc.locationName) {
        setLocation(loc.locationName);
      }
    } catch (err) {
      console.warn("Location/weather detection fallback", err);
      const fallback = await fetchWeatherByCoords(16.54, 81.52);
      setWeather(fallback);
      setLocation(fallback.locationName);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSendCode = () => {
    if (authMethod === 'phone' && phoneNumber.length < 10) return alert("Enter valid mobile number");
    if (authMethod === 'email' && !email.includes('@')) return alert("Enter valid email address");
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCodeSent(true);
      setError(null);
    }, 500);
  };

  const handleVerifyCode = () => {
    if (otp.length === 6 || otp === '123456') {
      setStep('identity');
    } else {
      setError("Please enter 6-digit verification code (e.g. 123456).");
    }
  };

  // Demo Sign-In: Pre-fills farmer info, auto-detects location & weather, and moves to Step 2 (Location & Weather)
  const handleDemoSignIn = async () => {
    setName('Rajesh Patel');
    setPhoneNumber('9876543210');
    setPondSize('2.5 Hectares');
    setSelectedSpeciesIds(['rohu', 'catla', 'mrigal']);

    if (!weather) {
      await handleAutoDetectLocation();
    }
    setStep('identity');
  };

  const finalizeOnboarding = () => {
    setIsLoading(true);
    const speciesNames = selectedSpeciesIds.map(id => SPECIES_CATALOG[id]?.commonName || id).join(' & ');
    const userData: UserData = {
      name: name || 'Rajesh Patel',
      phone: phoneNumber ? `+91 ${phoneNumber}` : '+91 98765 43210',
      email: email || 'farmer@finguard.ai',
      location: location || 'Bhimavaram, Andhra Pradesh',
      pondSize,
      selectedSpecies: selectedSpeciesIds,
      cultureType,
      type: 'standard',
      onboardedAt: new Date().toISOString()
    };

    setPond(prev => ({
      ...prev,
      speciesIds: selectedSpeciesIds,
      fishType: speciesNames,
      metrics: {
        ...prev.metrics,
        temp: weather ? weather.temp : prev.metrics.temp
      }
    }));

    api.saveUser(userData).catch(() => {});
    localStorage.setItem('finguard_onboarded', 'true');
    
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setUser(userData);
        onLogin();
      }, 700);
    }, 800);
  };

  const getStepNumber = () => {
    switch (step) {
      case 'auth': return 1;
      case 'identity': return 2;
      case 'species': return 3;
      case 'pond': return 4;
    }
  };

  const getProgressWidth = () => {
    switch (step) {
      case 'auth': return 'w-1/4';
      case 'identity': return 'w-2/4';
      case 'species': return 'w-3/4';
      case 'pond': return 'w-full';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none"></div>

      <div className="w-full max-w-sm sm:max-w-md z-10 space-y-4">
        
        {/* Header with Quick Language Switcher */}
        <div className="flex justify-between items-center px-1">
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              {strings.smart_onboarding || 'Smart Onboarding'}
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
              {step === 'species' ? (strings.step3_badge || 'Step 3 of 4 • Species Mix') :
               step === 'identity' ? (strings.step2_badge || 'Step 2 of 4 • Location & Weather') :
               step === 'auth' ? (strings.step1_badge || 'Step 1 of 4 • Farmer Sign In') :
               (strings.step4_badge || 'Step 4 of 4 • Pond Specs')}
            </p>
          </div>
          <select 
            value={lang} 
            onChange={(e) => {
              const newLang = e.target.value as Language;
              setLang(newLang);
              try { localStorage.setItem('finguard_lang', newLang); } catch {}
            }}
            className="text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none text-slate-700 shadow-sm hover:border-blue-400 cursor-pointer"
          >
            <option value={Language.ENGLISH}>English</option>
            <option value={Language.HINDI}>हिन्दी</option>
            <option value={Language.TELUGU}>తెలుగు</option>
            <option value={Language.BENGALI}>বাংলা</option>
            <option value={Language.MARATHI}>मराठी</option>
            <option value={Language.TAMIL}>தமிழ்</option>
          </select>
        </div>

        <div className="bg-white rounded-[3rem] p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 flex">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${getProgressWidth()}`}></div>
          </div>

          {!isSuccess ? (
            <div className="mt-1">
              
              {/* STEP 1: AUTH */}
              {step === 'auth' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      {authMethod === 'phone' ? <Smartphone size={20} /> : <Mail size={20} />}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 tracking-tight">{strings.step1_title || 'Farmer Identity'}</h2>
                      <p className="text-[10px] text-slate-400 font-medium">{strings.step1_sub || 'Verify your mobile number or email'}</p>
                    </div>
                  </div>

                  {/* Auth Switcher */}
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => { setAuthMethod('phone'); setCodeSent(false); setOtp(''); }}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-black transition-all ${
                        authMethod === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      <Phone size={13} />
                      <span>{strings.phone_otp || 'Phone OTP'}</span>
                    </button>
                    <button 
                      onClick={() => { setAuthMethod('email'); setCodeSent(false); setOtp(''); }}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-black transition-all ${
                        authMethod === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      <Mail size={13} />
                      <span>{strings.email || 'Email'}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                        {authMethod === 'phone' ? (strings.mobile_label || 'Mobile Number') : (strings.email_label || 'Email Address')}
                      </label>
                      <div className="relative">
                        {authMethod === 'phone' ? (
                          <>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">+91</span>
                            <input 
                              type="tel" 
                              value={phoneNumber} 
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                              placeholder="9876543210" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-14 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold placeholder:text-slate-400" 
                            />
                          </>
                        ) : (
                          <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="farmer@finguard.ai" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold placeholder:text-slate-400" 
                          />
                        )}
                      </div>
                    </div>
                    
                    {codeSent && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{strings.code_label || 'Verification Code (Demo: 123456)'}</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          value={otp} 
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                          placeholder="123456" 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 px-4 text-xl tracking-[0.4em] font-black text-center outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                      </div>
                    )}

                    {error && (
                      <div className="p-2.5 bg-red-50 rounded-xl flex items-center space-x-2 border border-red-100">
                        <AlertCircle className="text-red-500 shrink-0" size={14} />
                        <p className="text-xs font-bold text-red-700">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={codeSent ? handleVerifyCode : handleSendCode}
                      disabled={isLoading}
                      className="w-full bg-[#0066CC] hover:bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                        <>
                          <span>{codeSent ? (strings.verify_next_btn || "Verify & Next") : (strings.continue_btn || "Continue")}</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {/* DEMO SIGN IN BUTTON: Leads to Step 2 (Location & Weather) */}
                    {!codeSent && (
                      <button
                        onClick={handleDemoSignIn}
                        aria-label="DEMO SIGIN"
                        className="w-full bg-slate-100 text-slate-700 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all border border-slate-200/80"
                      >
                        <span>{strings.demo_signin_btn || 'DEMO SIGN IN'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: IDENTITY, LOCATION TRACKING & WEATHER */}
              {step === 'identity' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-1">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 tracking-tight">{strings.step2_title || 'Farm Location & Weather'}</h2>
                      <p className="text-[10px] text-slate-400 font-medium">{strings.step2_sub || 'GPS location & live meteorological tracking'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-700 ml-1">{strings.farmer_name_label || 'Farmer / Farm Name'}</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={strings.farmer_name_placeholder || "e.g. Rajesh Patel (Godavari Farm)"} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[10px] font-black uppercase text-slate-700 ml-1">{strings.farm_gps_label || 'Farm GPS Region'}</label>
                        <button 
                          onClick={handleAutoDetectLocation}
                          disabled={isDetectingLocation}
                          className="flex items-center space-x-1 text-[10px] font-black text-blue-600 uppercase tracking-wider hover:text-blue-700"
                        >
                          {isDetectingLocation ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
                          <span>{isDetectingLocation ? (strings.locating || 'Locating...') : (strings.refresh_gps || 'Refresh GPS')}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Detecting farm location..." 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                      </div>
                    </div>

                    {/* Live Open-Meteo Weather Widget */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Thermometer size={16} className="text-blue-600" />
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs">
                              {weather ? `${weather.temp}°C ${strings.ambient_weather || 'Ambient'}` : (strings.connecting_meteo || 'Connecting to Open-Meteo...')}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {weather ? `${weather.condition} • ${weather.humidity}% ${strings.humidity || 'Humidity'}` : 'Retrieving local climate'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-full">
                          Live Open-Meteo
                        </span>
                      </div>
                      {weather && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-blue-100 text-[10px] text-slate-600">
                          <div>{strings.pressure || 'Pressure'}: <strong>{weather.pressure} hPa</strong></div>
                          <div>{strings.wind || 'Wind'}: <strong>{weather.windSpeed} km/h</strong></div>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-1">
                      <button 
                        onClick={() => setStep('auth')} 
                        className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (!name) setName('Rajesh Patel');
                          if (!location) setLocation('Bhimavaram, Andhra Pradesh');
                          setStep('species');
                        }}
                        className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <span>{strings.next_species || 'Next: Select Fish Species'}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: FISH SPECIES ASKING PAGE, DETAILS & OVERLAPPING CONDITIONS */}
              {step === 'species' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Fish size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight leading-tight">{strings.step3_title || 'Select Cultivated Fish Species'}</h2>
                        <p className="text-[10px] text-slate-400 font-medium">{strings.step3_sub || 'Select all fish species you cultivate'}</p>
                      </div>
                    </div>
                    {/* Live location badge */}
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md block">
                        {weather ? `${weather.temp}°C ${weather.condition}` : 'Live Weather'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold block truncate max-w-[120px]">
                        {location || 'Bhimavaram'}
                      </span>
                    </div>
                  </div>

                  {/* Polyculture Presets */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{strings.quick_presets || 'Polyculture Presets:'}</span>
                    <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {SPECIES_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedSpeciesIds(p.speciesIds)}
                          className="shrink-0 text-[10px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-slate-700 transition-all active:scale-95"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input 
                      type="text" 
                      value={speciesSearch}
                      onChange={(e) => setSpeciesSearch(e.target.value)}
                      placeholder={strings.search_species || "Search species (Rohu, Catla, Mrigal, Tilapia, Scampi)..."} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Selected Species Chips */}
                  {selectedSpeciesIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      {selectedSpeciesIds.map(id => {
                        const sp = SPECIES_CATALOG[id];
                        return (
                          <span 
                            key={id}
                            className="inline-flex items-center space-x-1 bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-lg"
                          >
                            <span>{sp?.commonName || id}</span>
                            <button onClick={() => toggleSpecies(id)} className="hover:text-red-600">
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Species List with Rich Fish Details */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredSpecies.map(sp => {
                      const isSelected = selectedSpeciesIds.includes(sp.id);
                      return (
                        <div
                          key={sp.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                          }`}
                        >
                          <div className="flex-1 cursor-pointer pr-2" onClick={() => toggleSpecies(sp.id)}>
                            <div className="flex items-center space-x-1.5">
                              <span className={`font-black text-sm tracking-tight ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                {sp.commonName}
                              </span>
                              {sp.isAirBreathing && (
                                <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                                  Air-Breathing
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-600 italic block leading-tight mt-0.5">
                              {sp.scientificName} • {sp.feedingHabit}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-700 font-bold mt-1">
                              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-black">
                                {sp.parameters.temp.optimal[0]}–{sp.parameters.temp.optimal[1]}°C
                              </span>
                              <span>•</span>
                              <span className="bg-slate-100 text-teal-800 px-1.5 py-0.5 rounded font-black">
                                Min DO: {sp.parameters.oxygen.optimal[0]} mg/L
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingSpecies(sp);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Inspect Full Fish Profile"
                            >
                              <Info size={15} />
                            </button>
                            <div 
                              onClick={() => toggleSpecies(sp.id)}
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center cursor-pointer ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check size={13} className="stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Derived Best Operating Window Box */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-800 text-[11px]">Derived Best Pond Window:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        compatibilityReport.overallCompatibility === 'COMPATIBLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {compatibilityReport.overallCompatibility}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-bold">Safe Temp Overlap</span>
                        <strong className="text-blue-600 font-black">
                          {compatibilityReport.parameters.temp?.commonOptimal
                            ? `${compatibilityReport.parameters.temp.commonOptimal[0]} - ${compatibilityReport.parameters.temp.commonOptimal[1]} °C`
                            : 'Conflict'}
                        </strong>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-bold">Minimum DO Required</span>
                        <strong className="text-teal-600 font-black">
                          &gt;= {compatibilityReport.parameters.oxygen?.commonOptimal?.[0] || 5.0} mg/L
                        </strong>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 font-semibold pt-0.5">
                      Sourced from ICAR-CIFA & FAO Cultured Aquatic Species Programme
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button 
                      onClick={() => setStep('identity')} 
                      className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setStep('pond')}
                      className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <span>{strings.next_pond_specs || 'Next: Pond Setup'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: POND SETUP & FINAL CONFIRMATION */}
              {step === 'pond' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 mb-1">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <Fish size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 tracking-tight">{strings.step4_title || 'Pond Calibration'}</h2>
                      <p className="text-[10px] text-slate-400 font-medium">{strings.step4_sub || 'Finalize pond sizing and species baseline'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-700 ml-1">{strings.estimated_pond_area || 'Pond Area'}</label>
                        <select 
                          value={pondSize}
                          onChange={(e) => setPondSize(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="0.5 Hectare">0.5 Hectare (1.2 Acres)</option>
                          <option value="1.0 Hectare">1.0 Hectare (2.5 Acres)</option>
                          <option value="2.0 Hectares">2.0 Hectares (5.0 Acres)</option>
                          <option value="2.5 Hectares">2.5 Hectares (6.2 Acres)</option>
                          <option value="5.0 Hectares">5.0 Hectares (12.5 Acres)</option>
                          <option value="10.0+ Hectares">10.0+ Hectares (Cluster)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-700 ml-1">{strings.culture_system || 'Culture System'}</label>
                        <select 
                          value={cultureType}
                          onChange={(e) => setCultureType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="Composite Polyculture">Composite Polyculture</option>
                          <option value="Grow-out Monoculture">Grow-out Monoculture</option>
                          <option value="Nursery / Fingerling">Nursery / Fingerling</option>
                          <option value="Biofloc / Intensive Tank">Biofloc / Intensive Tank</option>
                          <option value="RAS (Recirculating)">RAS (Recirculating)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Pond Area Selector Chips */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-500 ml-1">{strings.quick_select_area || 'Quick Select Area'}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '0.5 Ha (1.2 Ac)', val: '0.5 Hectare' },
                          { label: '1.0 Ha (2.5 Ac)', val: '1.0 Hectare' },
                          { label: '2.0 Ha (5.0 Ac)', val: '2.0 Hectares' },
                          { label: '2.5 Ha (6.2 Ac)', val: '2.5 Hectares' },
                          { label: '5.0 Ha (12.5 Ac)', val: '5.0 Hectares' }
                        ].map((chip) => (
                          <button
                            key={chip.val}
                            type="button"
                            onClick={() => setPondSize(chip.val)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                              pondSize.startsWith(chip.val.split(' ')[0])
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 space-y-1 text-xs">
                      <span className="font-extrabold text-emerald-900 block text-xs">{strings.calibrated_portfolio || 'Calibrated Cultivation Portfolio'}</span>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        {selectedSpeciesIds.map(id => SPECIES_CATALOG[id]?.commonName || id).join(', ')}
                      </p>
                      <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-100">
                        Derived operating window: {compatibilityReport.parameters.temp?.commonOptimal?.[0]}-{compatibilityReport.parameters.temp?.commonOptimal?.[1]}°C, DO &gt;= {compatibilityReport.parameters.oxygen?.commonOptimal?.[0]} mg/L.
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button 
                        onClick={() => setStep('species')} 
                        className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <button 
                        onClick={finalizeOnboarding}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                          <>
                            <span>{strings.complete_setup || 'Start Farming'}</span>
                            <CheckCircle2 size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner relative">
                <CheckCircle2 size={48} className="relative z-10" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Farm Ready</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Launching Farm Dashboard...</p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FULL FISH SPECIES BIOLOGICAL DETAILS MODAL */}
      {inspectingSpecies && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl border border-slate-100 relative">
            <button 
              onClick={() => setInspectingSpecies(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900">{inspectingSpecies.commonName}</h3>
                {inspectingSpecies.isAirBreathing && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">
                    Air-Breathing
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 italic font-medium">
                {inspectingSpecies.scientificName} • {inspectingSpecies.family}
              </p>
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">
                {inspectingSpecies.feedingHabit} • {inspectingSpecies.habitat}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Physiological Operating Boundaries
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block">Optimal Temp</span>
                  <strong className="text-blue-600 font-black">
                    {inspectingSpecies.parameters.temp.optimal[0]} - {inspectingSpecies.parameters.temp.optimal[1]} °C
                  </strong>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    Critical: &lt;{inspectingSpecies.parameters.temp.criticalLow}°C or &gt;{inspectingSpecies.parameters.temp.criticalHigh}°C
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block">Optimal pH</span>
                  <strong className="text-emerald-600 font-black">
                    {inspectingSpecies.parameters.ph.optimal[0]} - {inspectingSpecies.parameters.ph.optimal[1]}
                  </strong>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    Lethal: &lt;{inspectingSpecies.parameters.ph.criticalLow} or &gt;{inspectingSpecies.parameters.ph.criticalHigh}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block">Dissolved Oxygen</span>
                  <strong className="text-teal-600 font-black">
                    &gt;= {inspectingSpecies.parameters.oxygen.optimal[0]} mg/L
                  </strong>
                  <span className="text-[8px] text-red-500 block mt-0.5">
                    Lethal Hypoxia: &lt;{inspectingSpecies.parameters.oxygen.criticalLow} mg/L
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block">Max TAN (Ammonia)</span>
                  <strong className="text-amber-600 font-black">
                    &lt;= {inspectingSpecies.parameters.ammonia.optimal[1]} mg/L
                  </strong>
                  <span className="text-[8px] text-slate-400 block mt-0.5">
                    Toxicity: &gt;{inspectingSpecies.parameters.ammonia.criticalHigh} mg/L
                  </span>
                </div>
              </div>

              <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100 text-[10px] space-y-1">
                <div className="font-extrabold text-blue-900">
                  Citation: {inspectingSpecies.parameters.temp.sourceTitle}
                </div>
                <div className="text-slate-600 text-[9px]">
                  Common health risks: {inspectingSpecies.commonDiseases.join(', ')}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                toggleSpecies(inspectingSpecies.id);
                setInspectingSpecies(null);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              {selectedSpeciesIds.includes(inspectingSpecies.id) ? 'Remove from Farm' : 'Cultivate in Farm'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
