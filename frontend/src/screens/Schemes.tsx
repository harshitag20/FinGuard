import React, { useState, useMemo } from 'react';
import { 
  Landmark, HandCoins, GraduationCap, Building2, Search, 
  ExternalLink, Sparkles, CheckCircle2, Info, ArrowRight, 
  ShieldCheck, FileText, Globe, Share2, Copy, Filter, X
} from 'lucide-react';
import { useTheme, useLanguage, useUser, usePond } from '../App';
import { I18N } from '../i18n/translations';
import SchemeCard, { SchemeItem } from '../components/common/SchemeCard';
import SectionHeader from '../components/common/SectionHeader';
import BottomSheet from '../components/common/BottomSheet';

const SCHEMES_DATA: SchemeItem[] = [
  {
    id: 'pmmsy',
    simpleTitleEn: 'Fish Farming Support & Pond Subsidy (PMMSY)',
    simpleTitleHi: 'मछली पालन सब्सिडी योजना (PMMSY)',
    officialTitle: 'Pradhan Mantri Matsya Sampada Yojana (PMMSY)',
    benefitEn: 'Get 40% of project cost paid by government (60% for SC/ST/Women)',
    benefitHi: 'सरकार द्वारा 40% से 60% तक की आर्थिक मदद (सब्सिडी)',
    eligibilityChips: ['Fish Farmers', 'Self-Help Groups', 'Co-operatives', 'Women Farmers'],
    tag: 'SUBSIDY',
    portalLink: 'https://pmmsy.dof.gov.in/',
    domain: 'pmmsy.dof.gov.in'
  },
  {
    id: 'kcc',
    simpleTitleEn: 'Low-Interest Fish Farming Loan (KCC)',
    simpleTitleHi: 'सस्ता किसान क्रेडिट कार्ड लोन (KCC)',
    officialTitle: 'Kisan Credit Card for Fisheries & Aquaculture',
    benefitEn: 'Working capital loan up to ₹2 Lakhs at effective 4% interest rate',
    benefitHi: 'चारा और दैनिक खर्च के लिए ₹2 लाख तक का सस्ता लोन मात्र 4% ब्याज पर',
    eligibilityChips: ['Individual Farmers', 'Joint Liability Groups', 'SHGs'],
    tag: 'LOAN',
    portalLink: 'https://www.myscheme.gov.in/schemes/kcc-ahf',
    domain: 'myscheme.gov.in'
  },
  {
    id: 'fidf',
    simpleTitleEn: 'Equipment, Aerator & Hatchery Fund (FIDF)',
    simpleTitleHi: 'उपकरण, एरेटर व हैचरी फंड (FIDF)',
    officialTitle: 'Fisheries and Aquaculture Infrastructure Development Fund',
    benefitEn: 'Concessional finance with 3% interest discount for aerators, hatcheries & feed mills',
    benefitHi: 'एरेटर मशीन, फीड मिल और हैचरी निर्माण के लिए 3% ब्याज छूट पर बड़ा लोन',
    eligibilityChips: ['Fish Farmers', 'Entrepreneurs', 'Cooperatives'],
    tag: 'EQUIPMENT',
    portalLink: 'https://dof.gov.in/fidf',
    domain: 'dof.gov.in'
  },
  {
    id: 'css-dof',
    simpleTitleEn: 'New Pond Construction & Digging Grant',
    simpleTitleHi: 'नया तालाब निर्माण व खुदाई अनुदान सहायता',
    officialTitle: 'Centrally Sponsored Inland Fisheries Scheme',
    benefitEn: 'Targeted capital assistance for digging new freshwater ponds and biofloc units',
    benefitHi: 'नया मीठे पानी का तालाब खोदने और बायोफ्लॉक यूनिट लगाने के लिए सरकारी अनुदान',
    eligibilityChips: ['Small & Marginal Farmers', 'Inland Culturists'],
    tag: 'SUBSIDY',
    portalLink: 'https://dof.gov.in/schemes',
    domain: 'dof.gov.in'
  },
  {
    id: 'training-cifa',
    simpleTitleEn: 'Free Scientist Training & Techniques (CIFA)',
    simpleTitleHi: 'मुफ्त वैज्ञानिक प्रशिक्षण व तकनीक (CIFA)',
    officialTitle: 'NFDB & ICAR-CIFA Technology Transfer Program',
    benefitEn: 'Certified hands-on training in carp breeding, water testing & disease control',
    benefitHi: 'मछली पालन, जल परीक्षण और रोग रोकथाम पर वैज्ञानिकों द्वारा मुफ्त सरकारी प्रमाण पत्र प्रशिक्षण',
    eligibilityChips: ['Fish Farmers', 'Rural Youth', 'Women Entrepreneurs'],
    tag: 'TRAINING',
    portalLink: 'https://cifa.nic.in/',
    domain: 'cifa.nic.in'
  }
];

