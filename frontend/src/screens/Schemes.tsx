import React, { useState } from 'react';
import { 
  Landmark, 
  HandCoins, 
  GraduationCap, 
  Building2, 
  Search, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  Globe
} from 'lucide-react';
import { useTheme, useLanguage } from '../App';

interface GovScheme {
  id: string;
  title: string;
  ministry: string;
  category: 'SUBSIDY' | 'LOAN' | 'TRAINING' | 'INFRASTRUCTURE';
  icon: React.ReactNode;
  benefit: string;
  eligibility: string;
  description: string;
  portalLink: string;
  guidelineLink: string;
  mySchemeLink?: string;
  portalDomain: string;
}

const GOV_SCHEMES: GovScheme[] = [
  {
    id: 'pmmsy',
    title: 'Pradhan Mantri Matsya Sampada Yojana (PMMSY)',
    ministry: 'Department of Fisheries, MoFAHD, Govt. of India',
    category: 'SUBSIDY',
    icon: <Landmark />,
    benefit: '40% (General) to 60% (SC/ST/Women) Financial Assistance',
    eligibility: 'Fishers, Fish Farmers, Self Help Groups, Co-operatives',
    description: 'Flagship national scheme aimed at driving the Blue Revolution with sustainable production, modern technology infusion, and post-harvest infrastructure.',
    portalLink: 'https://pmmsy.dof.gov.in/',
    guidelineLink: 'https://dof.gov.in/pmmsy',
    mySchemeLink: 'https://www.myscheme.gov.in/schemes/pmmsy',
    portalDomain: 'pmmsy.dof.gov.in'
  },
  {
    id: 'kcc',
    title: 'Kisan Credit Card (KCC) for Fisheries & Aquaculture',
    ministry: 'Ministry of Fisheries, Animal Husbandry & Dairying / RBI',
    category: 'LOAN',
    icon: <HandCoins />,
    benefit: 'Working Capital up to ₹2 Lakhs @ 7% (effective 4% with prompt repayment)',
    eligibility: 'Individual Fish Farmers, Joint Liability Groups, SHGs, Fishers',
    description: 'Provides institutional short-term credit support for feeding, seed purchase, pond maintenance, electricity, and working operational expenses.',
    portalLink: 'https://www.myscheme.gov.in/schemes/kcc-ahf',
    guidelineLink: 'https://dahd.nic.in/kisan-credit-card-kcc',
    portalDomain: 'myscheme.gov.in'
  },
  {
    id: 'fidf',
    title: 'Fisheries and Aquaculture Infrastructure Development Fund (FIDF)',
    ministry: 'Department of Fisheries / NABARD / NCDC',
    category: 'INFRASTRUCTURE',
    icon: <Building2 />,
    benefit: 'Concessional finance with up to 3% interest subvention per annum',
    eligibility: 'Entrepreneurs, State Govt entities, Cooperatives, Private Companies',
    description: 'Dedicated infrastructure financing for establishing cold chains, hatcheries, modern fish feed mills, disease testing laboratories, and landing centers.',
    portalLink: 'https://dof.gov.in/fidf',
    guidelineLink: 'https://www.myscheme.gov.in/schemes/fidf',
    portalDomain: 'dof.gov.in'
  },
  {
    id: 'css-dof',
    title: 'Centrally Sponsored Schemes for Fisheries Sector',
    ministry: 'Department of Fisheries, Ministry of FAHD, Govt. of India',
    category: 'SUBSIDY',
    icon: <Globe />,
    benefit: 'Targeted capital assistance for pond construction & raceways',
    eligibility: 'Small and marginal farmers, progressive fish culturists',
    description: 'Central sector schemes supporting freshwater aquaculture expansion, brackishwater development, and inland capture fisheries enhancement.',
    portalLink: 'https://dof.gov.in/schemes',
    guidelineLink: 'https://dof.gov.in/central-sector-schemes',
    portalDomain: 'dof.gov.in'
  },
  {
    id: 'training-cifa',
    title: 'NFDB & ICAR-CIFA Aquaculture Training and Technology Transfer',
    ministry: 'National Fisheries Development Board / ICAR-CIFA',
    category: 'TRAINING',
    icon: <GraduationCap />,
    benefit: 'Subsidized certification in Biofloc, RAS, Composite Carp culture & Pathology',
    eligibility: 'Fish farmers, rural youth, women entrepreneurs, startups',
    description: 'Capacity-building, hands-on pond management training, and technology transfers conducted across regional national fisheries stations.',
    portalLink: 'https://nfdb.gov.in/',
    guidelineLink: 'https://cifa.nic.in/',
    portalDomain: 'nfdb.gov.in'
  }
];