const Schemes: React.FC = () => {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const { user } = useUser();
  const { pond } = usePond();
  const strings = I18N[lang as 'en' | 'hi'] || I18N.en;

  // Search & category filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  // "Am I eligible?" quick helper state
  const [showEligibilityHelper, setShowEligibilityHelper] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'shg' | 'coop' | 'woman'>('farmer');
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'sc' | 'st' | 'obc'>('general');
  const [selectedNeed, setSelectedNeed] = useState<'money' | 'loan' | 'training' | 'equipment'>('money');
  const [hasFiltered, setHasFiltered] = useState(false);

  // Application checklist bottom sheet state
  const [activeChecklistScheme, setActiveChecklistScheme] = useState<SchemeItem | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Filter schemes based on category, search query, and eligibility helper answers
  const filteredSchemes = useMemo(() => {
    return SCHEMES_DATA.map(scheme => {
      let isBest = false;
      if (hasFiltered) {
        if (selectedNeed === 'money' && scheme.tag === 'SUBSIDY') isBest = true;
        if (selectedNeed === 'loan' && scheme.tag === 'LOAN') isBest = true;
        if (selectedNeed === 'training' && scheme.tag === 'TRAINING') isBest = true;
        if (selectedNeed === 'equipment' && scheme.tag === 'EQUIPMENT') isBest = true;
      }
      return {
        ...scheme,
        isBestMatch: isBest
      };
    }).filter(scheme => {
      // Category filter
      if (selectedTag !== 'ALL' && scheme.tag !== selectedTag) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEn = scheme.simpleTitleEn.toLowerCase().includes(q) || scheme.benefitEn.toLowerCase().includes(q);
        const matchesHi = scheme.simpleTitleHi.toLowerCase().includes(q) || scheme.benefitHi.toLowerCase().includes(q);
        const matchesOfficial = scheme.officialTitle.toLowerCase().includes(q);
        return matchesEn || matchesHi || matchesOfficial;
      }

      return true;
    }).sort((a, b) => {
      if (a.isBestMatch && !b.isBestMatch) return -1;
      if (!a.isBestMatch && b.isBestMatch) return 1;
      return 0;
    });
  }, [selectedTag, searchQuery, hasFiltered, selectedNeed]);

  const handleApplyNow = (scheme: SchemeItem) => {
    setActiveChecklistScheme(scheme);
  };

  const handleViewDocuments = (scheme: SchemeItem) => {
    setActiveChecklistScheme(scheme);
  };

  const handleShareWhatsApp = () => {
    if (!activeChecklistScheme) return;
    const title = lang === 'hi' ? activeChecklistScheme.simpleTitleHi : activeChecklistScheme.simpleTitleEn;
    const farm = user?.farmName || pond.name;
    const text = `🐟 *${title} - Checklist*\n\n` +
      `Documents required to apply for ${farm}:\n` +
      `1. Aadhaar Card (Identity proof)\n` +
      `2. Bank Passbook copy (linked with Aadhaar)\n` +
      `3. Land ownership record or 5-year lease\n` +
      `4. Pond photos & Project Estimate\n\n` +
      `Official Portal: ${activeChecklistScheme.portalLink}`;

    navigator.clipboard?.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className={`p-4 pb-32 space-y-4 max-w-lg mx-auto transition-colors duration-300 ${
      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
    }`}>
      
      {/* 1. Header: Plain Language Title & Subtitle */}
      <header className="pt-2">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {strings.schemes_title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          {strings.schemes_sub}
        </p>
      </header>

      {/* 2. "Am I eligible?" Quick Helper (3-question mini-flow) */}
      {showEligibilityHelper && (
        <section className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-slate-900 dark:to-blue-950/40 rounded-3xl p-4 border border-blue-200/80 dark:border-blue-900/50 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {strings.eligibility_helper_title}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {strings.eligibility_helper_sub}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEligibilityHelper(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close Helper"
            >
              <X size={16} />
            </button>
          </div>

          {/* Question 1: What do you do? */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              {strings.q1_role}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'farmer', label: strings.role_farmer },
                { id: 'shg', label: strings.role_shg },
                { id: 'coop', label: strings.role_coop },
                { id: 'woman', label: strings.role_woman }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedRole(item.id as any)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-center transition-all ${
                    selectedRole === item.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Social Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              {strings.q2_category}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'general', label: strings.cat_general },
                { id: 'sc', label: strings.cat_sc },
                { id: 'st', label: strings.cat_st },
                { id: 'obc', label: strings.cat_obc }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCategory(item.id as any)}
                  className={`min-h-[44px] px-2 py-1.5 rounded-xl text-[11px] font-bold text-center transition-all truncate ${
                    selectedCategory === item.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {item.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: What do you need most? */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              {strings.q3_need}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'money', label: strings.need_money },
                { id: 'loan', label: strings.need_loan },
                { id: 'training', label: strings.need_training },
                { id: 'equipment', label: strings.need_equipment }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedNeed(item.id as any)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-center transition-all leading-tight ${
                    selectedNeed === item.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons: Find Matches vs Skip */}
          <div className="pt-2 border-t border-blue-200/60 dark:border-white/5 space-y-2">
            <button
              type="button"
              onClick={() => setHasFiltered(true)}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <span>{strings.btn_find_matches}</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setHasFiltered(false);
                setSelectedTag('ALL');
              }}
              className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline text-center"
            >
              {strings.btn_skip_filter}
            </button>
          </div>
        </section>
      )}

      {/* 3. Search Bar in Plain Words */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={strings.search_schemes_placeholder}
          className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 4. Horizontally Scrollable Category Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: strings.tag_all },
          { id: 'SUBSIDY', label: strings.tag_subsidy },
          { id: 'LOAN', label: strings.tag_loan },
          { id: 'TRAINING', label: strings.tag_training },
          { id: 'EQUIPMENT', label: strings.tag_equipment }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedTag(cat.id)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
              selectedTag === cat.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 5. Simplified Scheme Cards List */}
      <section className="space-y-3">
        <SectionHeader 
          title={lang === 'hi' ? 'उपलब्ध योजनाएं' : 'Available Support Schemes'} 
          subtitle={`${filteredSchemes.length} matching programs`}
        />

        <div className="space-y-3">
          {filteredSchemes.map(scheme => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              onApplyNow={handleApplyNow}
              onViewDocuments={handleViewDocuments}
            />
          ))}
        </div>
      </section>

      {/* 6. "Apply Now" & Documents Checklist Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(activeChecklistScheme)}
        onClose={() => setActiveChecklistScheme(null)}
        title={strings.checklist_title}
        subtitle={activeChecklistScheme ? (lang === 'hi' ? activeChecklistScheme.simpleTitleHi : activeChecklistScheme.simpleTitleEn) : undefined}
      >
        {activeChecklistScheme && (
          <div className="space-y-4 text-xs">
            {/* Plain checklist subtitle */}
            <p className="text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
              {strings.checklist_sub}
            </p>

            {/* Checklist items */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              {[
                strings.doc_aadhaar,
                strings.doc_bank,
                strings.doc_land,
                strings.doc_photos,
                strings.doc_caste
              ].map((doc, idx) => (
                <div key={idx} className="flex items-start space-x-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                    {doc}
                  </span>
                </div>
              ))}
            </div>

            {/* Farm Profile Auto-Fill Note */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] font-semibold text-blue-900 dark:text-blue-200">
              {strings.autofill_note}
            </div>

            {/* Action Buttons: WhatsApp Share & Go to Official Website */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-[0.98]"
              >
                <Share2 size={16} />
                <span>{copiedMessage ? strings.copied_whatsapp : strings.btn_save_whatsapp}</span>
              </button>

              <a
                href={activeChecklistScheme.portalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-[0.98]"
              >
                <span>{strings.btn_go_to_portal}</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )}
      </BottomSheet>

    </div>
  );
};

export default Schemes;