const Schemes: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['ALL', 'SUBSIDY', 'LOAN', 'TRAINING', 'INFRASTRUCTURE'];

  const filteredSchemes = GOV_SCHEMES.filter(s => {
    const matchesTab = activeTab === 'ALL' || s.category === activeTab;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.benefit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SUBSIDY': return 'text-emerald-500 bg-emerald-500/10';
      case 'LOAN': return 'text-blue-500 bg-blue-500/10';
      case 'TRAINING': return 'text-purple-500 bg-purple-500/10';
      case 'INFRASTRUCTURE': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className={`pb-32 transition-colors duration-500 min-h-screen ${theme === 'dark' ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      <div className={`p-8 pt-16 space-y-6 ${theme === 'dark' ? 'bg-slate-900 border-b border-white/5' : 'bg-white border-b border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={13} />
              <span>Official Government Directory</span>
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Government Schemes & Policies
            </h2>
            <p className="text-slate-400 text-sm font-medium">Verified .gov.in portals for subsidies, credit, and infrastructure</p>
          </div>
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
            <Landmark size={30} />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search schemes, e.g. 'PMMSY', 'subsidy', 'credit'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-4 pl-12 pr-6 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'
            }`}
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeTab === cat 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 space-y-6">
        {filteredSchemes.length > 0 ? (
          filteredSchemes.map((scheme) => (
            <div 
              key={scheme.id}
              className={`rounded-[2.5rem] border overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                theme === 'dark' ? 'bg-slate-900 border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${getCategoryColor(scheme.category)}`}>
                    {React.cloneElement(scheme.icon as React.ReactElement<any>, { size: 24 })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">
                      <ShieldCheck size={11} />
                      <span>{scheme.portalDomain}</span>
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getCategoryColor(scheme.category)}`}>
                      {scheme.category}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className={`text-lg font-black leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    {scheme.title}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    {scheme.ministry}
                  </p>
                  <p className={`text-[12px] leading-relaxed pt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {scheme.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-emerald-50/40 border-emerald-100/60'}`}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mb-1">Key Financial Benefit</p>
                    <p className={`text-[11px] font-bold leading-snug ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{scheme.benefit}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-blue-50/40 border-blue-100/60'}`}>
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 mb-1">Target Beneficiaries</p>
                    <p className={`text-[11px] font-bold leading-snug ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{scheme.eligibility}</p>
                  </div>
                </div>

                {/* Direct Government Links */}
                <div className="pt-2 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a 
                      href={scheme.portalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <Globe size={14} />
                      <span>Official National Portal</span>
                      <ExternalLink size={13} />
                    </a>

                    <a 
                      href={scheme.guidelineLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-3.5 px-4 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center space-x-2 border active:scale-95 transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-800 border-white/10 text-slate-200 hover:bg-slate-700' 
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FileText size={14} />
                      <span>Guidelines & Subsidies</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {scheme.mySchemeLink && (
                    <a 
                      href={scheme.mySchemeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                        theme === 'dark' ? 'text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <span>Check Single-Window Eligibility on MyScheme.gov.in</span>
                      <ArrowRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
              <Search size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No schemes found matching your search</p>
          </div>
        )}

        {/* Informational Banner */}
        <div className={`p-8 rounded-[3rem] relative overflow-hidden text-white shadow-2xl ${
          theme === 'dark' ? 'bg-gradient-to-br from-indigo-900 to-slate-900' : 'bg-gradient-to-br from-emerald-600 to-teal-700'
        }`}>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-2 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
              <CheckCircle2 size={12} className="text-white" />
              <span className="text-[9px] font-black uppercase tracking-widest">Official Government Portals</span>
            </div>
            <h3 className="text-xl font-black leading-tight">Need help applying for fisheries subsidies?</h3>
            <p className="text-xs text-white/70 font-medium">All applications must be submitted directly through official Department of Fisheries (dof.gov.in) or National MyScheme portals. FinGuard provides verified direct links to prevent phishing and unauthorized intermediary fees.</p>
            <div className="pt-2">
              <a 
                href="https://pmmsy.dof.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-white text-emerald-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all items-center space-x-2 font-sans font-bold"
              >
                <span>Access PMMSY National Window</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
          <Info className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Schemes;
